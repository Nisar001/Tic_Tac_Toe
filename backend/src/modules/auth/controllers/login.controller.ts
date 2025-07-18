import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { LivesManager } from '../../../utils/energy.utils';
import { config } from '../../../config';
import User from '../../../models/user.model';
import { logError, logInfo, logWarn } from '../../../utils/logger';

// Production-ready rate limiting for login
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in prod, 20 in dev
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  try {
    const { email, password, rememberMe } = req.body;

    // Enhanced input validation
    if (!email || !password) {
      logWarn(`Login attempt with missing credentials from IP: ${clientIP}`);
      throw createError.badRequest('Email and password are required');
    }

    // Type validation
    if (typeof email !== 'string' || typeof password !== 'string') {
      logWarn(`Login attempt with invalid types from IP: ${clientIP}`);
      throw createError.badRequest('Invalid email or password format');
    }

    // Email format validation
    if (!AuthUtils.isValidEmail(email)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // Enhanced user lookup with account status checks
    const user = await User.findOne({ 
      email: normalizedEmail 
    }).select('+password +refreshTokens +failedLoginAttempts +lastFailedLogin +isLocked +lockedUntil');

    if (!user) {
      logWarn(`Login attempt with non-existent email: ${normalizedEmail} from IP: ${clientIP}`);
      // Use generic message to prevent email enumeration
      throw createError.unauthorized('Invalid email or password');
    }

    // Check if account is deleted or blocked
    if (user.isDeleted) {
      logWarn(`Login attempt on deleted account: ${normalizedEmail} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated. Please contact support.');
    }

    if (user.isBlocked) {
      logWarn(`Login attempt on blocked account: ${normalizedEmail} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked. Please contact support.');
    }

    // Check if account is locked due to failed attempts
    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (1000 * 60));
      logWarn(`Login attempt on locked account: ${normalizedEmail} from IP: ${clientIP}`);
      throw createError.forbidden(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    // Clear lock if expired
    if (user.isLocked && user.lockedUntil && user.lockedUntil <= new Date()) {
      user.isLocked = false;
      user.lockedUntil = undefined;
      user.failedLoginAttempts = 0;
    }

    // Password validation
    if (!user.password) {
      logError(`User without password attempted login: ${normalizedEmail}`);
      throw createError.unauthorized('Password not set for this user. Please reset your password.');
    }

    // Enhanced password verification
    let isPasswordValid = false;
    try {
      isPasswordValid = await AuthUtils.comparePassword(password, user.password);
    } catch (compareError) {
      logError(`Password comparison error for user ${normalizedEmail}: ${compareError}`);
      throw createError.internal('Authentication service error. Please try again.');
    }

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      user.lastFailedLogin = new Date();

      // Lock account after too many failed attempts
      const maxAttempts = config.SECURITY.MAX_LOGIN_ATTEMPTS || 5;
      if (user.failedLoginAttempts >= maxAttempts) {
        user.isLocked = true;
        user.lockedUntil = new Date(Date.now() + (config.SECURITY.LOCK_TIME || 3600) * 1000);
        logWarn(`Account locked due to too many failed attempts: ${normalizedEmail} from IP: ${clientIP}`);
      }

      await user.save();
      logWarn(`Failed login attempt ${user.failedLoginAttempts} for: ${normalizedEmail} from IP: ${clientIP}`);
      throw createError.unauthorized('Invalid email or password');
    }

    // Check email verification if required
    if (config.FEATURES.EMAIL_VERIFICATION_REQUIRED && !user.isEmailVerified) {
      logInfo(`Login attempt with unverified email: ${normalizedEmail} from IP: ${clientIP}`);
      throw createError.unauthorized('Please verify your email before logging in');
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lastFailedLogin = undefined;
    }

    // Calculate lives status
    let livesStatus;
    try {
      livesStatus = LivesManager.calculateCurrentLives(
        user.lives ?? 0,
        user.lastLivesUpdate ?? user.livesUpdatedAt,
        user.lastLivesRegenTime ?? user.livesUpdatedAt
      );
    } catch (livesError) {
      logError(`Lives calculation error for user ${user._id}: ${livesError}`);
      // Use default lives status if calculation fails
      livesStatus = {
        currentLives: user.lives || 15,
        maxLives: config.LIVES_CONFIG.MAX_LIVES,
        nextRegenTime: null,
        timeUntilNextRegen: 0,
        canPlay: true
      };
    }

    // Update login metadata
    user.lastLogin = new Date();
    user.lastLoginIP = clientIP;
    user.lastLoginMethod = 'email';
    user.isOnline = true;
    user.lastSeen = new Date();

    // Update lives if regenerated
    if (livesStatus.currentLives !== user.lives) {
      user.lives = livesStatus.currentLives;
      user.lastLivesUpdate = new Date();
      user.lastLivesRegenTime = new Date();
    }

    // Generate tokens with enhanced options
    let accessToken: string, refreshToken: string;
    try {
      const tokenPair = AuthUtils.generateTokenPair(user._id.toString(), user.email);
      accessToken = tokenPair.accessToken;
      refreshToken = tokenPair.refreshToken;
    } catch (tokenError) {
      logError(`Token generation error for user ${user._id}: ${tokenError}`);
      throw createError.internal('Authentication service error. Please try again.');
    }

    // Clean up old refresh tokens (keep only last 5)
    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = [];
    }

    // Remove expired tokens
    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter(tokenObj => 
      tokenObj.expiresAt > now
    );

    // Add new refresh token
    const refreshTokenExpiry = rememberMe 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days if "remember me"
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days default

    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: refreshTokenExpiry
    });

    // Keep only the 5 most recent refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
    }

    // Save user updates
    try {
      await user.save();
    } catch (saveError) {
      logError(`Failed to save user login data for ${user._id}: ${saveError}`);
      // Don't fail login if save fails, just log it
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Successful login for ${user.username} (${normalizedEmail}) in ${duration}ms from IP: ${clientIP}`);

    // Enhanced response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          id: user._id,
          username: user.username,
          email: user.email,
          level: user.level,
          totalXP: user.totalXP,
          lives: user.lives,
          maxLives: livesStatus.maxLives,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          gameStats: user.stats ?? {
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0,
            winRate: 0
          },
          lastLogin: user.lastLogin,
          isOnline: user.isOnline
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.JWT_EXPIRES_IN,
          refreshExpiresIn: rememberMe ? '30d' : '7d'
        },
        // Legacy support - remove in future versions
        token: accessToken,
        refreshToken: refreshToken,
        livesStatus,
        sessionInfo: {
          loginTime: new Date(),
          rememberMe: !!rememberMe,
          clientIP: clientIP,
          userAgent: userAgent
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Login failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

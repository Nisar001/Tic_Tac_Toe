import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../../middlewares/error.middleware';
import { AuthUtils } from '../../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../../utils/logger';
import { EnergyManager } from '../../../../utils/energy.utils';
import User from '../../../../models/user.model';

// Enhanced rate limiting for Google authentication
export const socialAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 8 : 15, // 8 in prod, 15 in dev
  message: {
    success: false,
    message: 'Too many social authentication attempts. Please try again later.',
    code: 'SOCIAL_AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

interface SocialAuthUser {
  _id: string;
  email: string;
  username: string;
  provider: string;
  providerId: string;
  avatar?: string;
  isEmailVerified: boolean;
  level: number;
  totalXP: number;
  energy: number;
  lastEnergyUpdate?: Date;
  refreshTokens?: any[];
  isDeleted?: boolean;
  isBlocked?: boolean;
}

export const googleLogin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced input validation
    if (!req.user && !req.query.code) {
      logWarn(`Google login attempted without proper authentication flow from IP: ${clientIP}`);
      throw createError.badRequest('Invalid authentication request');
    }

    // Use passport authenticate with proper error handling
    passport.authenticate('google', async (
      err: Error | null,
      user: SocialAuthUser | false,
      info: { message?: string }
    ) => {
      try {
        // Enhanced error handling
        if (err) {
          logError(`Google authentication service error from IP ${clientIP}: ${err.message}`);
          throw createError.serviceUnavailable('Authentication service temporarily unavailable');
        }

        if (!user) {
          logWarn(`Google authentication failed from IP ${clientIP}: ${info?.message || 'Unknown reason'}`);
          throw createError.unauthorized('Google authentication failed');
        }

        // Enhanced user validation
        if (!user._id || !user.email || !user.provider) {
          logError(`Invalid user object from Google authentication from IP ${clientIP}: userId=${user._id}, email=${user.email}, provider=${user.provider}`);
          throw createError.internal('Authentication data is incomplete');
        }

        // Find and validate user
        const userDoc = await User.findById(user._id).select('+refreshTokens');
        if (!userDoc) {
          logError(`User not found after Google authentication: ${user._id} from IP: ${clientIP}`);
          throw createError.notFound('User account not found');
        }

        // Enhanced account status checks
        if (userDoc.isDeleted) {
          logInfo(`Google login attempt on deleted account: ${userDoc.email} from IP: ${clientIP}`);
          throw createError.unauthorized('Account has been deactivated');
        }

        if (userDoc.isBlocked) {
          logInfo(`Google login attempt on blocked account: ${userDoc.email} from IP: ${clientIP}`);
          throw createError.unauthorized('Account has been blocked');
        }

        // Generate tokens with enhanced error handling
        let accessToken: string;
        let refreshToken: string;

        try {
          accessToken = AuthUtils.generateAccessToken({
            userId: user._id,
            email: user.email
          });

          refreshToken = AuthUtils.generateRefreshToken({
            userId: user._id
          });
        } catch (tokenError) {
          logError(`Token generation failed for Google login user ${user._id}: ${tokenError}`);
          throw createError.internal('Token generation failed');
        }

        // Calculate current energy
        const energyStatus = EnergyManager.calculateCurrentEnergy(
          userDoc.energy || 0,
          userDoc.lastEnergyUpdate || new Date(0)
        );

        // Update user with enhanced data
        userDoc.lastSeen = new Date();
        userDoc.isOnline = true;
        userDoc.lastLoginMethod = 'google';
        userDoc.lastLoginIP = clientIP;
        userDoc.energy = energyStatus.currentEnergy;
        userDoc.lastEnergyUpdate = new Date();

        // Add refresh token
        if (!Array.isArray(userDoc.refreshTokens)) {
          userDoc.refreshTokens = [];
        }

        userDoc.refreshTokens.push({
          token: refreshToken,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Keep only the 5 most recent refresh tokens
        if (userDoc.refreshTokens.length > 5) {
          userDoc.refreshTokens = userDoc.refreshTokens
            .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);
        }

        try {
          await userDoc.save({ validateBeforeSave: false });
        } catch (saveError) {
          logError(`Failed to save Google login data for user ${user._id}: ${saveError}`);
          // Don't fail the login if save fails, just log it
        }

        // Enhanced response data
        const sanitizedUser = {
          _id: userDoc._id,
          id: userDoc._id,
          email: userDoc.email,
          username: userDoc.username,
          avatar: userDoc.avatar,
          level: userDoc.level || 1,
          totalXP: userDoc.totalXP || 0,
          energy: energyStatus.currentEnergy,
          maxEnergy: energyStatus.maxEnergy,
          provider: user.provider,
          isEmailVerified: userDoc.isEmailVerified
        };

        // Performance logging
        const duration = Date.now() - startTime;
        logInfo(`Google login successful for user: ${userDoc.username} in ${duration}ms from IP: ${clientIP}`);

        // Enhanced response
        res.status(200).json({
          success: true,
          message: 'Google login successful',
          data: {
            user: sanitizedUser,
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: process.env.JWT_EXPIRES_IN || '7d'
            },
            energyStatus,
            loginMethod: 'google'
          }
        });

      } catch (authError) {
        const duration = Date.now() - startTime;
        logError(`Google authentication processing failed in ${duration}ms from IP ${clientIP}: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
        throw authError;
      }
    })(req, res, next);

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Google login failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

export const googleCallback = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    passport.authenticate('google', {
      failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login?error=google_auth_failed`,
      session: false
    })(req, res, async () => {
      try {
        if (!req.user) {
          logWarn(`Google callback: No user found after authentication from IP: ${clientIP}`);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/auth/login?error=authentication_failed`);
        }

        const user = req.user as unknown as SocialAuthUser;

        // Enhanced user validation
        if (!user._id || !user.email) {
          logError(`Google callback: Invalid user data from IP: ${clientIP}`);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/auth/login?error=invalid_user_data`);
        }

        // Generate tokens with error handling
        let accessToken: string;
        let refreshToken: string;

        try {
          accessToken = AuthUtils.generateAccessToken({
            userId: user._id,
            email: user.email
          });

          refreshToken = AuthUtils.generateRefreshToken({
            userId: user._id
          });
        } catch (tokenError) {
          logError(`Token generation failed in Google callback for user ${user._id}: ${tokenError}`);
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          return res.redirect(`${frontendUrl}/auth/login?error=token_generation_failed`);
        }

        // Update user data
        try {
          await User.findByIdAndUpdate(user._id, {
            $push: {
              refreshTokens: {
                token: refreshToken,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }
            },
            lastLogin: new Date(),
            lastLoginMethod: 'google',
            lastLoginIP: clientIP,
            isOnline: true
          });
        } catch (updateError) {
          logError(`Failed to update user data in Google callback for user ${user._id}: ${updateError}`);
          // Don't fail the callback if update fails, just log it
        }

        // Performance logging
        const duration = Date.now() - startTime;
        logInfo(`Google callback successful for user: ${user._id} in ${duration}ms from IP: ${clientIP}`);

        // Enhanced redirect with proper URL encoding
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
        redirectUrl.searchParams.set('provider', 'google');
        redirectUrl.searchParams.set('token', accessToken);
        redirectUrl.searchParams.set('refreshToken', refreshToken);
        redirectUrl.searchParams.set('success', 'true');

        return res.redirect(redirectUrl.toString());

      } catch (callbackError) {
        const duration = Date.now() - startTime;
        logError(`Google callback processing failed in ${duration}ms from IP ${clientIP}: ${callbackError instanceof Error ? callbackError.message : 'Unknown error'}`);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/auth/login?error=callback_processing_failed`);
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Google callback failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/auth/login?error=internal_error`);
  }
});

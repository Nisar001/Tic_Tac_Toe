import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth.utils';
import User from '../models/user.model';
import { IUser } from '../models/user.model';
import { JWTPayload } from '../types';
import { logError, logDebug } from '../utils/logger';
import { config } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  token?: string;
  requestId?: string;
}

const authAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const MAX_AUTH_ATTEMPTS = 10;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestId = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  req.requestId = requestId;

  try {
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    if (isRateLimited(clientIP)) {
      logError(`Authentication rate limit exceeded for IP: ${clientIP}`);
      res.status(429).json({ success: false, message: 'Too many authentication attempts. Please try again later.', retryAfter: 15 * 60 });
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
      recordAuthAttempt(clientIP, false);
      res.status(401).json({ success: false, message: 'Authorization header required' });
      return;
    }

    const token = AuthUtils.extractTokenFromHeader(authHeader);
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 1000) {
      recordAuthAttempt(clientIP, false);
      logError(`Invalid token format from IP: ${clientIP}`);
      res.status(401).json({ success: false, message: 'Invalid token format' });
      return;
    }

    let decoded: JWTPayload;
    try {
      decoded = AuthUtils.verifyAccessToken(token);
    } catch (tokenError) {
      recordAuthAttempt(clientIP, false);
      logError(`Token verification failed for request ${requestId}: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
      res.status(401).json({ success: false, message: 'Invalid or expired token' });
      return;
    }

    if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') {
      recordAuthAttempt(clientIP, false);
      logError(`Invalid token payload for request ${requestId}`);
      res.status(401).json({ success: false, message: 'Invalid token payload' });
      return;
    }

    let user: IUser | null;
    try {
      user = await User.findById(decoded.userId).select('-password') as IUser;
    } catch (dbError) {
      recordAuthAttempt(clientIP, false);
      logError(`Database error during authentication for request ${requestId}: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      res.status(500).json({ success: false, message: 'Authentication service temporarily unavailable' });
      return;
    }

    if (!user) {
      recordAuthAttempt(clientIP, false);
      logError(`User not found for token in request ${requestId}: ${decoded.userId}`);
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    // Only check email verification if it's required in config
    if (config.FEATURES.EMAIL_VERIFICATION_REQUIRED && !user.isEmailVerified) {
      recordAuthAttempt(clientIP, false);
      logDebug(`Email not verified for user ${user._id} in request ${requestId}`);
      res.status(401).json({ success: false, message: 'Email not verified', requiresVerification: true });
      return;
    }

    if (!user.isOnline && user.lastSeen) {
      const daysSinceLastSeen = (Date.now() - user.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSeen > 90) {
        logError(`Inactive account accessed for user ${user._id} in request ${requestId}`);
        res.status(401).json({ success: false, message: 'Account has been inactive. Please contact support.' });
        return;
      }
    }

    recordAuthAttempt(clientIP, true);
    req.user = user;
    req.token = token;
    logDebug(`Authentication successful for user ${user._id} in request ${requestId}`);
    next();
  } catch (error) {
    const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
    recordAuthAttempt(clientIP, false);
    logError(`Unexpected authentication error for request ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Authentication service error' });
  }
};

export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestId = `opt_auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  req.requestId = requestId;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') return next();

    const token = AuthUtils.extractTokenFromHeader(authHeader);
    if (!token || typeof token !== 'string' || token.length < 10 || token.length > 1000) return next();

    let decoded: JWTPayload;
    try {
      decoded = AuthUtils.verifyAccessToken(token);
    } catch {
      return next();
    }

    if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') return next();

    const user = await User.findById(decoded.userId).select('-password') as IUser;
    if (user && user.isEmailVerified) {
      req.user = user;
      req.token = token;
      logDebug(`Optional authentication successful for user ${user._id} in request ${requestId}`);
    }

    next();
  } catch (error) {
    logError(`Unexpected optional authentication error for request ${requestId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    next();
  }
};

export const checkLives = (livesRequired: number = 1) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      if (typeof livesRequired !== 'number' || isNaN(livesRequired) || livesRequired < 0) {
        res.status(500).json({ success: false, message: 'Invalid lives requirement configuration' });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }

      const currentLives = req.user.lives;
      if (typeof currentLives !== 'number' || isNaN(currentLives)) {
        res.status(500).json({ success: false, message: 'User lives data is invalid' });
        return;
      }

      try {
        req.user.regenerateLives?.();
      } catch (regenError) {
        logError(`Lives regeneration failed for user ${req.user._id}: ${regenError instanceof Error ? regenError.message : 'Unknown error'}`);
      }

      if (req.user.lives < livesRequired) {
        res.status(403).json({
          success: false,
          message: 'Insufficient lives',
          currentLives: req.user.lives,
          requiredLives: livesRequired,
          nextRegenTime: req.user.livesUpdatedAt
            ? new Date(req.user.livesUpdatedAt.getTime() + 5 * 60 * 1000)
            : new Date(Date.now() + 5 * 60 * 1000)
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, message: 'Lives validation service error' });
    }
  };
};

function isRateLimited(clientIP: string): boolean {
  try {
    const now = new Date();
    const attempts = authAttempts.get(clientIP);
    if (!attempts) return false;

    if (now.getTime() - attempts.lastAttempt.getTime() > AUTH_WINDOW_MS) {
      authAttempts.delete(clientIP);
      return false;
    }

    return attempts.count >= MAX_AUTH_ATTEMPTS;
  } catch (error) {
    return false;
  }
}

function recordAuthAttempt(clientIP: string, success: boolean): void {
  try {
    const now = new Date();
    const attempts = authAttempts.get(clientIP);

    if (!attempts || now.getTime() - attempts.lastAttempt.getTime() > AUTH_WINDOW_MS) {
      authAttempts.set(clientIP, { count: success ? 0 : 1, lastAttempt: now });
    } else {
      authAttempts.set(clientIP, {
        count: success ? 0 : attempts.count + 1,
        lastAttempt: now
      });
    }
  } catch {}
}

setInterval(() => {
  try {
    const now = new Date();
    // Convert to array first to avoid iterator issues
    const entries = Array.from(authAttempts.entries());
    for (const [ip, { lastAttempt }] of entries) {
      if (now.getTime() - lastAttempt.getTime() > AUTH_WINDOW_MS * 2) {
        authAttempts.delete(ip);
      }
    }
  } catch (err) {
    logError(`Auth attempts cleanup error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}, AUTH_WINDOW_MS);

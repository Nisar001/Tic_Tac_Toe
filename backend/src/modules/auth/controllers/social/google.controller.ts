import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../../../../models/user.model';
import { AuthUtils } from '../../../../utils/auth.utils';
import { Logger } from '../../../../utils/logger';
import rateLimit from 'express-rate-limit';

export const socialAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
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
  xp: number;
  energy: number;
}

export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user && !req.query.code) {
      Logger.logWarn('Google login attempted without proper authentication flow', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
      res.status(400).json({
        message: 'Invalid authentication request',
        code: 'INVALID_AUTH_REQUEST'
      });
      return;
    }

    passport.authenticate('google', async (
      err: Error | null,
      user: SocialAuthUser | false,
      info: { message?: string }
    ) => {
      try {
        if (err) {
          Logger.logError('Google authentication error', {
            error: err.message,
            stack: err.stack,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(500).json({
            message: 'Authentication service temporarily unavailable',
            code: 'AUTH_SERVICE_ERROR'
          });
        }

        if (!user) {
          Logger.logWarn('Google authentication failed', {
            reason: info?.message || 'Unknown reason',
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(401).json({
            message: 'Google authentication failed',
            code: 'AUTH_FAILED',
            details: info?.message || 'Authentication was not successful'
          });
        }

        if (!user._id || !user.email || !user.provider) {
          Logger.logError('Invalid user object from Google authentication', {
            userId: user._id,
            email: user.email,
            provider: user.provider,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(500).json({
            message: 'Authentication data is incomplete',
            code: 'INCOMPLETE_AUTH_DATA'
          });
        }

        const userDoc = await UserModel.findById(user._id);
        if (!userDoc) {
          Logger.logError('User not found after Google authentication', {
            userId: user._id,
            email: user.email,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(404).json({
            message: 'User account not found',
            code: 'USER_NOT_FOUND'
          });
        }

        req.logIn(userDoc, async (loginErr: Error | null) => {
          if (loginErr) {
            Logger.logError('Session creation failed for Google login', {
              error: loginErr.message,
              userId: user._id,
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
            return res.status(500).json({
              message: 'Session creation failed',
              code: 'SESSION_ERROR'
            });
          }

          const accessToken = AuthUtils.generateAccessToken({
            userId: user._id,
            email: user.email
          });

          const refreshToken = AuthUtils.generateRefreshToken({
            userId: user._id
          });

          await UserModel.findByIdAndUpdate(user._id, {
            lastSeen: new Date(),
            isOnline: true,
            lastLoginMethod: 'google',
            lastLoginIP: req.ip
          });

          const sanitizedUser = {
            id: user._id,
            email: user.email,
            username: user.username,
            avatar: user.avatar,
            level: user.level,
            xp: user.xp,
            energy: user.energy,
            provider: user.provider,
            isEmailVerified: user.isEmailVerified
          };

          Logger.logInfo('Successful Google login', {
            userId: user._id,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });

          return res.status(200).json({
            message: 'Google login successful',
            code: 'LOGIN_SUCCESS',
            user: sanitizedUser,
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
          });
        });
      } catch (authError) {
        Logger.logError('Error during Google authentication handling', {
          error: authError instanceof Error ? authError.message : 'Unknown error',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        return res.status(500).json({
          message: 'Authentication processing failed',
          code: 'AUTH_PROCESSING_ERROR'
        });
      }
    })(req, res, next);
  } catch (error) {
    Logger.logError('Unexpected error in Google login controller', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
    return;
  }
};

export const googleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    passport.authenticate('google', {
      failureRedirect: '/auth/login?error=google_auth_failed',
      session: false
    })(req, res, async () => {
      try {
        if (!req.user) {
          Logger.logWarn('Google callback: No user found after authentication', {
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.redirect('/auth/login?error=authentication_failed');
        }

        const user = req.user as unknown as SocialAuthUser;

        const accessToken = AuthUtils.generateAccessToken({
          userId: user._id,
          email: user.email
        });

        const refreshToken = AuthUtils.generateRefreshToken({
          userId: user._id
        });

        await UserModel.findByIdAndUpdate(user._id, {
          $push: {
            refreshTokens: {
              token: refreshToken,
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          },
          lastLogin: new Date()
        });

        Logger.logInfo('Google callback successful', {
          userId: user._id,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/auth/callback?provider=google&token=${accessToken}&refreshToken=${refreshToken}&success=true`
        );
      } catch (redirectError) {
        Logger.logError('Error during Google callback processing', {
          error: redirectError instanceof Error ? redirectError.message : 'Unknown error',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        return res.redirect('/auth/login?error=callback_failed');
      }
    });
  } catch (error) {
    Logger.logError('Unexpected error in Google callback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.redirect('/auth/login?error=internal_error');
  }
};

import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../../../../models/user.model';
import { AuthUtils } from '../../../../utils/auth.utils';
import { Logger } from '../../../../utils/logger';
import { socialConfig } from '../../../../config/social.config';
import rateLimit from 'express-rate-limit';

export const facebookAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many Facebook authentication attempts, please try again later.',
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

export const facebookLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user && !req.query.code) {
      Logger.logWarn('Facebook login attempted without proper authentication flow', {
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

    passport.authenticate('facebook', async (err: Error | null, user: SocialAuthUser | false, info: { message?: string }) => {
      if (err) {
        Logger.logError('Facebook authentication error', {
          error: err.message,
          stack: err.stack,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        return res.status(500).json({
          message: 'Authentication service temporarily unavailable',
          code: 'AUTH_SERVICE_ERROR'
        });
      }

      if (!user) {
        Logger.logWarn('Facebook authentication failed', {
          reason: info?.message || 'Unknown reason',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        return res.status(401).json({
          message: 'Facebook authentication failed',
          code: 'AUTH_FAILED',
          details: info?.message || 'Authentication was not successful'
        });
      }

      const userDoc = await UserModel.findById(user._id);
      if (!userDoc) {
        Logger.logError('User not found after Facebook authentication', {
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
          Logger.logError('Session creation failed for Facebook login', {
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
          lastLoginMethod: 'facebook',
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

        Logger.logInfo('Successful Facebook login', {
          userId: user._id,
          email: user.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        return res.status(200).json({
          message: 'Facebook login successful',
          code: 'LOGIN_SUCCESS',
          user: sanitizedUser,
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: process.env.JWT_EXPIRES_IN || '1h'
          }
        });
      });
    })(req, res, next);

  } catch (error) {
    Logger.logError('Unexpected error in Facebook login controller', {
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

export const facebookCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    passport.authenticate('facebook', {
      failureRedirect: socialConfig.redirectUrIs.facebook.error,
      session: false
    })(req, res, async () => {
      try {
        if (!req.user) {
          Logger.logWarn('Facebook callback: No user found after authentication', {
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.redirect(`${socialConfig.redirectUrIs.facebook.error}?message=authentication_failed`);
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

        Logger.logInfo('Facebook authentication successful', {
          userId: user._id,
          email: user.email,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        return res.redirect(
          `${socialConfig.redirectUrIs.facebook.success}?token=${accessToken}&refreshToken=${refreshToken}&provider=facebook`
        );

      } catch (tokenError) {
        Logger.logError('Error generating tokens in Facebook callback', {
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
          userId: req.user ? ((req.user as unknown) as SocialAuthUser)._id : 'unknown',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        return res.redirect(`${socialConfig.redirectUrIs.facebook.error}?message=token_generation_failed`);
      }
    });
  } catch (error) {
    Logger.logError('Unexpected error in Facebook callback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.redirect(`${socialConfig.redirectUrIs.facebook.error}?message=internal_error`);
  }
};

import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../../../../models/user.model';
import { AuthUtils } from '../../../../utils/auth.utils';
import { Logger } from '../../../../utils/logger';
import rateLimit from 'express-rate-limit';

// Rate limiting for Instagram authentication
export const instagramAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many Instagram authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});

interface SocialAuthUser {
  _id: string;
  email?: string;
  username: string;
  provider: string;
  providerId: string;
  avatar?: string;
  isEmailVerified: boolean;
  level: number;
  xp: number;
  energy: number;
}

export const instagramLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user && !req.query.code) {
      Logger.logWarn('Instagram login attempted without code/user', {
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

    passport.authenticate('instagram', async (
      err: Error | null,
      user: SocialAuthUser | false,
      info: { message?: string }
    ) => {
      try {
        if (err) {
          Logger.logError('Instagram authentication error', {
            error: err.message,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(500).json({
            message: 'Authentication service temporarily unavailable',
            code: 'AUTH_SERVICE_ERROR'
          });
        }

        if (!user) {
          Logger.logWarn('Instagram authentication failed', {
            reason: info?.message || 'Unknown reason',
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(401).json({
            message: 'Instagram authentication failed',
            code: 'AUTH_FAILED',
            details: info?.message || 'Authentication was not successful'
          });
        }

        if (!user._id || !user.username || !user.provider) {
          Logger.logError('Invalid Instagram user object', {
            userId: user._id,
            username: user.username,
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
          Logger.logError('User not found after Instagram authentication', {
            userId: user._id,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.status(404).json({
            message: 'User account not found',
            code: 'USER_NOT_FOUND'
          });
        }

        req.logIn(userDoc, async (loginErr: Error | null) => {
          try {
            if (loginErr) {
              Logger.logError('Session creation failed after Instagram login', {
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

            const fallbackEmail = `${user.username}@instagram.local`;
            const accessToken = AuthUtils.generateAccessToken({
              userId: user._id,
              email: user.email || fallbackEmail
            });

            const refreshToken = AuthUtils.generateRefreshToken({
              userId: user._id
            });

            await UserModel.findByIdAndUpdate(user._id, {
              lastSeen: new Date(),
              isOnline: true,
              lastLoginMethod: 'instagram',
              lastLoginIP: req.ip
            });

            const sanitizedUser = {
              id: user._id,
              email: user.email || fallbackEmail,
              username: user.username,
              avatar: user.avatar,
              level: user.level,
              xp: user.xp,
              energy: user.energy,
              provider: user.provider,
              isEmailVerified: user.isEmailVerified
            };

            Logger.logInfo('Successful Instagram login', {
              userId: user._id,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString()
            });

            return res.status(200).json({
              message: 'Instagram login successful',
              code: 'LOGIN_SUCCESS',
              user: sanitizedUser,
              tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
              }
            });

          } catch (sessionError) {
            Logger.logError('Error in Instagram login session handling', {
              error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
            return res.status(500).json({
              message: 'Login processing failed',
              code: 'LOGIN_PROCESSING_ERROR'
            });
          }
        });
      } catch (authError) {
        Logger.logError('Error in Instagram authentication callback', {
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
    Logger.logError('Unexpected error in Instagram login controller', {
      error: error instanceof Error ? error.message : 'Unknown error',
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

export const instagramCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    passport.authenticate('instagram', {
      failureRedirect: '/auth/login?error=instagram_auth_failed',
      session: false
    })(req, res, async () => {
      try {
        if (!req.user) {
          Logger.logWarn('Instagram callback: No user after authentication', {
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          return res.redirect('/auth/login?error=authentication_failed');
        }

        const user = req.user as unknown as SocialAuthUser;

        const fallbackEmail = `${user.username}@instagram.local`;
        const accessToken = AuthUtils.generateAccessToken({
          userId: user._id,
          email: user.email || fallbackEmail
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

        Logger.logInfo('Instagram callback successful', {
          userId: user._id,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/auth/callback?provider=instagram&token=${accessToken}&refreshToken=${refreshToken}&success=true`
        );
      } catch (redirectError) {
        Logger.logError('Instagram callback redirect error', {
          error: redirectError instanceof Error ? redirectError.message : 'Unknown error',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        return res.redirect('/auth/login?error=callback_failed');
      }
    });
  } catch (error) {
    Logger.logError('Unexpected error in Instagram callback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.redirect('/auth/login?error=internal_error');
  }
};

import passport from 'passport';
import { Request, Response, NextFunction } from 'express';
import UserModel from '../../../../models/user.model';
import { AuthUtils } from '../../../../utils/auth.utils';
import { Logger } from '../../../../utils/logger';
import rateLimit from 'express-rate-limit';

// Rate limiting for Twitter authentication
export const twitterAuthRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many Twitter authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test'
});

interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  photos: Array<{ value: string }>;
  provider: string;
  emails?: Array<{ value: string }>;
}

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

export const twitterLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user && (!req.query.oauth_token || !req.query.oauth_verifier)) {
      Logger.logWarn('Twitter login attempted without proper authentication flow', {
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

    passport.authenticate('twitter', async (err: Error | null, user: SocialAuthUser | false, info: { message?: string }) => {
      try {
        if (err) {
          Logger.logError('Twitter authentication error', {
            error: err.message,
            stack: err.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
          res.status(500).json({ message: 'Authentication service temporarily unavailable', code: 'AUTH_SERVICE_ERROR' });
          return;
        }

        if (!user) {
          Logger.logWarn('Twitter authentication failed', {
            reason: info?.message || 'Unknown reason',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
          res.status(401).json({
            message: 'Twitter authentication failed',
            code: 'AUTH_FAILED',
            details: info?.message || 'Authentication was not successful'
          });
          return;
        }

        if (!user._id || !user.username || !user.provider) {
          Logger.logError('Invalid user object from Twitter authentication', {
            userId: user._id,
            username: user.username,
            provider: user.provider,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          res.status(500).json({
            message: 'Authentication data is incomplete',
            code: 'INCOMPLETE_AUTH_DATA'
          });
          return;
        }

        const userDoc = await UserModel.findById(user._id);
        if (!userDoc) {
          Logger.logError('User not found after Twitter authentication', {
            userId: user._id,
            username: user.username,
            ip: req.ip,
            timestamp: new Date().toISOString()
          });
          res.status(404).json({
            message: 'User account not found',
            code: 'USER_NOT_FOUND'
          });
          return;
        }

        req.logIn(userDoc as any, async (loginErr: Error | null) => {
          try {
            if (loginErr) {
              Logger.logError('Session creation failed for Twitter login', {
                error: loginErr.message,
                userId: user._id,
                username: user.username,
                ip: req.ip,
                timestamp: new Date().toISOString()
              });
              res.status(500).json({ message: 'Session creation failed', code: 'SESSION_ERROR' });
              return;
            }

            const accessToken = AuthUtils.generateAccessToken({
              userId: user._id,
              email: user.email || `${user.username}@twitter.local`
            });

            const refreshToken = AuthUtils.generateRefreshToken({
              userId: user._id
            });

            await UserModel.findByIdAndUpdate(user._id, {
              lastSeen: new Date(),
              isOnline: true,
              lastLoginMethod: 'twitter',
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

            Logger.logInfo('Successful Twitter login', {
              userId: user._id,
              username: user.username,
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString()
            });

            res.status(200).json({
              message: 'Twitter login successful',
              code: 'LOGIN_SUCCESS',
              user: sanitizedUser,
              tokens: {
                accessToken,
                refreshToken,
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
              }
            });
          } catch (sessionError) {
            Logger.logError('Error during Twitter login session handling', {
              error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
              userId: user._id,
              ip: req.ip,
              timestamp: new Date().toISOString()
            });
            res.status(500).json({ message: 'Login processing failed', code: 'LOGIN_PROCESSING_ERROR' });
          }
        });
      } catch (authError) {
        Logger.logError('Error in Twitter authentication callback', {
          error: authError instanceof Error ? authError.message : 'Unknown error',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        res.status(500).json({ message: 'Authentication processing failed', code: 'AUTH_PROCESSING_ERROR' });
      }
    })(req, res, next);
  } catch (error) {
    Logger.logError('Unexpected error in Twitter login controller', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
};

export const twitterCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    passport.authenticate('twitter', {
      failureRedirect: '/auth/login?error=twitter_auth_failed',
      session: true
    })(req, res, () => {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/auth/callback?provider=twitter&success=true`);
      } catch (redirectError) {
        Logger.logError('Error during Twitter callback redirect', {
          error: redirectError instanceof Error ? redirectError.message : 'Unknown error',
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        res.redirect('/auth/login?error=callback_failed');
      }
    });
  } catch (error) {
    Logger.logError('Unexpected error in Twitter callback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.redirect('/auth/login?error=internal_error');
  }
};
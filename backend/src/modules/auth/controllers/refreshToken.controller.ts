import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logError, logInfo, logWarn } from '../../../utils/logger';
import User from '../../../models/user.model';

// Production-ready rate limit for token refresh
export const refreshTokenRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in prod, 20 in dev
  message: {
    success: false,
    message: 'Too many token refresh requests. Please wait a moment.',
    code: 'REFRESH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    const { refreshToken } = req.body;

    // Enhanced input validation
    if (!refreshToken) {
      throw createError.badRequest('Refresh token is required');
    }

    if (typeof refreshToken !== 'string' || refreshToken.length < 10) {
      logWarn(`Invalid refresh token format from IP: ${clientIP}`);
      throw createError.badRequest('Invalid refresh token format');
    }

    // Enhanced token verification with better error handling
    let decoded: any;
    try {
      decoded = AuthUtils.verifyToken(refreshToken, 'refresh');
    } catch (tokenError) {
      logWarn(`Refresh token verification failed from IP: ${clientIP}`);
      throw createError.unauthorized('Invalid or expired refresh token');
    }

    if (!decoded || typeof decoded !== 'object' || typeof decoded.userId !== 'string') {
      logWarn(`Invalid refresh token payload from IP: ${clientIP}`);
      throw createError.unauthorized('Invalid refresh token payload');
    }

    // Find user with refresh tokens
    const user = await User.findById(decoded.userId).select('+refreshTokens');

    if (!user) {
      logWarn(`Refresh token attempt for non-existent user: ${decoded.userId} from IP: ${clientIP}`);
      throw createError.unauthorized('User not found');
    }

    // Enhanced account status checks
    if (user.isDeleted) {
      logInfo(`Refresh token attempt on deleted account: ${user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been deactivated');
    }

    if (user.isBlocked) {
      logInfo(`Refresh token attempt on blocked account: ${user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been blocked');
    }

    // Enhanced refresh token validation
    const now = new Date();
    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = [];
    }

    // Clean up expired tokens
    user.refreshTokens = user.refreshTokens.filter((tokenObj: any) => 
      tokenObj.expiresAt > now
    );

    // Find matching token
    const tokenMatch = user.refreshTokens.find((tokenObj: any) =>
      tokenObj.token === refreshToken && tokenObj.expiresAt > now
    );

    if (!tokenMatch) {
      logWarn(`Invalid or expired refresh token for user: ${user.email} from IP: ${clientIP}`);
      // Clean up all expired tokens for this user
      await user.save();
      throw createError.unauthorized('Invalid or expired refresh token');
    }

    // Generate new access token
    let newAccessToken: string;
    try {
      newAccessToken = AuthUtils.generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        tokenType: 'access'
      });
    } catch (tokenGenError) {
      logError(`Access token generation failed for user ${user._id}: ${tokenGenError}`);
      throw createError.internal('Token generation failed. Please try again.');
    }

    // Enhanced refresh token rotation for better security
    const shouldRotate = process.env.ROTATE_REFRESH_TOKENS === 'true' || process.env.NODE_ENV === 'production';
    let newRefreshToken = refreshToken;

    if (shouldRotate) {
      // Remove old token
      user.refreshTokens = user.refreshTokens.filter((tokenObj: any) => 
        tokenObj.token !== refreshToken
      );

      // Generate new refresh token
      try {
        newRefreshToken = AuthUtils.generateRefreshToken({ userId: user._id.toString() });
        
        // Add new refresh token
        user.refreshTokens.push({
          token: newRefreshToken,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });

        // Keep only the 5 most recent refresh tokens
        if (user.refreshTokens.length > 5) {
          user.refreshTokens = user.refreshTokens
            .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);
        }
      } catch (refreshGenError) {
        logError(`Refresh token generation failed for user ${user._id}: ${refreshGenError}`);
        throw createError.internal('Token generation failed. Please try again.');
      }
    }

    // Update user's last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;

    try {
      await user.save();
    } catch (saveError) {
      logError(`Failed to save refresh token data for user ${user._id}: ${saveError}`);
      // Don't fail the refresh if save fails, just log it
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Token refresh completed in ${duration}ms for user: ${user.username} from IP: ${clientIP}`);

    // Enhanced response
    res.status(200).json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        // Legacy support - remove in future versions
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        },
        tokenRotated: shouldRotate
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Token refresh failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

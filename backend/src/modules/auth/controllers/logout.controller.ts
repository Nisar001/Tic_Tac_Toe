import { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { logInfo, logWarn, logError } from '../../../utils/logger';

// Production-ready rate limit for logout
export const logoutRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 10 : 30, // 10 in prod, 30 in dev
  message: {
    success: false,
    message: 'Too many logout requests. Please wait a moment.',
    code: 'LOGOUT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    const { refreshToken } = req.body;

    // Enhanced input validation
    if (!refreshToken || typeof refreshToken !== 'string') {
      logWarn(`Logout attempt without refresh token from IP: ${clientIP}`);
      throw createError.badRequest('Refresh token is required for logout');
    }

    if (refreshToken.length < 10) {
      logWarn(`Logout attempt with invalid refresh token format from IP: ${clientIP}`);
      throw createError.badRequest('Invalid refresh token format');
    }

    // Ensure user is authenticated
    if (!req.user) {
      logWarn(`Logout attempt without authenticated user from IP: ${clientIP}`);
      throw createError.unauthorized('User not authenticated');
    }

    // Enhanced user validation
    if (req.user.isDeleted) {
      logInfo(`Logout attempt on deleted account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logInfo(`Logout attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been blocked');
    }

    // Ensure user has refresh tokens array
    if (!Array.isArray(req.user.refreshTokens)) {
      req.user.refreshTokens = [];
    }

    // Clean up expired tokens first
    const now = new Date();
    const originalCount = req.user.refreshTokens.length;
    req.user.refreshTokens = req.user.refreshTokens.filter((tokenObj: any) => {
      return tokenObj.expiresAt > now;
    });

    // Filter out the provided token
    const beforeRemoval = req.user.refreshTokens.length;
    req.user.refreshTokens = req.user.refreshTokens.filter((tokenObj: any) => 
      tokenObj.token !== refreshToken
    );
    const afterRemoval = req.user.refreshTokens.length;

    // Check if token was actually found and removed
    const tokenWasFound = beforeRemoval > afterRemoval;
    
    if (!tokenWasFound) {
      logWarn(`Logout attempt with non-existent or expired token for user: ${req.user.email} from IP: ${clientIP}`);
      // Still return success for security (don't reveal token existence)
    }

    // Update user status
    req.user.isOnline = false;
    req.user.lastSeen = new Date();

    // Save user data with enhanced error handling
    try {
      await req.user.save({ validateBeforeSave: false });
      
      if (originalCount > req.user.refreshTokens.length) {
        logInfo(`Cleaned up ${originalCount - req.user.refreshTokens.length} expired tokens for user: ${req.user.username}`);
      }
      
      if (tokenWasFound) {
        logInfo(`User logged out successfully: ${req.user.username} from IP: ${clientIP}`);
      }
    } catch (saveError) {
      logError(`Failed to save logout data for user ${req.user._id}: ${saveError}`);
      // Don't fail the logout if save fails, just log it
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Logout completed in ${duration}ms for user: ${req.user.username} from IP: ${clientIP}`);

    // Enhanced response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: {
        loggedOut: true,
        timestamp: new Date().toISOString(),
        tokensRemaining: req.user.refreshTokens.length
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Logout failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

import { Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { logInfo, logWarn, logError } from '../../../utils/logger';

// Production-ready rate limit for logout all
export const logoutAllRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 in prod, 10 in dev
  message: {
    success: false,
    message: 'Too many logout all requests. This is a sensitive operation.',
    code: 'LOGOUT_ALL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Ensure user is authenticated
    if (!req.user) {
      logWarn(`LogoutAll attempt without authenticated user from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced user validation
    if (req.user.isDeleted) {
      logInfo(`LogoutAll attempt on deleted account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logInfo(`LogoutAll attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.unauthorized('Account has been blocked');
    }

    // Track how many tokens we're removing for logging
    const originalTokenCount = Array.isArray(req.user.refreshTokens) ? req.user.refreshTokens.length : 0;

    // Clear all stored refresh tokens
    req.user.refreshTokens = [];
    
    // Update user status
    req.user.isOnline = false;
    req.user.lastSeen = new Date();

    // Enhanced saving with error handling
    try {
      await req.user.save({ validateBeforeSave: false });
      
      logInfo(`User logged out from all devices: ${req.user.username} (${originalTokenCount} sessions terminated) from IP: ${clientIP}`);
      
      // Additional security logging for audit trail
      if (originalTokenCount > 1) {
        logInfo(`Security event: Multiple sessions terminated for user ${req.user.username} from IP: ${clientIP}`);
      }
    } catch (saveError) {
      logError(`Failed to save logoutAll data for user ${req.user._id}: ${saveError}`);
      throw createError.internal('Failed to complete logout operation. Please try again.');
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`LogoutAll completed in ${duration}ms for user: ${req.user.username} from IP: ${clientIP}`);

    // Enhanced response with security information
    res.status(200).json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: {
        loggedOut: true,
        sessionsTerminated: originalTokenCount,
        timestamp: new Date().toISOString(),
        securityNote: originalTokenCount > 1 ? 'Multiple active sessions were terminated' : 'Single session terminated'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`LogoutAll failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

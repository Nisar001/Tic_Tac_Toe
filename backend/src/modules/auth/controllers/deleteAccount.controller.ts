import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
import User from '../../../models/user.model';

// Enhanced rate limiting for account deletion - stricter in production
export const deleteAccountRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: process.env.NODE_ENV === 'production' ? 2 : 5, // 2 in prod, 5 in dev
  message: {
    success: false,
    message: 'Too many account deletion attempts. This is a security-sensitive operation.',
    code: 'DELETE_ACCOUNT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    const { password, confirmText } = req.body;

    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Account deletion attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Check if account is already deleted
    if (req.user.isDeleted) {
      logWarn(`Delete attempt on already deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.badRequest('Account is already deleted');
    }

    // Enhanced account status checks
    if (req.user.isBlocked) {
      logWarn(`Delete attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Cannot delete blocked account. Contact support.');
    }

    // Enhanced input validation
    if (!password || typeof password !== 'string') {
      logWarn(`Account deletion attempt without password from user: ${req.user.email} IP: ${clientIP}`);
      throw createError.badRequest('Valid password is required to delete account');
    }

    if (password.length < 6 || password.length > 255) {
      logWarn(`Account deletion attempt with invalid password length from user: ${req.user.email} IP: ${clientIP}`);
      throw createError.badRequest('Invalid password format');
    }

    if (!confirmText || confirmText !== 'DELETE') {
      logWarn(`Account deletion attempt without proper confirmation from user: ${req.user.email} IP: ${clientIP}`);
      throw createError.badRequest('Please type "DELETE" to confirm account deletion');
    }

    // Enhanced input sanitization
    const sanitizedPassword = AuthUtils.validateAndSanitizeInput(password, 255);

    // Fetch user with password for verification
    const user = await User.findById(req.user._id).select('+password +refreshTokens');
    if (!user || !user.password) {
      logError(`Account deletion failed - user not found: ${req.user._id} from IP: ${clientIP}`);
      throw createError.notFound('User not found or invalid account');
    }

    // Enhanced password verification
    let isPasswordValid: boolean;
    try {
      isPasswordValid = await AuthUtils.comparePassword(sanitizedPassword, user.password);
    } catch (passwordError) {
      logError(`Password verification failed during account deletion for user: ${user._id} - ${passwordError}`);
      throw createError.internal('Password verification failed');
    }

    if (!isPasswordValid) {
      logWarn(`Account deletion attempt with incorrect password from user: ${user.email} IP: ${clientIP}`);
      throw createError.badRequest('Password is incorrect');
    }

    // Security logging before deletion
    logInfo(`Account deletion initiated for user: ${user.username} (${user.email}) from IP: ${clientIP}`);

    // Enhanced account deletion with data cleanup
    const deletionData = {
      originalEmail: user.email,
      originalUsername: user.username,
      refreshTokenCount: Array.isArray(user.refreshTokens) ? user.refreshTokens.length : 0,
      deletionTimestamp: new Date()
    };

    // Soft delete with enhanced anonymization
    user.isDeleted = true;
    user.deletedAt = new Date();
    user.refreshTokens = [];
    user.emailVerificationToken = undefined;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.email = `deleted_${user._id}@deleted.local`;
    user.phoneNumber = undefined;
    user.bio = undefined;
    user.avatar = undefined;
    user.isOnline = false;
    user.lastSeen = new Date();

    // Clear sensitive authentication data
    user.password = undefined;

    try {
      await user.save({ validateBeforeSave: false });
      
      // Security audit log
      logInfo(`Account successfully deleted: ${deletionData.originalUsername} (${deletionData.originalEmail}) - ${deletionData.refreshTokenCount} sessions terminated from IP: ${clientIP}`);
      
      // Performance logging
      const duration = Date.now() - startTime;
      logInfo(`Account deletion completed in ${duration}ms for user: ${deletionData.originalUsername} from IP: ${clientIP}`);

    } catch (saveError) {
      logError(`Failed to save account deletion for user ${user._id}: ${saveError}`);
      throw createError.internal('Failed to complete account deletion. Please try again.');
    }

    // Enhanced response
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      data: {
        deleted: true,
        timestamp: deletionData.deletionTimestamp.toISOString(),
        note: 'All personal data has been anonymized and sessions terminated'
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Account deletion failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

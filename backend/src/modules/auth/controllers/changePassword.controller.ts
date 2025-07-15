import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logError, logInfo, logWarn } from '../../../utils/logger';
import User from '../../../models/user.model';

// Production-ready rate limiting: Stricter for password changes
export const changePasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 in prod, 10 in dev
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.',
    code: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password change controller
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // ✅ Validate user is logged in
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    // ✅ Check account status
    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    // ✅ Enhanced input validation
    if (!currentPassword || !newPassword) {
      throw createError.badRequest('Current and new password are required');
    }

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      throw createError.badRequest('Passwords must be strings');
    }

    if (!confirmPassword || newPassword !== confirmPassword) {
      throw createError.badRequest('New password and confirmation do not match');
    }

    // ✅ Sanitize and validate passwords
    const sanitizedCurrent = AuthUtils.validateAndSanitizeInput(currentPassword, 255);
    const sanitizedNew = AuthUtils.validateAndSanitizeInput(newPassword, 255);

    if (!AuthUtils.isValidPassword(sanitizedNew)) {
      throw createError.badRequest('New password must be at least 6 characters with letters and numbers');
    }

    if (AuthUtils.isCommonPassword(sanitizedNew)) {
      throw createError.badRequest('Please choose a more secure password');
    }

    if (sanitizedCurrent === sanitizedNew) {
      throw createError.badRequest('New password must be different from current password');
    }

    // ✅ Fetch user with password
    const user = await User.findById(req.user._id).select('+password +lastPasswordChange +refreshTokens');
    if (!user || !user.password) {
      throw createError.notFound('User not found or invalid account');
    }

    // ✅ Enhanced current password verification
    let isCurrentPasswordValid = false;
    try {
      isCurrentPasswordValid = await AuthUtils.comparePassword(sanitizedCurrent, user.password);
    } catch (compareError) {
      logError(`Password comparison error during change password for user ${user._id}: ${compareError}`);
      throw createError.internal('Password verification failed. Please try again.');
    }

    if (!isCurrentPasswordValid) {
      logWarn(`Failed password change attempt for user ${user._id} from IP: ${clientIP}`);
      throw createError.badRequest('Current password is incorrect');
    }

    // ✅ Enhanced rate limiting - check last password change time
    const cooldown = 5 * 60 * 1000; // 5 minutes between password changes
    if (user.lastPasswordChange && !AuthUtils.isActionAllowed(user.lastPasswordChange, cooldown)) {
      const remainingTime = Math.ceil((cooldown - (Date.now() - user.lastPasswordChange.getTime())) / 1000 / 60);
      throw createError.tooManyRequests(`Please wait ${remainingTime} minutes before changing password again`);
    }

    // ✅ Enhanced password hashing
    let hashedNewPassword: string;
    try {
      hashedNewPassword = await AuthUtils.hashPassword(sanitizedNew);
    } catch (hashError) {
      logError(`Password hashing failed during change password for user ${user._id}: ${hashError}`);
      throw createError.internal('Password change failed. Please try again.');
    }

    // ✅ Update user password and metadata
    user.password = hashedNewPassword;
    user.lastPasswordChange = new Date();
    
    // ✅ Invalidate all refresh tokens for security (force re-login on all devices)
    user.refreshTokens = [];

    // Clear any password reset tokens
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    try {
      await user.save();
      logInfo(`Password changed successfully for user ${user._id} (${user.username}) from IP: ${clientIP}`);
    } catch (saveError) {
      logError(`Failed to save password change for user ${user._id}: ${saveError}`);
      throw createError.internal('Password change failed. Please try again.');
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Password change completed in ${duration}ms for user: ${user.username}`);

    // ✅ Enhanced response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again on all devices.',
      data: {
        changedAt: user.lastPasswordChange,
        tokensInvalidated: true,
        requiresReAuth: true
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Password change failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

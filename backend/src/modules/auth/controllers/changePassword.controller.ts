import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

// Rate limiting: 5 attempts per hour
export const changePasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Password change controller
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    // ✅ Basic input checks
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
    const user = await User.findById(req.user._id).select('+password +lastPasswordChange');
    if (!user || !user.password) {
      throw createError.notFound('User not found or invalid account');
    }

    // ✅ Check current password
    const isMatch = await AuthUtils.comparePassword(sanitizedCurrent, user.password);
    if (!isMatch) {
      throw createError.badRequest('Current password is incorrect');
    }

    // ✅ Prevent frequent changes
    const cooldown = 5 * 60 * 1000; // 5 mins
    if (user.lastPasswordChange && !AuthUtils.isActionAllowed(user.lastPasswordChange, cooldown)) {
      throw createError.tooManyRequests('Please wait before changing your password again');
    }

    // ✅ Hash and update
    user.password = await AuthUtils.hashPassword(sanitizedNew);
    user.refreshTokens = []; // Invalidate refresh tokens
    user.lastPasswordChange = new Date();
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;

    await user.save();

    console.log(`🔒 Password changed for user: ${user._id} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.'
    });

  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Password change error:', error);

    // Rethrow for asyncHandler to handle (and middleware to respond)
    throw err;
  }
});

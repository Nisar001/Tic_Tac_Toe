import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

// Rate limiting for account deletion - 3 attempts per 24 hours
export const deleteAccountRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many account deletion attempts. Please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { password, confirmText } = req.body;

    // ✅ Validate authentication
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    // ✅ Check if account is already deleted
    if (req.user.isDeleted) {
      throw createError.badRequest('Account is already deleted');
    }

    // ✅ Validate input fields
    if (!password || typeof password !== 'string') {
      throw createError.badRequest('Valid password is required to delete account');
    }

    if (!confirmText || confirmText !== 'DELETE') {
      throw createError.badRequest('Please type "DELETE" to confirm account deletion');
    }

    // ✅ Sanitize input
    const sanitizedPassword = AuthUtils.validateAndSanitizeInput(password, 255);

    // ✅ Fetch user with password
    const user = await User.findById(req.user._id).select('+password');
    if (!user || !user.password) {
      throw createError.notFound('User not found or invalid account');
    }

    // ✅ Verify password
    const isPasswordValid = await AuthUtils.comparePassword(sanitizedPassword, user.password);
    if (!isPasswordValid) {
      throw createError.badRequest('Password is incorrect');
    }

    // 🧹 TODO: Clean up related user data (sessions, games, posts, etc.)

    // ✅ Soft delete + anonymize
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

    await user.save();

    console.log(`🗑️ Account deleted: ${user._id} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (err) {
    console.error('❌ Account deletion error:', err instanceof Error ? err.message : err);
    throw err; // Let asyncHandler send the formatted response
  }
});

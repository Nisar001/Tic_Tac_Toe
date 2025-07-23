import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Input validation
    if (!token || !newPassword) {
      throw createError.badRequest('Token and new password are required');
    }

    if (typeof token !== 'string' || token.length < 32) {
      throw createError.badRequest('Invalid token format');
    }

    if (!AuthUtils.isValidPassword(newPassword)) {
      throw createError.badRequest('Password must be at least 6 characters long and include both letters and numbers');
    }

    // Lookup user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw createError.badRequest('Invalid or expired password reset token');
    }

    // Prevent reuse of old password (optional)
    const isSamePassword = await AuthUtils.comparePassword(newPassword, user.password || '');
    if (isSamePassword) {
      throw createError.badRequest('New password must be different from the old password');
    }

    // Hash and update password
    const hashedPassword = await AuthUtils.hashPassword(newPassword);
    user.password = hashedPassword;

    // Clear reset token fields
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    user.lastPasswordChange = new Date();

    // Invalidate all active sessions
    user.refreshTokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.'
    });
  } catch (err) {

    if (
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      'message' in err
    ) {
      throw err; // known error from createError
    }
    throw createError.internal('An error occurred while resetting your password');
  }
});

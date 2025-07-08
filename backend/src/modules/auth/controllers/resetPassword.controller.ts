import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
const User = require('../../../models/user.model');

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw createError.badRequest('Token and new password are required');
  }

  if (!AuthUtils.isValidPassword(newPassword)) {
    throw createError.badRequest('Password must be at least 6 characters with letters and numbers');
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetTokenExpiry: { $gt: new Date() }
  });

  if (!user) {
    throw createError.badRequest('Invalid or expired reset token');
  }

  const hashedPassword = await AuthUtils.hashPassword(newPassword);

  user.password = hashedPassword;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiry = undefined;
  user.refreshTokens = [];

  await user.save();

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

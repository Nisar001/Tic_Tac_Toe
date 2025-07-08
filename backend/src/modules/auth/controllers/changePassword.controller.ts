import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
const User = require('../../../models/user.model');

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw createError.badRequest('Current password and new password are required');
  }

  if (!AuthUtils.isValidPassword(newPassword)) {
    throw createError.badRequest('New password must be at least 6 characters with letters and numbers');
  }

  if (currentPassword === newPassword) {
    throw createError.badRequest('New password must be different from current password');
  }

  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    throw createError.notFound('User not found');
  }

  const isCurrentPasswordValid = await AuthUtils.comparePassword(currentPassword, user.password);

  if (!isCurrentPasswordValid) {
    throw createError.badRequest('Current password is incorrect');
  }

  const hashedNewPassword = await AuthUtils.hashPassword(newPassword);

  user.password = hashedNewPassword;
  user.refreshTokens = [];

  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

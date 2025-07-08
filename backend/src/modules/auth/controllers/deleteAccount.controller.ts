import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
const User = require('../../../models/user.model');

export const deleteAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { password } = req.body;

  if (!password) {
    throw createError.badRequest('Password is required to delete account');
  }

  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    throw createError.notFound('User not found');
  }

  const isPasswordValid = await AuthUtils.comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw createError.badRequest('Password is incorrect');
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  user.refreshTokens = [];

  await user.save();

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
});

import { Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Ensure user is authenticated
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  // Clear all stored refresh tokens
  if (!Array.isArray(req.user.refreshTokens)) {
    req.user.refreshTokens = [];
  } else if (req.user.refreshTokens.length > 0) {
    req.user.refreshTokens = [];
  }

  await req.user.save();

  res.status(200).json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

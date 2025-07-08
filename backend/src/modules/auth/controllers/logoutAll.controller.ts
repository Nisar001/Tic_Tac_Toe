import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const logoutAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  req.user.refreshTokens = [];
  await req.user.save();

  res.json({
    success: true,
    message: 'Logged out from all devices successfully'
  });
});

import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken && req.user) {
    req.user.refreshTokens = req.user.refreshTokens.filter(
      (t: any) => t.token !== refreshToken
    );
    await req.user.save();
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

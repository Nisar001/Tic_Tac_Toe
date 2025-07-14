import { Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  // Validate input
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw createError.badRequest('Refresh token is required for logout');
  }

  // Ensure user is authenticated
  if (!req.user) {
    throw createError.unauthorized('User not authenticated');
  }

  // Ensure user has refresh tokens
  if (!Array.isArray(req.user.refreshTokens)) {
    req.user.refreshTokens = [];
  }

  // Filter out the provided token
  const originalCount = req.user.refreshTokens.length;
  req.user.refreshTokens = req.user.refreshTokens.filter((t: any) => t.token !== refreshToken);

  // Save only if token was found and removed
  if (req.user.refreshTokens.length !== originalCount) {
    await req.user.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

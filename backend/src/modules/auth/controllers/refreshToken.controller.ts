import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
const User = require('../../../models/user.model');

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError.badRequest('Refresh token is required');
  }

  const decoded = AuthUtils.verifyToken(refreshToken, 'refresh');
  const user = await User.findById(decoded.userId);

  if (!user) {
    throw createError.unauthorized('Invalid refresh token');
  }

  const tokenExists = user.refreshTokens.some(
    (t: any) => t.token === refreshToken && t.expiresAt > new Date()
  );

  if (!tokenExists) {
    throw createError.unauthorized('Invalid refresh token');
  }

  const newAccessToken = AuthUtils.generateAccessToken({
    userId: user._id.toString(),
    email: user.email
  });

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken
    }
  });
});

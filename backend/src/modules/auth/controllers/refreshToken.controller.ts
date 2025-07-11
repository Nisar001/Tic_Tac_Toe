import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

// Rate limit: max 10 refresh requests per IP per minute
export const refreshTokenRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many token refresh requests. Please wait a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // Input validation
    if (!refreshToken) {
      throw createError.badRequest('Refresh token is required');
    }

    if (typeof refreshToken !== 'string' || refreshToken.length < 10) {
      throw createError.badRequest('Invalid refresh token format');
    }

    // Verify and decode token
    let decoded: any;
    try {
      decoded = AuthUtils.verifyToken(refreshToken, 'refresh');
    } catch (err) {
      throw createError.unauthorized('Invalid or expired refresh token');
    }

    if (!decoded || typeof decoded !== 'object' || typeof decoded.userId !== 'string') {
      throw createError.unauthorized('Invalid refresh token payload');
    }

    // Find user and validate account
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw createError.unauthorized('User not found');
    }

    if (user.isDeleted || user.isBlocked) {
      throw createError.unauthorized('Account is not active');
    }

    // Validate refresh token exists and is not expired
    const now = new Date();
    const tokenMatch = user.refreshTokens?.some((t: any) =>
      t.token === refreshToken && t.expiresAt > now
    );

    if (!tokenMatch) {
      user.refreshTokens = [];
      await user.save();
      throw createError.unauthorized('Invalid or expired refresh token');
    }

    // Generate new access token
    const newAccessToken = AuthUtils.generateAccessToken({
      userId: (user._id as unknown as string).toString(),
      email: user.email
    });

    // Optional: Rotate refresh token for better security
    const shouldRotate = process.env.ROTATE_REFRESH_TOKENS === 'true';
    let newRefreshToken = refreshToken;

    if (shouldRotate) {
      user.refreshTokens = (user.refreshTokens ?? []).filter((t: any) => t.token !== refreshToken);

      newRefreshToken = AuthUtils.generateRefreshToken({ userId: String(user._id) });

      user.refreshTokens.push({
        token: newRefreshToken,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        ...(shouldRotate && { refreshToken: newRefreshToken })
      }
    });

  } catch (error) {
    // Pass to centralized error handler
    throw createError.internal((error as Error).message || 'Token refresh failed');
  }
});

import { Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { LivesManager } from '../../../utils/energy.utils';
import { AuthUtils } from '../../../utils/auth.utils';

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  // Always fetch the latest user document from DB
  const user = await require('../../../models/user.model').default.findById(req.user._id);
  if (!user) {
    throw createError.notFound('User not found');
  }

  // Safely calculate lives and XP progress
  const livesStatus = LivesManager.calculateCurrentLives(
    user.lives ?? 0,
    user.lastLivesUpdate ?? new Date(0),
    user.lastLivesRegenTime
  );

  const xpProgress = AuthUtils.getXPProgress(user.totalXP ?? 0);

  const userProfile = {
    _id: user._id,
    id: user._id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    level: user.level,
    totalXP: user.totalXP,
    xpProgress,
    lives: livesStatus.currentLives,
    maxLives: livesStatus.maxLives,
    livesStatus,
    stats: user.stats ?? {},
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };

  res.status(200).json({
    success: true,
    data: {
      user: userProfile
    }
  });
});


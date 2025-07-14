import { Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { EnergyManager } from '../../../utils/energy.utils';
import { AuthUtils } from '../../../utils/auth.utils';

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  // Safely calculate energy and XP progress
  const energyStatus = EnergyManager.calculateCurrentEnergy(
    req.user.energy ?? 0,
    req.user.lastEnergyUpdate ?? new Date(0),
    req.user.lastEnergyRegenTime
  );

  const xpProgress = AuthUtils.getXPProgress(req.user.totalXP ?? 0);

  const userProfile = {
    _id: req.user._id,
    id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    avatar: req.user.avatar,
    bio: req.user.bio,
    level: req.user.level,
    totalXP: req.user.totalXP,
    xpProgress,
    energy: energyStatus.currentEnergy,
    maxEnergy: energyStatus.maxEnergy,
    energyStatus,
    gameStats: req.user.stats ?? {},
    stats: req.user.stats ?? {},
    isEmailVerified: req.user.isEmailVerified,
    createdAt: req.user.createdAt,
    lastLogin: req.user.lastLogin
  };

  res.status(200).json({
    success: true,
    data: {
      user: userProfile
    }
  });
});


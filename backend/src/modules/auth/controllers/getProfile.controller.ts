import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { EnergyManager } from '../../../utils/energy.utils';
import { AuthUtils } from '../../../utils/auth.utils';

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const energyStatus = EnergyManager.calculateCurrentEnergy(
    req.user.energy,
    req.user.lastEnergyUpdate,
    req.user.lastEnergyRegenTime
  );

  const xpProgress = AuthUtils.getXPProgress(req.user.totalXP);

  res.json({
    success: true,
    data: {
      user: {
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
        stats: req.user.stats,
        preferences: req.user.preferences,
        isEmailVerified: req.user.isEmailVerified,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin
      }
    }
  });
});

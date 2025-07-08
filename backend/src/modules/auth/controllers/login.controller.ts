import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EnergyManager } from '../../../utils/energy.utils';
const User = require('../../../models/user.model');

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw createError.badRequest('Email and password are required');
  }

  if (!AuthUtils.isValidEmail(email)) {
    throw createError.badRequest('Please provide a valid email address');
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw createError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await AuthUtils.comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw createError.unauthorized('Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw createError.unauthorized('Please verify your email before logging in');
  }

  const energyStatus = EnergyManager.calculateCurrentEnergy(
    user.energy,
    user.lastEnergyUpdate,
    user.lastEnergyRegenTime
  );

  user.lastLogin = new Date();
  user.energy = energyStatus.currentEnergy;
  user.lastEnergyUpdate = new Date();
  if (energyStatus.currentEnergy > user.energy) {
    user.lastEnergyRegenTime = new Date();
  }

  await user.save();

  const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user._id, user.email);

  user.refreshTokens.push({
    token: refreshToken,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await user.save();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        level: user.level,
        totalXP: user.totalXP,
        energy: user.energy,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        stats: user.stats
      },
      tokens: {
        accessToken,
        refreshToken
      },
      energyStatus
    }
  });
});

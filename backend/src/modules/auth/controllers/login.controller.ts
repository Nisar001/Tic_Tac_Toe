import { Request, Response } from 'express';
import { createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EnergyManager } from '../../../utils/energy.utils';
import User from '../../../models/user.model';

export const login = async (req: Request, res: Response, next: Function) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      throw createError.badRequest('Email and password are required');
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      throw createError.badRequest('Invalid email or password format');
    }

    if (!AuthUtils.isValidEmail(email)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    const user = await User.findOne({ email }).select('+password +refreshTokens');

    if (!user) {
      throw createError.unauthorized('User not found');
    }

    const isPasswordValid = await AuthUtils.comparePassword(password, user.password as string);

    if (!isPasswordValid) {
      throw createError.unauthorized('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw createError.unauthorized('Please verify your email before logging in');
    }

    // Calculate energy before login updates
    const energyStatus = EnergyManager.calculateCurrentEnergy(
      user.energy ?? 0,
      user.lastEnergyUpdate ?? user.energyUpdatedAt,
      user.lastEnergyRegenTime ?? user.energyUpdatedAt
    );

    // Update login metadata
    user.lastLogin = new Date();

    // Update energy if regenerated
    if (energyStatus.currentEnergy !== user.energy) {
      user.energy = energyStatus.currentEnergy;
      user.lastEnergyUpdate = new Date();
      user.lastEnergyRegenTime = new Date();
    }

    // Generate tokens
    const { accessToken, refreshToken } = AuthUtils.generateTokenPair(user._id.toString(), user.email);

    // Add refresh token
    if (!Array.isArray(user.refreshTokens)) {
      user.refreshTokens = [];
    }

    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await user.save();

    res.status(200).json({
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
          stats: user.stats ?? {}
        },
        tokens: {
          accessToken,
          refreshToken
        },
        energyStatus
      }
    });

  } catch (error) {
    next(error);
  }
};

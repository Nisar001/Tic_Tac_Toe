import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';

// Rate limiting for custom game creation - 5 games per hour
export const createCustomGameRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many custom games created. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createCustomGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    const { gameConfig } = req.body;

    if (!gameConfig || typeof gameConfig !== 'object') {
      throw createError.badRequest('Game configuration is required and must be an object');
    }

    // Allowed fields
    const validFields = ['gameMode', 'isPrivate', 'maxPlayers', 'timeLimit', 'gameName', 'password'];
    const configKeys = Object.keys(gameConfig);
    const invalidFields = configKeys.filter(key => !validFields.includes(key));

    if (invalidFields.length > 0) {
      throw createError.badRequest(`Invalid game config fields: ${invalidFields.join(', ')}`);
    }

    // Validate and sanitize
    const sanitizedConfig: any = {};

    if (gameConfig.gameMode) {
      const validGameModes = ['classic', 'blitz', 'ranked', 'custom'];
      if (!validGameModes.includes(gameConfig.gameMode)) {
        throw createError.badRequest(`Invalid game mode. Must be one of: ${validGameModes.join(', ')}`);
      }
      sanitizedConfig.gameMode = gameConfig.gameMode;
    }

    if (gameConfig.isPrivate !== undefined) {
      if (typeof gameConfig.isPrivate !== 'boolean') {
        throw createError.badRequest('isPrivate must be a boolean');
      }
      sanitizedConfig.isPrivate = gameConfig.isPrivate;
    }

    if (gameConfig.maxPlayers !== undefined) {
      if (
        typeof gameConfig.maxPlayers !== 'number' ||
        gameConfig.maxPlayers < 2 ||
        gameConfig.maxPlayers > 8
      ) {
        throw createError.badRequest('maxPlayers must be a number between 2 and 8');
      }
      sanitizedConfig.maxPlayers = gameConfig.maxPlayers;
    }

    if (gameConfig.timeLimit !== undefined) {
      if (
        typeof gameConfig.timeLimit !== 'number' ||
        gameConfig.timeLimit < 30 ||
        gameConfig.timeLimit > 3600
      ) {
        throw createError.badRequest('timeLimit must be a number between 30 and 3600 seconds');
      }
      sanitizedConfig.timeLimit = gameConfig.timeLimit;
    }

    if (gameConfig.gameName) {
      if (typeof gameConfig.gameName !== 'string') {
        throw createError.badRequest('gameName must be a string');
      }
      sanitizedConfig.gameName = AuthUtils.validateAndSanitizeInput(gameConfig.gameName, 50);
      if (sanitizedConfig.gameName.length < 3) {
        throw createError.badRequest('Game name must be at least 3 characters long');
      }
    }

    if (gameConfig.password) {
      if (typeof gameConfig.password !== 'string') {
        throw createError.badRequest('password must be a string');
      }
      sanitizedConfig.password = AuthUtils.validateAndSanitizeInput(gameConfig.password, 50);
      if (sanitizedConfig.password.length < 4) {
        throw createError.badRequest('Game password must be at least 4 characters long');
      }
      sanitizedConfig.isPrivate = true;
    }

    if (!socketManager) {
      throw createError.serviceUnavailable('Game service is currently unavailable');
    }

    const gameSocket = socketManager.getGameSocket?.();
    if (!gameSocket || typeof gameSocket.createCustomGame !== 'function') {
      throw createError.notImplemented('Custom game creation is not available');
    }

    // Attach user info
    const user = req.user as { _id: string | { toString: () => string }, username: string };
    const finalConfig = {
      ...sanitizedConfig,
      creatorId: user._id.toString(),
      creatorUsername: user.username,
      createdAt: new Date(),
    };

    const newGame = gameSocket.createCustomGame(finalConfig);
    if (!newGame) {
      throw createError.internal('Failed to create custom game');
    }

    res.status(201).json({
      success: true,
      message: 'Custom game created successfully',
      data: {
        gameId: newGame.id,
        gameConfig: finalConfig,
        createdAt: newGame.createdAt || new Date(),
      },
    });
  } catch (error: any) {
    console.error('Create custom game error:', error);
    throw createError.internal(error.message || 'An error occurred while creating the custom game');
  }
});

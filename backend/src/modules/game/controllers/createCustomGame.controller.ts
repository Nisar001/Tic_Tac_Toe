import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
import { EnergyManager } from '../../../utils/energy.utils';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';

// Import socket manager with fallback handling
let socketManager: any = null;
try {
  socketManager = require('../../../socket/index')?.socketManager || null;
} catch (error) {
  // Socket manager not available, will use REST fallback
  socketManager = null;
}

// Production-ready rate limiting for custom game creation
export const createCustomGameRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 8, // 3 in prod, 8 in dev
  message: {
    success: false,
    message: 'Too many custom games created. Please try again later.',
    code: 'CREATE_GAME_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createCustomGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Game creation attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Game creation attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Game creation attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    const { gameConfig } = req.body;
    const userId = req.user._id.toString();

    // Enhanced input validation
    if (!gameConfig || typeof gameConfig !== 'object') {
      logWarn(`Game creation attempt with invalid config from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Game configuration is required and must be an object');
    }

    // Enhanced field validation
    const validFields = ['gameMode', 'isPrivate', 'maxPlayers', 'timeLimit', 'gameName', 'password'];
    const configKeys = Object.keys(gameConfig);
    const invalidFields = configKeys.filter(key => !validFields.includes(key));

    if (invalidFields.length > 0) {
      logWarn(`Game creation attempt with invalid fields: ${invalidFields.join(', ')} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest(`Invalid game config fields: ${invalidFields.join(', ')}`);
    }

    // Energy validation for game creation
    const energyStatus = EnergyManager.calculateCurrentEnergy(
      req.user.energy || 0,
      req.user.lastEnergyUpdate || new Date(0),
      req.user.lastEnergyRegenTime
    );

    const energyCost = 5; // Cost to create a custom game
    if (energyStatus.currentEnergy < energyCost) {
      logWarn(`Game creation attempt with insufficient energy from user: ${req.user.username} (${energyStatus.currentEnergy}/${energyCost}) IP: ${clientIP}`);
      throw createError.badRequest(`Insufficient energy to create game. Required: ${energyCost}, Available: ${energyStatus.currentEnergy}`);
    }

    // Check for existing active games by user
    const existingGames = await Game.countDocuments({
      $or: [
        { 'players.player1': userId },
        { 'players.player2': userId }
      ],
      status: { $in: ['waiting', 'active'] }
    });

    const maxActiveGames = process.env.NODE_ENV === 'production' ? 2 : 5;
    if (existingGames >= maxActiveGames) {
      logWarn(`Game creation attempt with too many active games from user: ${req.user.username} (${existingGames}/${maxActiveGames}) IP: ${clientIP}`);
      throw createError.badRequest(`Too many active games. Maximum allowed: ${maxActiveGames}`);
    }

    // Enhanced configuration sanitization
    const sanitizedConfig: any = {};

    // Game mode validation
    const validGameModes = ['classic', 'timed', 'blitz', 'tournament'];
    if (gameConfig.gameMode) {
      if (!validGameModes.includes(gameConfig.gameMode)) {
        throw createError.badRequest(`Invalid game mode. Must be one of: ${validGameModes.join(', ')}`);
      }
      sanitizedConfig.gameMode = gameConfig.gameMode;
    } else {
      sanitizedConfig.gameMode = 'classic';
    }

    // Privacy settings
    sanitizedConfig.isPrivate = Boolean(gameConfig.isPrivate);

    // Max players validation
    if (gameConfig.maxPlayers !== undefined) {
      if (typeof gameConfig.maxPlayers !== 'number' || gameConfig.maxPlayers < 2 || gameConfig.maxPlayers > 2) {
        throw createError.badRequest('Max players must be 2 for Tic Tac Toe');
      }
      sanitizedConfig.maxPlayers = 2;
    } else {
      sanitizedConfig.maxPlayers = 2;
    }

    // Time limit validation
    if (gameConfig.timeLimit !== undefined) {
      if (typeof gameConfig.timeLimit !== 'number' || gameConfig.timeLimit < 30 || gameConfig.timeLimit > 3600) {
        throw createError.badRequest('Time limit must be between 30 seconds and 1 hour');
      }
      sanitizedConfig.timeLimit = Math.floor(gameConfig.timeLimit);
    }

    // Game name validation
    if (gameConfig.gameName) {
      if (typeof gameConfig.gameName !== 'string') {
        throw createError.badRequest('Game name must be a string');
      }
      const sanitizedName = AuthUtils.validateAndSanitizeInput(gameConfig.gameName, 50);
      if (sanitizedName.length < 3) {
        throw createError.badRequest('Game name must be at least 3 characters long');
      }
      sanitizedConfig.gameName = sanitizedName;
    }

    // Password validation for private games
    if (gameConfig.password) {
      if (typeof gameConfig.password !== 'string') {
        throw createError.badRequest('Game password must be a string');
      }
      const sanitizedPassword = AuthUtils.validateAndSanitizeInput(gameConfig.password, 50);
      if (sanitizedPassword.length < 4) {
        throw createError.badRequest('Game password must be at least 4 characters long');
      }
      sanitizedConfig.isPrivate = true;
      sanitizedConfig.password = sanitizedPassword;
    }

    // Generate unique room ID with better randomness
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const roomId = `custom_${timestamp}_${userId.slice(-6)}_${randomSuffix}`;

    // Deduct energy for game creation
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { energy: -energyCost },
        $set: { lastEnergyUpdate: new Date() }
      });
    } catch (energyError) {
      logError(`Failed to deduct energy for game creation by user ${userId}: ${energyError}`);
      throw createError.internal('Failed to process energy cost. Please try again.');
    }

    // Create game with enhanced structure
    const gameData = {
      gameId: roomId,
      room: roomId,
      gameMode: sanitizedConfig.gameMode,
      isPrivate: sanitizedConfig.isPrivate,
      password: sanitizedConfig.password || null,
      gameName: sanitizedConfig.gameName || `${req.user.username}'s Game`,
      maxPlayers: sanitizedConfig.maxPlayers,
      timeLimit: sanitizedConfig.timeLimit,
      creatorId: new mongoose.Types.ObjectId(userId),
      players: {
        player1: new mongoose.Types.ObjectId(userId),
        player2: null
      },
      board: Array(3).fill(null).map(() => Array(3).fill(null)),
      currentPlayer: 'X',
      status: 'waiting',
      result: null,
      winner: null,
      moves: [],
      startedAt: new Date()
    };

    // Create game with enhanced error handling
    let newGame;
    try {
      newGame = await Game.create(gameData);
      await newGame.populate('players.player1', 'username avatar email');
    } catch (gameCreateError) {
      logError(`Failed to create game for user ${userId}: ${gameCreateError}`);
      
      // Refund energy on failure
      try {
        await User.findByIdAndUpdate(userId, {
          $inc: { energy: energyCost }
        });
      } catch (refundError) {
        logError(`Failed to refund energy for user ${userId}: ${refundError}`);
      }
      
      throw createError.internal('Failed to create game. Please try again.');
    }

    // Try socket notification with fallback
    if (socketManager && typeof socketManager.createCustomGame === 'function') {
      try {
        socketManager.createCustomGame(roomId, sanitizedConfig, req.user);
        logInfo(`Socket notification sent for game creation: ${roomId}`);
      } catch (socketError) {
        logError(`Socket error during game creation for room ${roomId}: ${socketError}`);
        // Continue - socket failure shouldn't break game creation
      }
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Custom game created in ${duration}ms: ${roomId} by user ${req.user.username} from IP: ${clientIP}`);

    // Enhanced response
    res.status(201).json({
      success: true,
      message: 'Custom game created successfully',
      data: {
        game: {
          id: newGame._id,
          gameId: newGame.gameId,
          room: newGame.room,
          gameMode: newGame.gameMode,
          gameName: newGame.gameName,
          isPrivate: newGame.isPrivate,
          maxPlayers: newGame.maxPlayers,
          timeLimit: newGame.timeLimit,
          status: newGame.status,
          players: {
            player1: {
              _id: newGame.players.player1,
              username: (newGame.players.player1 as any).username || req.user.username,
              avatar: (newGame.players.player1 as any).avatar || req.user.avatar
            },
            player2: null
          },
          board: newGame.board,
          currentPlayer: newGame.currentPlayer,
          startedAt: newGame.startedAt,
          creatorId: newGame.creatorId
        },
        energyUsed: energyCost,
        remainingEnergy: energyStatus.currentEnergy - energyCost,
        joinCode: sanitizedConfig.isPrivate ? roomId : null
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Create custom game failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { socketManager } from '../../../server';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';

// Rate limiting for game state requests - 60 requests per minute
export const getGameStateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many game state requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const getGameState = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const userId = (req.user as { _id: { toString: () => string } })._id.toString();

    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);

    if (sanitizedRoomId.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      throw createError.badRequest('Invalid room ID format');
    }

    if (!socketManager) {
      throw createError.serviceUnavailable('Game service is currently unavailable');
    }

    const gameSocket = socketManager.getGameSocket();
    if (!gameSocket || typeof gameSocket.getActiveGames !== 'function') {
      throw createError.serviceUnavailable('Game socket is not properly initialized');
    }

    const activeGames = gameSocket.getActiveGames();
    const game = activeGames.find(g => g.id === sanitizedRoomId);

    if (!game) {
      throw createError.notFound('Game not found');
    }

    // Determine if user is participant or spectator
    const playerXId = game.players?.X?.userId;
    const playerOId = game.players?.O?.userId;
    const playerIds = [playerXId, playerOId].filter(Boolean);

    const isParticipant = playerIds.includes(userId);
    const isSpectator = (game.spectators || []).some((spectator: any) => spectator.id === userId);

    // Build game state based on user access
    const gameState: any = {
      roomId: game.id,
      board: game.board || [],
      currentPlayer: game.currentPlayer || null,
      status: game.status || 'waiting',
      winner: game.winner || null,
      winningLine: game.winningLine || [],
      moveCount: typeof game.moveCount === 'number' ? game.moveCount : 0,
      createdAt: game.createdAt || null,
      lastMoveAt: game.lastMoveAt || null,
      spectatorCount: Array.isArray(game.spectators) ? game.spectators.length : 0,
    };

    if (isParticipant) {
      gameState.players = game.players || {};
      gameState.gameConfig = (game as any).config || {};
    } else {
      gameState.players = {
        X: game.players?.X
          ? {
              userId: game.players.X.userId,
              username: game.players.X.username || 'Player X'
            }
          : null,
        O: game.players?.O
          ? {
              userId: game.players.O.userId,
              username: game.players.O.username || 'Player O'
            }
          : null
      };
    }

    if ((game as any).turnTimeLimit) {
      gameState.turnTimeLimit = (game as any).turnTimeLimit;
      gameState.turnStartTime = (game as any).turnStartTime || null;
    }

    res.json({
      success: true,
      data: gameState,
      meta: {
        isParticipant,
        isSpectator,
        requestedAt: new Date()
      }
    });
  } catch (error) {
    console.error('getGameState error:', error);
    throw createError.internal('Failed to retrieve game state');
  }
});

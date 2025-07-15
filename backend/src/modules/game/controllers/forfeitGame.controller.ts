import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
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

// Production-ready rate limiting for game forfeiting
export const forfeitGameRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 5 : 15, // 5 in prod, 15 in dev
  message: {
    success: false,
    message: 'Too many game forfeits. Please try again later.',
    code: 'FORFEIT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forfeitGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Game forfeit attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Game forfeit attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Game forfeit attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    const { roomId } = req.params;
    const userId = req.user._id.toString();

    // Enhanced room ID validation
    if (!roomId || typeof roomId !== 'string') {
      logWarn(`Game forfeit attempt with invalid room ID from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);
    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      logWarn(`Game forfeit attempt with malformed room ID: ${roomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Invalid room ID format');
    }

    // Enhanced forfeit cooldown check
    const cooldownMs = 5 * 60 * 1000; // 5 minutes
    if (req.user.lastForfeitTime) {
      const timeSinceLastForfeit = Date.now() - new Date(req.user.lastForfeitTime).getTime();
      if (timeSinceLastForfeit < cooldownMs) {
        const remainingTime = Math.ceil((cooldownMs - timeSinceLastForfeit) / 1000);
        logWarn(`Game forfeit attempt during cooldown from user: ${req.user.username} (${remainingTime}s remaining) IP: ${clientIP}`);
        throw createError.tooManyRequests(`Please wait ${remainingTime} seconds before forfeiting another game`);
      }
    }

    // Enhanced game loading with validation
    const game = await Game.findOne({ room: sanitizedRoomId }).populate('players.player1 players.player2', 'username email');
    if (!game) {
      logWarn(`Game forfeit attempt on non-existent game: ${sanitizedRoomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.notFound('Game not found');
    }

    // Enhanced player validation
    const player1Id = game.players?.player1?._id?.toString();
    const player2Id = game.players?.player2?._id?.toString();
    const isPlayer = [player1Id, player2Id].includes(userId);

    if (!isPlayer) {
      logWarn(`Game forfeit attempt by non-player: ${req.user.username} in game: ${sanitizedRoomId} IP: ${clientIP}`);
      throw createError.forbidden('You are not a player in this game');
    }

    // Enhanced game state validation
    if (game.status === 'completed') {
      logWarn(`Game forfeit attempt on completed game: ${sanitizedRoomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Cannot forfeit a completed game');
    }

    if (game.status !== 'active' && game.status !== 'waiting') {
      logWarn(`Game forfeit attempt on invalid game state: ${sanitizedRoomId} status: ${game.status} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest(`Cannot forfeit game in ${game.status} state`);
    }

    // Determine winner and loser
    const forfeitingPlayer = userId;
    const winningPlayer = forfeitingPlayer === player1Id ? player2Id : player1Id;

    // Start transaction for atomic updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update game with forfeit result
      game.status = 'completed';
      game.result = 'abandoned';
      game.winner = winningPlayer ? new mongoose.Types.ObjectId(winningPlayer) : undefined;
      game.endedAt = new Date();
      
      // Add forfeit move to history
      game.moves.push({
        player: new mongoose.Types.ObjectId(forfeitingPlayer),
        position: { row: -1, col: -1 }, // Special position for forfeit
        symbol: 'X', // Use placeholder symbol
        timestamp: new Date()
      });

      await game.save({ session });

      // Update player statistics
      const updatePromises = [];

      // Update forfeiting player stats (penalty)
      updatePromises.push(
        User.findByIdAndUpdate(forfeitingPlayer, {
          $inc: { 
            'stats.gamesLost': 1,
            'stats.gamesForfeited': 1,
            'stats.totalGames': 1,
            'energy': -2 // Energy penalty for forfeiting
          },
          $set: { 
            'lastForfeitTime': new Date()
          }
        }, { session })
      );

      // Update winning player stats (if there is an opponent)
      if (winningPlayer) {
        updatePromises.push(
          User.findByIdAndUpdate(winningPlayer, {
            $inc: { 
              'stats.gamesWon': 1,
              'stats.totalGames': 1,
              'totalXP': 5, // Reduced XP for forfeit win
              'energy': 1 // Small energy bonus
            }
          }, { session })
        );
      }

      await Promise.all(updatePromises);

      await session.commitTransaction();

      // Socket notification with enhanced error handling
      if (socketManager && typeof socketManager.emitToRoom === 'function') {
        try {
          const forfeitData = {
            gameId: game._id,
            room: sanitizedRoomId,
            forfeitedBy: forfeitingPlayer,
            winner: winningPlayer,
            reason: 'forfeit',
            timestamp: new Date()
          };
          
          socketManager.emitToRoom(sanitizedRoomId, 'game_forfeited', forfeitData);
          logInfo(`Socket notification sent for game forfeit: ${sanitizedRoomId}`);
        } catch (socketError) {
          logError(`Socket error during forfeit notification for room ${sanitizedRoomId}: ${socketError}`);
          // Continue - socket failure shouldn't break forfeit flow
        }
      }

      // Performance logging
      const duration = Date.now() - startTime;
      logInfo(`Game forfeited in ${duration}ms: ${sanitizedRoomId} by user ${req.user.username} from IP: ${clientIP}`);

      // Enhanced response
      res.status(200).json({
        success: true,
        message: 'Game forfeited successfully',
        data: {
          game: {
            id: game._id,
            room: game.room,
            status: game.status,
            result: game.result,
            winner: game.winner,
            forfeitedBy: forfeitingPlayer,
            endTime: game.endedAt,
            moves: game.moves
          },
          forfeit: {
            forfeitedBy: forfeitingPlayer,
            winner: winningPlayer,
            timestamp: new Date(),
            penalty: {
              energyLost: 2,
              xpLost: 0,
              cooldownMinutes: 5
            }
          },
          nextAvailableForfeit: new Date(Date.now() + cooldownMs).toISOString()
        }
      });

    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Game forfeit failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

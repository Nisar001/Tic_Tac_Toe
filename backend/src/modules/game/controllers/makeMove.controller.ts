import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
import { EnergyManager } from '../../../utils/energy.utils';

// Production-ready rate limiting for game moves
export const makeMoveRateLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: process.env.NODE_ENV === 'production' ? 5 : 10, // 5 in prod, 10 in dev
  message: {
    success: false,
    message: 'Too many moves attempted. Please wait a moment.',
    code: 'MOVE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const makeMove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Move attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Move attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Move attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    const { roomId } = req.params;
    const { position, player, row: inputRow, col: inputCol } = req.body;
    const userId = req.user._id.toString();

    // Enhanced room ID validation
    if (!roomId || typeof roomId !== 'string') {
      logWarn(`Move attempt with invalid room ID from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);
    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      logWarn(`Move attempt with malformed room ID: ${roomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Invalid room ID format');
    }

    // Enhanced move position validation
    let movePosition: number;
    if (position !== undefined) {
      if (typeof position !== 'number' || !Number.isInteger(position) || position < 0 || position > 8) {
        throw createError.badRequest('Position must be an integer between 0 and 8');
      }
      movePosition = position;
    } else if (inputRow !== undefined && inputCol !== undefined) {
      if (typeof inputRow !== 'number' || typeof inputCol !== 'number' || 
          !Number.isInteger(inputRow) || !Number.isInteger(inputCol)) {
        throw createError.badRequest('Row and column must be integers');
      }
      if (inputRow < 0 || inputRow > 2 || inputCol < 0 || inputCol > 2) {
        throw createError.badRequest('Row and column must be between 0 and 2');
      }
      movePosition = inputRow * 3 + inputCol;
    } else {
      throw createError.badRequest('Either position or row/col must be provided');
    }

    // Enhanced game loading with proper error handling
    const game = await Game.findOne({ room: sanitizedRoomId }).populate('players.player1 players.player2', 'username email');
    if (!game) {
      logWarn(`Move attempt on non-existent game: ${sanitizedRoomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.notFound('Game not found');
    }

    // Enhanced player validation
    const player1Id = game.players?.player1?._id?.toString();
    const player2Id = game.players?.player2?._id?.toString();
    const isPlayer = [player1Id, player2Id].includes(userId);

    if (!isPlayer) {
      logWarn(`Move attempt by non-player: ${req.user.username} in game: ${sanitizedRoomId} IP: ${clientIP}`);
      throw createError.forbidden('You are not a player in this game');
    }

    // Enhanced game state validation
    if (game.status !== 'active') {
      logWarn(`Move attempt on inactive game: ${sanitizedRoomId} status: ${game.status} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest(`Game is not active (status: ${game.status})`);
    }

    if (!game.players?.player2) {
      throw createError.badRequest('Game is waiting for second player');
    }

    // Enhanced turn validation
    const currentPlayerSymbol = game.currentPlayer;
    const userSymbol: 'X' | 'O' = player1Id === userId ? 'X' : 'O';
    
    if (currentPlayerSymbol !== userSymbol) {
      logWarn(`Move attempt out of turn: user ${req.user.username} (${userSymbol}) current: ${currentPlayerSymbol} in game: ${sanitizedRoomId} IP: ${clientIP}`);
      throw createError.badRequest(`It is not your turn. Current player: ${currentPlayerSymbol}`);
    }

    // Energy validation for moves
    const energyStatus = EnergyManager.calculateCurrentEnergy(
      req.user.energy || 0,
      req.user.lastEnergyUpdate || new Date(0),
      req.user.lastEnergyRegenTime
    );

    if (energyStatus.currentEnergy < 1) {
      logWarn(`Move attempt with insufficient energy from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Insufficient energy to make a move');
    }

    // Enhanced position validation
    const row = Math.floor(movePosition / 3);
    const col = movePosition % 3;

    if (!game.board || !Array.isArray(game.board) || game.board.length !== 3) {
      logError(`Invalid game board structure in game: ${sanitizedRoomId}`);
      throw createError.internal('Game board corrupted');
    }

    if (!Array.isArray(game.board[row]) || game.board[row].length !== 3) {
      logError(`Invalid game board row structure in game: ${sanitizedRoomId}`);
      throw createError.internal('Game board corrupted');
    }
    
    if (game.board[row][col] !== null) {
      logWarn(`Move attempt on occupied position: ${movePosition} in game: ${sanitizedRoomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Invalid move: position already occupied');
    }

    // Deduct energy for the move
    try {
      await User.findByIdAndUpdate(userId, {
        $inc: { energy: -1 },
        $set: { lastEnergyUpdate: new Date() }
      });
    } catch (energyError) {
      logError(`Failed to deduct energy for user ${userId}: ${energyError}`);
      // Continue with move - energy deduction failure shouldn't block gameplay
    }

    // Make the move with transaction safety
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update game board
      game.board[row][col] = userSymbol;

      // Add move to moves array with enhanced tracking
      game.moves.push({
        player: new mongoose.Types.ObjectId(userId),
        position: { row, col },
        symbol: userSymbol,
        timestamp: new Date()
      });

      // Enhanced win condition checking
      const winPatterns = [
        // Rows
        [[0, 0], [0, 1], [0, 2]],
        [[1, 0], [1, 1], [1, 2]],
        [[2, 0], [2, 1], [2, 2]],
        // Columns
        [[0, 0], [1, 0], [2, 0]],
        [[0, 1], [1, 1], [2, 1]],
        [[0, 2], [1, 2], [2, 2]],
        // Diagonals
        [[0, 0], [1, 1], [2, 2]],
        [[0, 2], [1, 1], [2, 0]]
      ];

      let gameWon = false;
      let winningPattern: number[][] | null = null;

      for (const pattern of winPatterns) {
        if (pattern.every(([r, c]) => game.board[r][c] === userSymbol)) {
          game.status = 'completed';
          game.winner = new mongoose.Types.ObjectId(userId);
          game.result = 'win';
          game.endedAt = new Date();
          winningPattern = pattern;
          gameWon = true;
          break;
        }
      }

      // Enhanced draw checking
      if (!gameWon && game.board.every(row => row.every(cell => cell !== null))) {
        game.status = 'completed';
        game.result = 'draw';
        game.endedAt = new Date();
      }

      // Switch turns if game is still active
      if (game.status === 'active') {
        game.currentPlayer = userSymbol === 'X' ? 'O' : 'X';
      }

      // Save game with session
      await game.save({ session });

      // Update player statistics if game ended
      if (game.status === 'completed') {
        const updatePromises = [];

        if (game.result === 'win' && game.winner) {
          // Update winner stats
          updatePromises.push(
            User.findByIdAndUpdate(game.winner, {
              $inc: { 
                'stats.gamesWon': 1,
                'stats.totalGames': 1,
                'totalXP': 10,
                'energy': 2 // Bonus energy for winning
              }
            }, { session })
          );

          // Update loser stats
          const loserId = game.winner.toString() === player1Id ? player2Id : player1Id;
          updatePromises.push(
            User.findByIdAndUpdate(loserId, {
              $inc: { 
                'stats.gamesLost': 1,
                'stats.totalGames': 1,
                'totalXP': 2 // Consolation XP
              }
            }, { session })
          );
        } else if (game.result === 'draw') {
          // Update both players for draw
          updatePromises.push(
            User.findByIdAndUpdate(player1Id, {
              $inc: { 
                'stats.gamesDrawn': 1,
                'stats.totalGames': 1,
                'totalXP': 5
              }
            }, { session })
          );
          updatePromises.push(
            User.findByIdAndUpdate(player2Id, {
              $inc: { 
                'stats.gamesDrawn': 1,
                'stats.totalGames': 1,
                'totalXP': 5
              }
            }, { session })
          );
        }

        await Promise.all(updatePromises);
      }

      await session.commitTransaction();

      // Performance logging
      const duration = Date.now() - startTime;
      logInfo(`Move completed in ${duration}ms: user ${req.user.username} position ${movePosition} in game ${sanitizedRoomId} from IP: ${clientIP}`);

      // Enhanced response
      res.status(200).json({
        success: true,
        message: gameWon ? 'Winning move!' : game.result === 'draw' ? 'Game ended in a draw!' : 'Move successful',
        data: {
          game: {
            id: game._id,
            room: game.room,
            board: game.board,
            currentPlayer: game.currentPlayer,
            status: game.status,
            winner: game.winner,
            result: game.result,
            moves: game.moves,
            winningPattern: winningPattern,
            totalMoves: game.moves.length,
            endTime: game.endedAt
          },
          move: {
            position: movePosition,
            row,
            col,
            symbol: userSymbol,
            timestamp: new Date()
          },
          player: {
            energy: energyStatus.currentEnergy - 1,
            maxEnergy: energyStatus.maxEnergy
          }
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
    logError(`Move failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

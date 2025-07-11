import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';

// Rate limiting for game forfeiting - 10 forfeits per hour
export const forfeitGameRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many game forfeits. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forfeitGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const userId = (req.user as { _id: string | { toString(): string } })._id.toString();

    // User validation
    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    // Validate roomId
    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);
    if (sanitizedRoomId.length < 10 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      throw createError.badRequest('Invalid room ID format');
    }

    // Forfeit cooldown check
    const cooldownMs = 5 * 60 * 1000;
    if (
      req.user.lastForfeitTime &&
      !AuthUtils.isActionAllowed(
        typeof req.user.lastForfeitTime === 'string'
          ? new Date(req.user.lastForfeitTime)
          : req.user.lastForfeitTime,
        cooldownMs
      )
    ) {
      throw createError.tooManyRequests('Please wait before forfeiting another game');
    }

    // Find active game
    const game = await Game.findOne({
      roomId: sanitizedRoomId,
      status: { $in: ['waiting', 'active', 'paused'] },
      $or: [{ 'players.player1': userId }, { 'players.player2': userId }],
    });

    if (!game) {
      throw createError.notFound('Game not found or you are not a participant');
    }

    // Prevent double forfeits
    if (['completed', 'forfeited', 'abandoned', 'cancelled'].includes(game.status)) {
      throw createError.badRequest('Game is already finished');
    }

    // Determine forfeiting and winning players
    const isPlayer1 = game.players?.player1?.toString() === userId;
    const forfeitingKey = isPlayer1 ? 'player1' : 'player2';
    const winningKey = isPlayer1 ? 'player2' : 'player1';
    const winnerId = game.players?.[winningKey];

    // Update game status
    game.status = 'abandoned';
    game.winner = winnerId;
    game.result = 'abandoned';
    game.endedAt = new Date();
    await game.save();

    // Update stats: forfeiter
    req.user.stats = req.user.stats || { wins: 0, losses: 0, gamesPlayed: 0 };
    req.user.stats.losses += 1;
    req.user.stats.gamesPlayed += 1;
    req.user.lastForfeitTime = new Date();
    await req.user.save();

    // Update stats: winner
    const winner = await User.findById(winnerId);
    if (winner) {
      winner.stats = winner.stats || { wins: 0, losses: 0, gamesPlayed: 0 };
      winner.stats.wins += 1;
      winner.stats.gamesPlayed += 1;
      await winner.save();
    }

    // Optional socket notification
    if (socketManager?.getGameSocket) {
      try {
        const gameSocket = socketManager.getGameSocket();
        if (typeof gameSocket?.handleGameForfeit === 'function') {
          gameSocket.handleGameForfeit(sanitizedRoomId, userId, game);
        }
      } catch (socketError) {
        console.error('Socket forfeit notify error:', socketError);
        // Don't throw - already successfully forfeited
      }
    }

    console.log(
      `Game forfeited: ${sanitizedRoomId} by ${userId} at ${new Date().toISOString()}`
    );

    res.json({
      success: true,
      message: 'Game forfeited successfully',
      data: {
        gameId: game._id,
        roomId: sanitizedRoomId,
        forfeitedBy: userId,
        winner: game.winner,
        forfeitedAt: game.endedAt,
      },
    });
  } catch (error: any) {
    console.error('Forfeit game error:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      throw createError.notFound('Game not found or you are not a participant');
    }
    throw createError.internal('Failed to forfeit game');
  }
});

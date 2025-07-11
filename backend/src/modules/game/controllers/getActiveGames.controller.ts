import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import Game from '../../../models/game.model';

export const getActiveGames = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const activeGames = await Game.find({
      status: { $in: ['waiting', 'active'] }
    })
      .populate('players.player1', 'username avatar')
      .populate('players.player2', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .select('room status players createdAt moves gameMode isPrivate');

    const gamesData = activeGames.map((game: any) => {
      const player1 = game.players?.player1;
      const player2 = game.players?.player2;

      return {
        roomId: game.room,
        status: game.status,
        players: {
          player1: player1
            ? {
                username: player1.username || 'Unknown',
                avatar: player1.avatar || null,
              }
            : null,
          player2: player2
            ? {
                username: player2.username || 'Unknown',
                avatar: player2.avatar || null,
              }
            : null,
        },
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
        gameMode: game.gameMode || 'classic',
        isPrivate: !!game.isPrivate,
        createdAt: game.createdAt,
        canJoin: game.status === 'waiting' && !player2,
      };
    });

    res.json({
      success: true,
      data: {
        games: gamesData,
        totalActiveGames: gamesData.length,
      },
    });
  } catch (error) {
    console.error('Error fetching active games:', error);
    throw createError.internal('Failed to fetch active games');
  }
});

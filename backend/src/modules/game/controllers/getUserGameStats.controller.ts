import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import User from '../../../models/user.model';
import Game from '../../../models/game.model';

/**
 * Get user game stats and recent games
 */
export const getUserGameStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const userId = req.user._id;

  // Fetch user stats
  const user = await User.findById(userId).select('stats level xp');
  if (!user) {
    throw createError.notFound('User not found');
  }

  // Fetch recent games
  const recentGames = await Game.find({
    $or: [
      { 'players.player1': userId },
      { 'players.player2': userId }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('status result winner players createdAt moves');

  const totalGames = user.stats?.gamesPlayed || 0;
  const wins = user.stats?.wins || 0;
  const losses = user.stats?.losses || 0;
  const draws = user.stats?.draws || 0;

  const winRate = totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(1)) : 0.0;

  res.status(200).json({
    success: true,
    data: {
      stats: {
        level: user.level || 0,
        xp: user.xp || 0,
        gamesPlayed: totalGames,
        wins,
        losses,
        draws,
        winRate
      },
      recentGames: recentGames.map(game => ({
        id: game._id,
        status: game.status,
        result: game.result,
        winner: game.winner,
        createdAt: game.createdAt,
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0
      }))
    }
  });
});

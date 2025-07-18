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
    console.error('[getUserGameStats] No req.user found. Headers:', req.headers);
    throw createError.unauthorized('Authentication required');
  }

  const userId = req.user._id;

  // Fetch full user document for validation and saving
  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('User not found');
  }

  // Fetch all games for this user
  const allGames = await Game.find({
    $or: [
      { 'players.player1': userId },
      { 'players.player2': userId }
    ]
  }).select('status result winner players');

  // Calculate stats from games collection
  let wins = 0, losses = 0, draws = 0, gamesPlayed = 0;
  allGames.forEach(game => {
    if (game.status === 'completed') {
      gamesPlayed++;
      if (game.result === 'draw') draws++;
      else if (String(game.winner) === String(userId)) wins++;
      else losses++;
    }
  });
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

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

  // Update user.stats in DB
  user.stats = {
    gamesPlayed,
    wins,
    losses,
    draws,
    winRate
  };
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      stats: {
        level: user.level || 0,
        xp: user.xp || 0,
        gamesPlayed,
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

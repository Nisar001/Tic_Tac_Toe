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

  // Calculate stats from all games (not just completed)
  let wins = 0, losses = 0, draws = 0, gamesPlayed = 0, waiting = 0, active = 0, abandoned = 0;
  allGames.forEach(game => {
    if (game.status === 'completed') {
      gamesPlayed++;
      if (game.result === 'draw') draws++;
      else if (String(game.winner) === String(userId)) wins++;
      else losses++;
    } else if (game.status === 'waiting') {
      waiting++;
    } else if (game.status === 'active') {
      active++;
    } else if (game.status === 'abandoned') {
      abandoned++;
    }
  });
  // Count all games for total
  const totalGames = allGames.length;
  const winRate = (wins + losses + draws) > 0 ? Math.round((wins / (wins + losses + draws)) * 100) : 0;

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

  // Update user.stats in DB (only completed games)
  user.stats = {
    gamesPlayed,
    wins,
    losses,
    draws,
    winRate
  };
  await user.save();

  // Calculate streaks and average duration
  const recentFinishedGames = recentGames.filter(game => game.status === 'completed');
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let streakType: 'win' | 'loss' | null = null;

  for (const game of recentFinishedGames) {
    const isWin = game.winner?.toString() === userId.toString();
    const isDraw = !game.winner;
    
    if (isWin) {
      if (streakType === 'win' || streakType === null) {
        tempStreak++;
        streakType = 'win';
      } else {
        tempStreak = 1;
        streakType = 'win';
      }
    } else if (!isDraw) {
      if (streakType === 'loss' || streakType === null) {
        tempStreak++;
        streakType = 'loss';
      } else {
        tempStreak = 1;
        streakType = 'loss';
      }
    } else {
      tempStreak = 0;
      streakType = null;
    }

    if (currentStreak === 0) {
      currentStreak = tempStreak;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // Calculate average game duration
  const completedGames = recentGames.filter(game => 
    game.status === 'completed' && game.startedAt && game.endedAt
  );

  let averageGameDuration = 0;
  if (completedGames.length > 0) {
    const totalDuration = completedGames.reduce((sum, game) => {
      const duration = new Date(game.endedAt!).getTime() - new Date(game.startedAt!).getTime();
      return sum + duration;
    }, 0);
    averageGameDuration = Math.round(totalDuration / completedGames.length / 1000);
  }

  const response = {
    success: true,
    data: {
      stats: {
        level: user.level || 0,
        xp: user.xp || 0,
        gamesPlayed, // completed games
        totalGames, // all games
        wins,
        losses,
        draws,
        waiting,
        active,
        abandoned,
        winRate,
        currentStreak: streakType === 'win' ? currentStreak : (streakType === 'loss' ? -currentStreak : 0),
        longestStreak,
        averageGameDuration
      },
      recentGames: recentGames.map(game => ({
        id: game._id,
        status: game.status,
        result: game.result,
        winner: game.winner,
        createdAt: game.createdAt,
        moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
        players: game.players
      }))
    }
  };

  // Validate response structure before sending
  if (!response.data || !response.data.stats || typeof response.data.stats !== 'object') {
    throw createError.internal('Failed to generate valid stats response');
  }

  // Ensure all numeric fields are actual numbers
  const stats = response.data.stats;
  const numericFields: (keyof typeof stats)[] = [
    'level', 'xp', 'gamesPlayed', 'totalGames', 'wins', 'losses', 'draws', 
    'waiting', 'active', 'abandoned', 'winRate', 'currentStreak', 'longestStreak', 'averageGameDuration'
  ];
  
  numericFields.forEach(field => {
    if (typeof stats[field] !== 'number' || isNaN(stats[field])) {
      (stats as any)[field] = 0;
    }
  });

  res.status(200).json(response);
});

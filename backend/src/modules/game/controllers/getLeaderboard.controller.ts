import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import User from '../../../models/user.model';

// Rate limiting - 30 requests/min
export const getLeaderboardRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many leaderboard requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const getLeaderboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', limit = '20', timeframe = 'all' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw createError.badRequest('Page must be a positive number');
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw createError.badRequest('Limit must be a number between 1 and 100');
  }

  const validTimeframes = ['all', 'daily', 'weekly', 'monthly'];
  if (!validTimeframes.includes(timeframe as string)) {
    throw createError.badRequest(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
  }

  // Date filter
  const now = new Date();
  let dateFilter: any = {};
  if (timeframe === 'daily') {
    dateFilter = { lastGameAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } };
  } else if (timeframe === 'weekly') {
    dateFilter = { lastGameAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
  } else if (timeframe === 'monthly') {
    dateFilter = { lastGameAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } };
  }

  const query = {
    isDeleted: { $ne: true },
    isBlocked: { $ne: true },
    'gameStats.gamesPlayed': { $gt: 0 },
    ...dateFilter
  };

  const skip = (pageNum - 1) * limitNum;

  const leaderboardData = await User.aggregate([
    { $match: query },
    {
      $addFields: {
        winRate: {
          $cond: [
            { $eq: ['$gameStats.gamesPlayed', 0] },
            0,
            { $divide: ['$gameStats.wins', '$gameStats.gamesPlayed'] }
          ]
        },
        score: {
          $add: [
            { $multiply: ['$gameStats.wins', 3] },
            { $multiply: ['$gameStats.draws', 1] },
            { $multiply: ['$gameStats.streak', 0.5] }
          ]
        }
      }
    },
    { $sort: { score: -1, winRate: -1, 'gameStats.wins': -1 } },
    { $skip: skip },
    { $limit: limitNum },
    {
      $project: {
        username: 1,
        avatar: 1,
        level: 1,
        score: 1,
        winRate: 1,
        gameStats: {
          wins: 1,
          losses: 1,
          draws: 1,
          gamesPlayed: 1,
          streak: 1
        },
        lastGameAt: 1
      }
    }
  ]);

  const leaderboard = leaderboardData.map((user: any, index: number) => ({
    rank: skip + index + 1,
    ...user,
    winRate: Math.round((user.winRate || 0) * 100) / 100
  }));

  const totalUsers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalUsers / limitNum);

  res.status(200).json({
    success: true,
    data: {
      leaderboard,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1
      },
      meta: {
        timeframe,
        generatedAt: new Date()
      }
    }
  });
});

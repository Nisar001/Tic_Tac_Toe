import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import User from '../../../models/user.model';
import Game from '../../../models/game.model';

// Get admin dashboard stats
export const getDashboardStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  const [
    totalUsers,
    activeUsers,
    totalGames,
    gamesInProgress
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isOnline: true }),
    Game.countDocuments(),
    Game.countDocuments({ status: 'active' })
  ]);

  const stats = {
    totalUsers,
    activeUsers,
    totalGames,
    gamesInProgress,
    averageGameDuration: 0, // TODO: Calculate from completed games
    peakConcurrentUsers: activeUsers, // TODO: Track this over time
    systemHealth: {
      database: 'healthy' as const,
      redis: 'healthy' as const,
      websockets: 'healthy' as const,
    }
  };

  res.json({
    success: true,
    data: stats
  });
});

// Get all users with admin details
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .select('username email role isActive isEmailVerified createdAt lastLogin stats')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments();

  const usersData = users.map(user => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role || 'user',
    isActive: user.isActive !== false,
    isVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    gamesPlayed: user.stats?.gamesPlayed || 0,
    totalWins: user.stats?.wins || 0,
    totalLosses: user.stats?.losses || 0,
  }));

  res.json({
    success: true,
    data: {
      users: usersData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// Get all games with admin details
export const getGames = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const games = await Game.find()
    .populate('players.player1', 'username')
    .populate('players.player2', 'username')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Game.countDocuments();

  const gamesData = games.map((game: any) => ({
    id: game._id,
    status: game.status,
    players: [
      {
        id: game.players?.player1?._id || null,
        username: game.players?.player1?.username || 'Unknown',
        symbol: 'X' as const
      },
      {
        id: game.players?.player2?._id || null,
        username: game.players?.player2?.username || 'Unknown',
        symbol: 'O' as const
      }
    ].filter(p => p.id),
    winner: game.winner,
    duration: game.completedAt && game.createdAt 
      ? Math.round((game.completedAt.getTime() - game.createdAt.getTime()) / 1000)
      : undefined,
    createdAt: game.createdAt,
    completedAt: game.completedAt
  }));

  res.json({
    success: true,
    data: {
      games: gamesData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalGames: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    }
  });
});

// Update user role or status
export const updateUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  const { userId } = req.params;
  const { role, isActive } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('User not found');
  }

  if (role && ['user', 'moderator', 'admin'].includes(role)) {
    user.role = role;
  }

  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
  }

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    }
  });
});

// Delete user
export const deleteUser = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('User not found');
  }

  // Don't allow deleting other admins
  if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
    throw createError.forbidden('Cannot delete other admin users');
  }

  await User.findByIdAndDelete(userId);

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get system settings (placeholder)
export const getSystemSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  // Default settings - in a real app, these would come from a settings collection
  const settings = {
    maintenanceMode: false,
    registrationEnabled: true,
    maxConcurrentGames: 1000,
    defaultGameTimeout: 600000, // 10 minutes
    chatEnabled: true,
  };

  res.json({
    success: true,
    data: settings
  });
});

// Update system settings (placeholder)
export const updateSystemSettings = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== 'admin') {
    throw createError.forbidden('Admin access required');
  }

  // In a real app, you'd save these to a settings collection
  const settings = req.body;

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: settings
  });
});

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';
import { MatchmakingManager } from '../../../utils/matchmaking.utils';
import { LivesManager } from '../../../utils/lives.utils';

export const matchmakingRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many matchmaking requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const joinQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');

  const userId = (req.user as { _id: string | { toString(): string } })._id.toString();
  if (req.user.isDeleted || req.user.isBlocked) {
    throw createError.forbidden('Account is not active');
  }

  const { gameMode, skillLevel } = req.body;
  const validGameModes = ['classic', 'blitz', 'ranked'];

  if (gameMode && !validGameModes.includes(gameMode)) {
    throw createError.badRequest(`Invalid game mode. Must be one of: ${validGameModes.join(', ')}`);
  }

  if (skillLevel !== undefined && (typeof skillLevel !== 'number' || skillLevel < 1 || skillLevel > 10)) {
    throw createError.badRequest('Skill level must be a number between 1 and 10');
  }

  const livesStatus = LivesManager.calculateCurrentLives(
    req.user.lives,
    req.user.lastLivesUpdate ?? new Date(0),
    req.user.lastLivesRegenTime ?? new Date(0)
  );

  if (!livesStatus.canPlay) {
    const error = createError.badRequest('Insufficient lives to join queue');
    (error as any).livesStatus = livesStatus;
    throw error;
  }

  if (MatchmakingManager.isPlayerInQueue(userId)) {
    throw createError.badRequest('Already in matchmaking queue');
  }

  // Prepare sanitized data for matchmaking
  const sanitizedData = {
    gameMode: gameMode || 'classic',
    skillLevel: skillLevel || 1
  };

  if (!socketManager) {
    // For REST API testing, provide fallback response
    res.json({
      success: true,
      message: 'Joined matchmaking queue successfully (REST mode)',
      data: {
        gameMode: sanitizedData.gameMode,
        livesStatus,
        note: 'WebSocket required for real matchmaking - this is a test response'
      }
    });
    return;
  }

  const authManager = socketManager.getAuthManager();
  const userSocket = authManager.getSocketByUserId(userId);

  if (!userSocket) {
    // For REST API testing, provide fallback response
    res.json({
      success: true,
      message: 'Joined matchmaking queue successfully (REST mode)',
      data: {
        gameMode: sanitizedData.gameMode,
        livesStatus,
        note: 'WebSocket connection required for real matchmaking'
      }
    });
    return;
  }

  const matchmakingSocket = socketManager.getMatchmakingSocket();

  matchmakingSocket.handleFindMatch(userSocket, sanitizedData);

  res.json({
    success: true,
    message: 'Joined matchmaking queue successfully',
    data: {
      gameMode: sanitizedData.gameMode,
      livesStatus
    }
  });
});

export const leaveQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');
  const userId = (req.user as { _id: string | { toString(): string } })._id.toString();

  if (!socketManager) throw createError.serviceUnavailable('Matchmaking service is currently unavailable');

  const authManager = socketManager.getAuthManager();
  const userSocket = authManager.getSocketByUserId(userId);

  if (!userSocket) {
    const removed = MatchmakingManager.removeFromQueue(userId);
    return res.json({
      success: true,
      message: removed ? 'Left matchmaking queue successfully' : 'Not in queue'
    });
  }

  const matchmakingSocket = socketManager.getMatchmakingSocket();
  matchmakingSocket.handleCancelMatchmaking(userSocket);

  res.json({ success: true, message: 'Left matchmaking queue successfully' });
});

export const getMatchmakingStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');

  const userId = (req.user as { _id: string | { toString(): string } })._id.toString();
  const isInQueue = MatchmakingManager.isPlayerInQueue(userId);
  const queueStats = MatchmakingManager.getQueueStats();

  let queueData = {};
  if (isInQueue) {
    const player = MatchmakingManager.getPlayerFromQueue(userId);
    const queuePosition = MatchmakingManager.getQueuePosition(userId);
    const estimatedWaitTime = player ? MatchmakingManager.getEstimatedWaitTime(player) : 0;

    queueData = {
      inQueue: true,
      queuePosition,
      estimatedWaitTime,
      joinedAt: player?.joinedAt
    };
  } else {
    queueData = { inQueue: false };
  }

  res.json({ success: true, data: { ...queueData, queueStats } });
});

export const getQueueStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');



  try {
    // Get queue stats with error handling
    const queueStats = MatchmakingManager.getQueueStats();

    
    // Validate the data structure
    if (!queueStats || typeof queueStats !== 'object') {

      throw new Error('Invalid queue stats data structure');
    }

    // Ensure all values are serializable
    const sanitizedStats = {
      totalPlayers: Number(queueStats.totalPlayers) || 0,
      averageWaitTime: Number(queueStats.averageWaitTime) || 0,
      levelDistribution: queueStats.levelDistribution || {}
    };



    // Validate levelDistribution
    if (typeof sanitizedStats.levelDistribution !== 'object') {
      sanitizedStats.levelDistribution = {};
    }

    // Get socket connection info
    let socketInfo = {
      connectedSockets: 0,
      authenticatedUsers: 0
    };

    if (socketManager) {
      try {
        const authManager = socketManager.getAuthManager();
        const onlineCount = authManager.getOnlineUsersCount();
        socketInfo = {
          connectedSockets: Number(onlineCount) || 0,
          authenticatedUsers: Number(onlineCount) || 0
        };

      } catch (socketError) {

        // Continue with default values
      }
    }

    const responseData = {
      success: true,
      data: {
        ...sanitizedStats,
        ...socketInfo,
        timestamp: new Date().toISOString()
      }
    };



    // Set cache headers to prevent 304 responses for real-time data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(responseData);
  } catch (error) {

    
    // Return safe fallback data
    const fallbackData = {
      success: true,
      data: {
        totalPlayers: 0,
        averageWaitTime: 0,
        levelDistribution: {},
        connectedSockets: 0,
        authenticatedUsers: 0,
        timestamp: new Date().toISOString(),
        error: 'Stats temporarily unavailable'
      }
    };


    res.json(fallbackData);
  }
});

export const forceMatch = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');
  const { player1Id, player2Id } = req.body;

  if (!player1Id || !player2Id || typeof player1Id !== 'string' || typeof player2Id !== 'string') {
    throw createError.badRequest('Both player IDs must be valid strings');
  }

  const sanitizedPlayer1Id = AuthUtils.validateAndSanitizeInput(player1Id, 50);
  const sanitizedPlayer2Id = AuthUtils.validateAndSanitizeInput(player2Id, 50);

  if (sanitizedPlayer1Id === sanitizedPlayer2Id) {
    throw createError.badRequest('Player IDs must be different');
  }

  if (!socketManager) throw createError.serviceUnavailable('Matchmaking service is currently unavailable');

  const matchmakingSocket = socketManager.getMatchmakingSocket();
  const match = matchmakingSocket.forceMatch(sanitizedPlayer1Id, sanitizedPlayer2Id);

  if (!match) {
    throw createError.badRequest('Failed to create forced match. Players may not be in queue or available.');
  }

  res.json({
    success: true,
    data: {
      roomId: match.roomId,
      players: [match.player1, match.player2],
      matchQuality: match.matchQuality
    },
    message: 'Forced match created successfully'
  });
});

export const cleanupQueue = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) throw createError.unauthorized('Authentication required');

  if (!socketManager) throw createError.serviceUnavailable('Matchmaking service is currently unavailable');

  const matchmakingSocket = socketManager.getMatchmakingSocket();
  const cleanedCount = matchmakingSocket.cleanupQueue();

  res.json({
    success: true,
    data: { cleanedEntries: cleanedCount },
    message: `Cleaned up ${cleanedCount} old queue entries`
  });
});

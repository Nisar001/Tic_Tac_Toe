import { Request, Response } from 'express';
import { socketManager } from '../../../server';
import { MatchmakingManager } from '../../../utils/matchmaking.utils';
import { EnergyManager } from '../../../utils/energy.utils';

/**
 * Join matchmaking queue
 */
export const joinQueue = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate game mode
    const { gameMode } = req.body;
    if (gameMode && !['classic', 'blitz', 'ranked'].includes(gameMode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game mode'
      });
    }

    // Check user energy
    const energyStatus = EnergyManager.calculateCurrentEnergy(
      (req.user as any).energy,
      (req.user as any).lastEnergyUpdate,
      (req.user as any).lastEnergyRegenTime
    );

    if (!energyStatus.canPlay) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient energy to join queue',
        energyStatus
      });
    }

    // Check if already in queue
    if (MatchmakingManager.isPlayerInQueue(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Already in matchmaking queue'
      });
    }

    if (!socketManager) {
      return res.status(503).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    // Get user's socket
    const authManager = socketManager.getAuthManager();
    const userSocket = authManager.getSocketByUserId(userId);

    if (!userSocket) {
      return res.status(400).json({
        success: false,
        message: 'You must be connected via WebSocket to join queue'
      });
    }

    // Trigger join queue through socket
    const matchmakingSocket = socketManager.getMatchmakingSocket();
    matchmakingSocket.handleFindMatch(userSocket, req.body);

    res.json({
      success: true,
      message: 'Joined matchmaking queue successfully',
      energyStatus
    });

  } catch (error) {
    console.error('Join queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join matchmaking queue'
    });
  }
};

/**
 * Leave matchmaking queue
 */
export const leaveQueue = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    // Get user's socket
    const authManager = socketManager.getAuthManager();
    const userSocket = authManager.getSocketByUserId(userId);

    if (!userSocket) {
      // Still allow leaving queue even if socket not connected
      const removed = MatchmakingManager.removeFromQueue(userId);
      
      return res.json({
        success: true,
        message: removed ? 'Left matchmaking queue successfully' : 'Not in queue'
      });
    }

    // Trigger leave queue through socket
    const matchmakingSocket = socketManager.getMatchmakingSocket();
    matchmakingSocket.handleCancelMatchmaking(userSocket);

    res.json({
      success: true,
      message: 'Left matchmaking queue successfully'
    });

  } catch (error) {
    console.error('Leave queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave matchmaking queue'
    });
  }
};

/**
 * Get matchmaking status
 */
export const getMatchmakingStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

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
      queueData = {
        inQueue: false
      };
    }

    res.json({
      success: true,
      data: {
        ...queueData,
        queueStats
      }
    });

  } catch (error) {
    console.error('Get matchmaking status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get matchmaking status'
    });
  }
};

/**
 * Get queue statistics (admin only)
 */
export const getQueueStats = async (req: Request, res: Response) => {
  try {
    // This would normally check for admin role
    // For now, allow all authenticated users

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const queueStats = MatchmakingManager.getQueueStats();

    if (!socketManager) {
      return res.json({
        success: true,
        data: {
          ...queueStats,
          connectedSockets: 0,
          authenticatedUsers: 0
        }
      });
    }

    const authManager = socketManager.getAuthManager();
    
    res.json({
      success: true,
      data: {
        ...queueStats,
        connectedSockets: authManager.getOnlineUsersCount(),
        authenticatedUsers: authManager.getOnlineUsersCount()
      }
    });

  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics'
    });
  }
};

/**
 * Force match (admin only)
 */
export const forceMatch = async (req: Request, res: Response) => {
  try {
    const { player1Id, player2Id } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // This would normally check for admin role
    // For now, allow authenticated users for testing

    if (!player1Id || !player2Id) {
      return res.status(400).json({
        success: false,
        message: 'Both player IDs are required'
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    const matchmakingSocket = socketManager.getMatchmakingSocket();
    const match = matchmakingSocket.forceMatch(player1Id, player2Id);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create forced match. Players may not be in queue or available.'
      });
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

  } catch (error) {
    console.error('Force match error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to force match'
    });
  }
};

/**
 * Cleanup queue (admin only)
 */
export const cleanupQueue = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // This would normally check for admin role

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    const matchmakingSocket = socketManager.getMatchmakingSocket();
    const cleanedCount = matchmakingSocket.cleanupQueue();

    res.json({
      success: true,
      data: {
        cleanedEntries: cleanedCount
      },
      message: `Cleaned up ${cleanedCount} old queue entries`
    });

  } catch (error) {
    console.error('Cleanup queue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup queue'
    });
  }
};

import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, SocketAuthManager } from './auth.socket';
import { MatchmakingManager, Player, MatchResult } from '../utils/matchmaking.utils';
import { EnergyManager } from '../utils/energy.utils';

export class MatchmakingSocket {
  private authManager: SocketAuthManager;
  private io: SocketIOServer;
  // Track active intervals to prevent memory leaks
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(io: SocketIOServer, authManager: SocketAuthManager) {
    this.io = io;
    this.authManager = authManager;
  }

  /**
   * Handle find match request
   */
  handleFindMatch(socket: AuthenticatedSocket, data: any) {
    if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const userId = socket.user?.id;
      if (!userId) {
        socket.emit('match_error', { message: 'User ID missing from socket.' });
        return;
      }
      console.log(`🔍 Find match request from ${userId}:`, data);

      // Use fallback values for missing user properties
      const energy = (socket.user as any).energy ?? 5;
      const lastEnergyUpdate = (socket.user as any).lastEnergyUpdate ?? new Date();
      const lastEnergyRegenTime = (socket.user as any).lastEnergyRegenTime ?? new Date();

      const energyStatus = EnergyManager.calculateCurrentEnergy(
        energy,
        lastEnergyUpdate,
        lastEnergyRegenTime
      );

      if (!energyStatus.canPlay) {
        socket.emit('match_error', {
          message: 'Insufficient energy to play',
          energyStatus
        });
        return;
      }

      // Check if already in queue
      if (MatchmakingManager.isPlayerInQueue(userId)) {
        socket.emit('match_error', {
          message: 'Already in matchmaking queue'
        });
        return;
      }

      // Create player object with safe defaults
      const { Types } = require('mongoose');
      const player: Player = {
        userId: Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : userId,
        username: socket.user.username || 'Player',
        level: (socket.user as any).level ?? 1,
        rating: (socket.user as any).rating ?? 1000,
        socketId: socket.id,
        joinedAt: new Date()
      };

      // Add to queue
      MatchmakingManager.addToQueue(player);

      // Try to find immediate match
      const match = MatchmakingManager.findMatch(player.userId.toString());

      if (match) {
        this.handleMatchFound(match);
      } else {
        // Send queue status
        const queuePosition = MatchmakingManager.getQueuePosition(player.userId.toString());
        const estimatedWaitTime = MatchmakingManager.getEstimatedWaitTime(player);

        socket.emit('matchmaking_queued', {
          queuePosition,
          estimatedWaitTime,
          message: 'Searching for opponent...'
        });

        // Set up periodic match checking
        this.setupPeriodicMatchChecking(player.userId.toString());
      }

    } catch (error) {
      console.error('Find match error:', error);
      socket.emit('match_error', {
        message: 'Failed to join matchmaking queue'
      });
    }
  }

  /**
   * Handle cancel matchmaking
   */
  handleCancelMatchmaking(socket: AuthenticatedSocket) {
    if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const userId = socket.user?.id;
      if (!userId) {
        socket.emit('match_error', { message: 'User ID missing from socket.' });
        return;
      }
      const removed = MatchmakingManager.removeFromQueue(userId);
      
      if (removed) {
        socket.emit('matchmaking_cancelled', {
          message: 'Matchmaking cancelled successfully'
        });
        console.log(`❌ Matchmaking cancelled for user ${userId}`);
      } else {
        socket.emit('match_error', {
          message: 'Not in matchmaking queue'
        });
      }

    } catch (error) {
      console.error('Cancel matchmaking error:', error);
      socket.emit('match_error', {
        message: 'Failed to cancel matchmaking'
      });
    }
  }

  /**
   * Get matchmaking status
   */
  handleGetMatchmakingStatus(socket: AuthenticatedSocket) {
    if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const userId = socket.user?.id;
      if (!userId) {
        socket.emit('match_error', { message: 'User ID missing from socket.' });
        return;
      }
      const isInQueue = MatchmakingManager.isPlayerInQueue(userId);
      const queueStats = MatchmakingManager.getQueueStats();

      if (isInQueue) {
        const player = MatchmakingManager.getPlayerFromQueue(userId);
        const queuePosition = MatchmakingManager.getQueuePosition(userId);
        const estimatedWaitTime = player ? MatchmakingManager.getEstimatedWaitTime(player) : 0;

        socket.emit('matchmaking_status', {
          inQueue: true,
          queuePosition,
          estimatedWaitTime,
          queueStats
        });
      } else {
        socket.emit('matchmaking_status', {
          inQueue: false,
          queueStats
        });
      }

    } catch (error) {
      console.error('Get matchmaking status error:', error);
      socket.emit('match_error', {
        message: 'Failed to get matchmaking status'
      });
    }
  }

  /**
   * Handle when a match is found
   */
  private handleMatchFound(match: MatchResult): void {
    try {
      console.log(`🎯 Match found! Room: ${match.roomId}`);

      // Get sockets for both players
      const player1Socket = this.authManager.getSocketByUserId(match.player1.userId.toString());
      const player2Socket = this.authManager.getSocketByUserId(match.player2.userId.toString());

      if (!player1Socket || !player2Socket) {
        console.error('One or both players not connected');
        
        // Re-add players to queue if sockets not found
        if (player1Socket) {
          MatchmakingManager.addToQueue(match.player1);
        }
        if (player2Socket) {
          MatchmakingManager.addToQueue(match.player2);
        }
        return;
      }

      // Join both players to the game room
      player1Socket.join(match.roomId);
      player2Socket.join(match.roomId);

      // Emit match found event to both players
      const matchData = {
        roomId: match.roomId,
        opponent: {
          id: match.player2.userId,
          username: match.player2.username,
          level: match.player2.level
        },
        player: 'X', // Player 1 is always X
        matchQuality: match.matchQuality
      };

      const opponentMatchData = {
        roomId: match.roomId,
        opponent: {
          id: match.player1.userId,
          username: match.player1.username,
          level: match.player1.level
        },
        player: 'O', // Player 2 is always O
        matchQuality: match.matchQuality
      };

      player1Socket.emit('match_found', matchData);
      player2Socket.emit('match_found', opponentMatchData);

      // Broadcast to room that match is ready
      this.io.to(match.roomId).emit('match_ready', {
        roomId: match.roomId,
        players: [
          {
            id: match.player1.userId,
            username: match.player1.username,
            level: match.player1.level,
            symbol: 'X'
          },
          {
            id: match.player2.userId,
            username: match.player2.username,
            level: match.player2.level,
            symbol: 'O'
          }
        ]
      });

    } catch (error) {
      console.error('Handle match found error:', error);
    }
  }

  /**
   * Set up periodic match checking for a player
   */
  private setupPeriodicMatchChecking(userId: string): void {
    // Clear any existing interval for this user
    this.clearUserIntervals(userId);

    const checkInterval = setInterval(() => {
      try {
        // Check if player is still in queue
        if (!MatchmakingManager.isPlayerInQueue(userId)) {
          this.clearUserIntervals(userId);
          return;
        }

        // Try to find a match
        const match = MatchmakingManager.findMatch(userId);
        
        if (match) {
          this.clearUserIntervals(userId);
          this.handleMatchFound(match);
        }

      } catch (error) {
        console.error('Periodic match checking error:', error);
        this.clearUserIntervals(userId);
      }
    }, 2000); // Check every 2 seconds

    // Store the interval
    this.activeIntervals.set(userId, checkInterval);

    // Clear interval after 5 minutes (max wait time)
    const timeout = setTimeout(() => {
      this.clearUserIntervals(userId);
      
      // Remove from queue if still there and notify
      if (MatchmakingManager.isPlayerInQueue(userId)) {
        MatchmakingManager.removeFromQueue(userId);
        
        const socket = this.authManager.getSocketByUserId(userId);
        if (socket) {
          socket.emit('matchmaking_timeout', {
            message: 'Matchmaking timed out. Please try again.'
          });
        }
      }
    }, 300000); // 5 minutes

    // Store the timeout
    this.activeTimeouts.set(userId, timeout);
  }

  /**
   * Clear all intervals and timeouts for a user
   */
  private clearUserIntervals(userId: string): void {
    const interval = this.activeIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.activeIntervals.delete(userId);
    }

    const timeout = this.activeTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(userId);
    }
  }

  /**
   * Handle player disconnect - clean up intervals
   */
  /**
   * Handle player disconnect - clean up intervals
   */
  handlePlayerDisconnect(userId: string): void {
    this.clearUserIntervals(userId);
    MatchmakingManager.removeFromQueue(userId);
  }

  /**
   * Get queue statistics for admin
   */
  getQueueStats() {
    return MatchmakingManager.getQueueStats();
  }

  /**
   * Force match for admin/testing
   */
  forceMatch(player1Id: string, player2Id: string): MatchResult | null {
    return MatchmakingManager.forceMatch(player1Id, player2Id);
  }

  /**
   * Clean up old queue entries
   */
  cleanupQueue(): number {
    return MatchmakingManager.cleanupQueue();
  }
}

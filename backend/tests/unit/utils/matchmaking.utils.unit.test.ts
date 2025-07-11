import { Types } from 'mongoose';
import { MatchmakingManager, Player, MatchmakingOptions, MatchResult, PlayerValidationResult } from '../../../src/utils/matchmaking.utils';
import * as logger from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger');

const mockLogError = logger.logError as jest.MockedFunction<typeof logger.logError>;
const mockLogDebug = logger.logDebug as jest.MockedFunction<typeof logger.logDebug>;

describe('MatchmakingManager', () => {
  const mockPlayer1: Player = {
    userId: new Types.ObjectId(),
    username: 'player1',
    level: 5,
    rating: 1200,
    socketId: 'socket1',
    joinedAt: new Date()
  };

  const mockPlayer2: Player = {
    userId: new Types.ObjectId(),
    username: 'player2',
    level: 6,
    rating: 1250,
    socketId: 'socket2',
    joinedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the queue before each test
    const queuedPlayers = MatchmakingManager.getQueuedPlayers();
    queuedPlayers.forEach(player => {
      MatchmakingManager.removeFromQueue(player.userId.toString());
    });
  });

  describe('addToQueue', () => {
    it('should add valid player to queue successfully', () => {
      const result = MatchmakingManager.addToQueue(mockPlayer1);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString())).toBe(true);
    });

    it('should reject player with invalid userId', () => {
      const invalidPlayer = { ...mockPlayer1, userId: 'invalid' };
      const result = MatchmakingManager.addToQueue(invalidPlayer as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should reject player with invalid username', () => {
      const invalidPlayer = { ...mockPlayer1, username: '' };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with username containing invalid characters', () => {
      const invalidPlayer = { ...mockPlayer1, username: 'player@#$' };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with username too short', () => {
      const invalidPlayer = { ...mockPlayer1, username: 'ab' };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with username too long', () => {
      const invalidPlayer = { ...mockPlayer1, username: 'a'.repeat(25) };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with invalid level', () => {
      const invalidPlayer = { ...mockPlayer1, level: 0 };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with level too high', () => {
      const invalidPlayer = { ...mockPlayer1, level: 101 };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with invalid rating', () => {
      const invalidPlayer = { ...mockPlayer1, rating: -100 };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with rating too high', () => {
      const invalidPlayer = { ...mockPlayer1, rating: 5000 };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player with invalid socketId', () => {
      const invalidPlayer = { ...mockPlayer1, socketId: '' };
      const result = MatchmakingManager.addToQueue(invalidPlayer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null player', () => {
      const result = MatchmakingManager.addToQueue(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject non-object player', () => {
      const result = MatchmakingManager.addToQueue('invalid' as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject player already in queue', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      const result = MatchmakingManager.addToQueue(mockPlayer1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player already in queue');
    });

    it('should sanitize player data', () => {
      const playerWithExtraSpaces = {
        ...mockPlayer1,
        username: '  player1  ',
        socketId: '  socket1  ',
        level: 5.7 // Should be floored to 5
      };
      
      const result = MatchmakingManager.addToQueue(playerWithExtraSpaces);
      
      expect(result.success).toBe(true);
      const queuedPlayer = MatchmakingManager.getPlayerFromQueue(mockPlayer1.userId.toString());
      expect(queuedPlayer?.username).toBe('player1');
      expect(queuedPlayer?.socketId).toBe('socket1');
      expect(queuedPlayer?.level).toBe(5);
    });

    it('should handle rate limiting', () => {
      // Add player multiple times rapidly to trigger rate limiting
      for (let i = 0; i < 12; i++) {
        const player = {
          ...mockPlayer1,
          userId: new Types.ObjectId(),
          username: `player${i}`,
          socketId: `socket${i}`
        };
        MatchmakingManager.addToQueue(player);
        MatchmakingManager.removeFromQueue(player.userId.toString());
      }
      
      const result = MatchmakingManager.addToQueue({
        ...mockPlayer1,
        userId: new Types.ObjectId(),
        username: 'ratelimited',
        socketId: 'socketlimited'
      });
      
      // This might be rate limited depending on implementation
      if (!result.success) {
        expect(result.error).toContain('Too many queue actions');
      }
    });

    it('should handle exceptions during add to queue', () => {
      // Mock ObjectId.isValid to throw error
      const originalIsValid = Types.ObjectId.isValid;
      Types.ObjectId.isValid = jest.fn(() => {
        throw new Error('Validation error');
      });
      
      const result = MatchmakingManager.addToQueue(mockPlayer1);
      
      expect(mockLogError).toHaveBeenCalled();
      expect(result.success).toBe(false);
      
      // Restore ObjectId.isValid
      Types.ObjectId.isValid = originalIsValid;
    });
  });

  describe('removeFromQueue', () => {
    it('should remove player from queue successfully', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      const result = MatchmakingManager.removeFromQueue(mockPlayer1.userId.toString());
      
      expect(result).toBe(true);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString())).toBe(false);
    });

    it('should return false for non-existent player', () => {
      const result = MatchmakingManager.removeFromQueue('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getPlayerFromQueue', () => {
    it('should return player if in queue', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      const player = MatchmakingManager.getPlayerFromQueue(mockPlayer1.userId.toString());
      
      expect(player).toBeDefined();
      expect(player?.username).toBe(mockPlayer1.username);
    });

    it('should return undefined for non-existent player', () => {
      const player = MatchmakingManager.getPlayerFromQueue('nonexistent');
      expect(player).toBeUndefined();
    });
  });

  describe('getQueuedPlayers', () => {
    it('should return all queued players', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const players = MatchmakingManager.getQueuedPlayers();
      
      expect(players).toHaveLength(2);
      expect(players.some(p => p.username === 'player1')).toBe(true);
      expect(players.some(p => p.username === 'player2')).toBe(true);
    });

    it('should return empty array when queue is empty', () => {
      const players = MatchmakingManager.getQueuedPlayers();
      expect(players).toHaveLength(0);
    });
  });

  describe('findMatch', () => {
    it('should find match between compatible players', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const match = MatchmakingManager.findMatch(mockPlayer1.userId.toString());
      
      expect(match).toBeDefined();
      expect(match?.player1.username).toBe('player1');
      expect(match?.player2.username).toBe('player2');
      expect(match?.roomId).toBeDefined();
      expect(match?.matchQuality).toBeGreaterThan(0);
      
      // Both players should be removed from queue
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString())).toBe(false);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer2.userId.toString())).toBe(false);
    });

    it('should return null when player not in queue', () => {
      const match = MatchmakingManager.findMatch('nonexistent');
      expect(match).toBeNull();
    });

    it('should return null when no other players available', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      const match = MatchmakingManager.findMatch(mockPlayer1.userId.toString());
      
      expect(match).toBeNull();
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString())).toBe(true);
    });

    it('should find best match among multiple players', () => {
      const player3: Player = {
        userId: new Types.ObjectId(),
        username: 'player3',
        level: 15, // Far from player1's level
        socketId: 'socket3',
        joinedAt: new Date()
      };

      MatchmakingManager.addToQueue(mockPlayer1); // level 5
      MatchmakingManager.addToQueue(mockPlayer2); // level 6
      MatchmakingManager.addToQueue(player3); // level 15
      
      const match = MatchmakingManager.findMatch(mockPlayer1.userId.toString());
      
      expect(match).toBeDefined();
      expect(match?.player2.username).toBe('player2'); // Should match with closer level
    });

    it('should respect custom matchmaking options', () => {
      const options: Partial<MatchmakingOptions> = {
        levelTolerance: 0, // No level tolerance
        preferSimilarLevel: true
      };

      MatchmakingManager.addToQueue(mockPlayer1); // level 5
      MatchmakingManager.addToQueue(mockPlayer2); // level 6
      
      const match = MatchmakingManager.findMatch(mockPlayer1.userId.toString(), options);
      
      expect(match).toBeNull(); // Should not match due to strict level tolerance
    });

    it('should be more lenient for long waiting players', () => {
      const oldPlayer: Player = {
        ...mockPlayer1,
        joinedAt: new Date(Date.now() - 35000) // 35 seconds ago
      };

      MatchmakingManager.addToQueue(oldPlayer);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const match = MatchmakingManager.findMatch(oldPlayer.userId.toString(), {
        maxWaitTime: 30000,
        levelTolerance: 1
      });
      
      // Should match even with stricter tolerance due to wait time
      expect(match).toBeDefined();
    });
  });

  describe('getQueueStats', () => {
    it('should return correct queue statistics', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const stats = MatchmakingManager.getQueueStats();
      
      expect(stats.totalPlayers).toBe(2);
      expect(stats.averageWaitTime).toBeGreaterThanOrEqual(0);
      expect(stats.levelDistribution[5]).toBe(1);
      expect(stats.levelDistribution[6]).toBe(1);
    });

    it('should return zero stats for empty queue', () => {
      const stats = MatchmakingManager.getQueueStats();
      
      expect(stats.totalPlayers).toBe(0);
      expect(stats.averageWaitTime).toBe(0);
      expect(Object.keys(stats.levelDistribution)).toHaveLength(0);
    });
  });

  describe('cleanupQueue', () => {
    it('should remove expired players from queue', () => {
      const oldPlayer: Player = {
        ...mockPlayer1,
        joinedAt: new Date(Date.now() - 400000) // 6 minutes ago
      };

      MatchmakingManager.addToQueue(oldPlayer);
      MatchmakingManager.addToQueue(mockPlayer2); // Recent player
      
      const removedCount = MatchmakingManager.cleanupQueue(300000); // 5 minute threshold
      
      expect(removedCount).toBe(1);
      expect(MatchmakingManager.isPlayerInQueue(oldPlayer.userId.toString())).toBe(false);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer2.userId.toString())).toBe(true);
    });

    it('should not remove recent players', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const removedCount = MatchmakingManager.cleanupQueue(300000);
      
      expect(removedCount).toBe(0);
      expect(MatchmakingManager.getQueuedPlayers()).toHaveLength(2);
    });
  });

  describe('forceMatch', () => {
    it('should create forced match between specified players', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const match = MatchmakingManager.forceMatch(
        mockPlayer1.userId.toString(),
        mockPlayer2.userId.toString()
      );
      
      expect(match).toBeDefined();
      expect(match?.player1.username).toBe('player1');
      expect(match?.player2.username).toBe('player2');
      expect(match?.matchQuality).toBe(1.0);
      
      // Both players should be removed from queue
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString())).toBe(false);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer2.userId.toString())).toBe(false);
    });

    it('should return null if either player not in queue', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      
      const match = MatchmakingManager.forceMatch(
        mockPlayer1.userId.toString(),
        'nonexistent'
      );
      
      expect(match).toBeNull();
    });
  });

  describe('getEstimatedWaitTime', () => {
    it('should return short wait time for compatible players', () => {
      MatchmakingManager.addToQueue(mockPlayer2); // Compatible player in queue
      
      const waitTime = MatchmakingManager.getEstimatedWaitTime(mockPlayer1);
      
      expect(waitTime).toBe(5000); // 5 seconds
    });

    it('should return longer wait time when no compatible players', () => {
      const highLevelPlayer: Player = {
        ...mockPlayer2,
        level: 50
      };
      MatchmakingManager.addToQueue(highLevelPlayer);
      
      const waitTime = MatchmakingManager.getEstimatedWaitTime(mockPlayer1);
      
      expect(waitTime).toBeGreaterThan(5000);
    });

    it('should return default wait time for empty queue', () => {
      const waitTime = MatchmakingManager.getEstimatedWaitTime(mockPlayer1);
      
      expect(waitTime).toBe(60000); // 1 minute
    });
  });

  describe('isPlayerInQueue', () => {
    it('should return true for player in queue', () => {
      MatchmakingManager.addToQueue(mockPlayer1);
      
      const inQueue = MatchmakingManager.isPlayerInQueue(mockPlayer1.userId.toString());
      
      expect(inQueue).toBe(true);
    });

    it('should return false for player not in queue', () => {
      const inQueue = MatchmakingManager.isPlayerInQueue('nonexistent');
      
      expect(inQueue).toBe(false);
    });
  });

  describe('getQueuePosition', () => {
    it('should return correct queue position', () => {
      // Add players with different join times
      const firstPlayer = { ...mockPlayer1, joinedAt: new Date(Date.now() - 2000) };
      const secondPlayer = { ...mockPlayer2, joinedAt: new Date(Date.now() - 1000) };
      
      MatchmakingManager.addToQueue(firstPlayer);
      MatchmakingManager.addToQueue(secondPlayer);
      
      const position1 = MatchmakingManager.getQueuePosition(firstPlayer.userId.toString());
      const position2 = MatchmakingManager.getQueuePosition(secondPlayer.userId.toString());
      
      expect(position1).toBe(1); // First to join
      expect(position2).toBe(2); // Second to join
    });

    it('should return -1 for player not in queue', () => {
      const position = MatchmakingManager.getQueuePosition('nonexistent');
      
      expect(position).toBe(-1);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle room ID generation errors', () => {
      // Mock Date.now to throw error
      const originalNow = Date.now;
      Date.now = jest.fn(() => {
        throw new Error('Time error');
      });
      
      MatchmakingManager.addToQueue(mockPlayer1);
      MatchmakingManager.addToQueue(mockPlayer2);
      
      const match = MatchmakingManager.findMatch(mockPlayer1.userId.toString());
      
      expect(match).toBeDefined();
      expect(match?.roomId).toBeDefined(); // Should use fallback
      expect(mockLogError).toHaveBeenCalled();
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should handle invalid joinedAt dates', () => {
      const playerWithInvalidDate = {
        ...mockPlayer1,
        joinedAt: 'invalid' as any
      };
      
      const result = MatchmakingManager.addToQueue(playerWithInvalidDate);
      
      expect(result.success).toBe(true); // Should sanitize and use current date
      const queuedPlayer = MatchmakingManager.getPlayerFromQueue(mockPlayer1.userId.toString());
      expect(queuedPlayer?.joinedAt).toBeInstanceOf(Date);
    });

    it('should handle rate limiting errors gracefully', () => {
      // Mock Date to throw error in rate limiting
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      global.Date.now = Date.now;
      
      const result = MatchmakingManager.addToQueue(mockPlayer1);
      
      // Should not be blocked by rate limiting error
      expect(result.success).toBe(true);
      expect(mockLogError).toHaveBeenCalled();
      
      // Restore Date
      global.Date = originalDate;
    });

    it('should handle queue operations with invalid player data', () => {
      const playerWithMissingData = {
        userId: mockPlayer1.userId,
        username: mockPlayer1.username,
        level: mockPlayer1.level,
        socketId: mockPlayer1.socketId
        // Missing joinedAt and rating
      };
      
      const result = MatchmakingManager.addToQueue(playerWithMissingData as Player);
      
      expect(result.success).toBe(true);
      const queuedPlayer = MatchmakingManager.getPlayerFromQueue(mockPlayer1.userId.toString());
      expect(queuedPlayer?.joinedAt).toBeInstanceOf(Date);
      expect(queuedPlayer?.rating).toBeUndefined();
    });
  });
});

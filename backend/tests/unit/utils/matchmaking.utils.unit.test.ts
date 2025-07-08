// Unit tests for matchmaking.utils.ts
import { MatchmakingManager, Player, MatchmakingOptions, MatchResult } from '../../../src/utils/matchmaking.utils';
import { Types } from 'mongoose';

describe('MatchmakingManager', () => {
  const mockPlayer: Player = {
    userId: new Types.ObjectId(),
    username: 'Player1',
    level: 5,
    socketId: 'socket1',
    joinedAt: new Date()
  };

  const mockPlayer2: Player = {
    userId: new Types.ObjectId(),
    username: 'Player2',
    level: 6,
    socketId: 'socket2',
    joinedAt: new Date()
  };

  beforeEach(() => {
    MatchmakingManager.cleanupQueue();
  });

  describe('addToQueue', () => {
    it('should add a player to the queue', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer.userId.toString())).toBe(true);
    });
  });

  describe('removeFromQueue', () => {
    it('should remove a player from the queue', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      const result = MatchmakingManager.removeFromQueue(mockPlayer.userId.toString());
      expect(result).toBe(true);
      expect(MatchmakingManager.isPlayerInQueue(mockPlayer.userId.toString())).toBe(false);
    });
  });

  describe('findMatch', () => {
    it('should find a match for a player', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      MatchmakingManager.addToQueue(mockPlayer2);
      const match = MatchmakingManager.findMatch(mockPlayer.userId.toString());
      expect(match).toBeDefined();
      expect(match?.player1).toEqual(mockPlayer);
      expect(match?.player2).toEqual(mockPlayer2);
    });

    it('should return null if no match is found', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      const match = MatchmakingManager.findMatch(mockPlayer.userId.toString());
      expect(match).toBeNull();
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      const stats = MatchmakingManager.getQueueStats();
      expect(stats.totalPlayers).toBe(1);
      expect(stats.averageWaitTime).toBeGreaterThan(0);
      expect(stats.levelDistribution[mockPlayer.level]).toBe(1);
    });
  });

  describe('cleanupQueue', () => {
    it('should clean up expired queue entries', () => {
      const oldPlayer = { ...mockPlayer, joinedAt: new Date(Date.now() - 600000) }; // 10 minutes ago
      MatchmakingManager.addToQueue(oldPlayer);
      const removedCount = MatchmakingManager.cleanupQueue();
      expect(removedCount).toBe(1);
      expect(MatchmakingManager.isPlayerInQueue(oldPlayer.userId.toString())).toBe(false);
    });
  });

  describe('forceMatch', () => {
    it('should force a match between two players', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      MatchmakingManager.addToQueue(mockPlayer2);
      const match = MatchmakingManager.forceMatch(mockPlayer.userId.toString(), mockPlayer2.userId.toString());
      expect(match).toBeDefined();
      expect(match?.player1).toEqual(mockPlayer);
      expect(match?.player2).toEqual(mockPlayer2);
    });
  });

  describe('getEstimatedWaitTime', () => {
    it('should estimate wait time for a player', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      const waitTime = MatchmakingManager.getEstimatedWaitTime(mockPlayer);
      expect(waitTime).toBeGreaterThan(0);
    });
  });

  describe('getQueuePosition', () => {
    it('should return the queue position of a player', () => {
      MatchmakingManager.addToQueue(mockPlayer);
      const position = MatchmakingManager.getQueuePosition(mockPlayer.userId.toString());
      expect(position).toBe(1);
    });
  });
});

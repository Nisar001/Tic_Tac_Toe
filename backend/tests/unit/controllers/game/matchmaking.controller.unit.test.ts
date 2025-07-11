import { Request, Response } from 'express';
import { joinQueue, leaveQueue, getMatchmakingStatus, getQueueStats, forceMatch, cleanupQueue, matchmakingRateLimit } from '../../../../src/modules/game/controllers/matchmaking.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { createError } from '../../../../src/middlewares/error.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { socketManager } from '../../../../src/server';
import { MatchmakingManager } from '../../../../src/utils/matchmaking.utils';
import { EnergyManager } from '../../../../src/utils/energy.utils';

// Mock dependencies
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    unauthorized: jest.fn((message: string) => new Error(message)),
    forbidden: jest.fn((message: string) => new Error(message)),
    badRequest: jest.fn((message: string) => new Error(message)),
    serviceUnavailable: jest.fn((message: string) => new Error(message)),
    conflict: jest.fn((message: string) => new Error(message))
  }
}));

jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/server', () => ({
  socketManager: {
    getMatchmakingSocket: jest.fn()
  }
}));
jest.mock('../../../../src/utils/matchmaking.utils');
jest.mock('../../../../src/utils/energy.utils');

const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;
const mockMatchmakingManager = MatchmakingManager as jest.Mocked<typeof MatchmakingManager>;
const mockEnergyManager = EnergyManager as jest.Mocked<typeof EnergyManager>;

describe('Matchmaking Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockMatchmakingSocket: any;
  let mockAuthManager: any;
  let mockUserSocket: any;

  const mockUser = {
    _id: { toString: () => 'user123' },
    username: 'testuser',
    email: 'test@example.com',
    isDeleted: false,
    isBlocked: false,
    level: 5,
    xp: 1500,
    energy: 80
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser,
      body: {},
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup mocks
    mockUserSocket = { id: 'socket123', userId: 'user123' };
    
    mockAuthManager = {
      getSocketByUserId: jest.fn().mockReturnValue(mockUserSocket),
      getOnlineUsersCount: jest.fn().mockReturnValue(10)
    };

    mockMatchmakingSocket = {
      handleFindMatch: jest.fn(),
      handleCancelMatchmaking: jest.fn(),
      addToQueue: jest.fn().mockResolvedValue(true),
      removeFromQueue: jest.fn().mockResolvedValue(true),
      isUserInQueue: jest.fn().mockReturnValue(false),
      getQueuePosition: jest.fn().mockReturnValue(1),
      getEstimatedWaitTime: jest.fn().mockReturnValue(30),
      getQueueStats: jest.fn().mockReturnValue({
        totalInQueue: 5,
        averageWaitTime: 45,
        activeMatches: 10
      })
    };

    mockSocketManager.getMatchmakingSocket.mockReturnValue(mockMatchmakingSocket);
    mockSocketManager.getAuthManager.mockReturnValue(mockAuthManager);
    mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
      currentEnergy: 5,
      maxEnergy: 10,
      nextRegenTime: null,
      timeUntilNextRegen: 0,
      canPlay: true
    });
  });

  describe('joinQueue', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error for invalid game mode', async () => {
      mockRequest.body = { gameMode: 'invalid' };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid game mode. Must be one of: classic, blitz, ranked');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid game mode. Must be one of: classic, blitz, ranked');
    });

    it('should throw error for invalid skill level', async () => {
      mockRequest.body = { skillLevel: 15 };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Skill level must be a number between 1 and 10');

      expect(createError.badRequest).toHaveBeenCalledWith('Skill level must be a number between 1 and 10');
    });

    it('should throw error when user does not have enough energy', async () => {
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 0,
        maxEnergy: 10,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 300000,
        canPlay: false
      });

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Insufficient energy to join queue');
    });

    it('should throw error when user is already in queue', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(true);

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Already in matchmaking queue');

      expect(createError.conflict).toHaveBeenCalledWith('Already in matchmaking queue');
    });

    it('should successfully join queue with default parameters', async () => {
      await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockEnergyManager.consumeEnergy).toHaveBeenCalledWith('user123', 10);
      expect(mockMatchmakingSocket.addToQueue).toHaveBeenCalledWith({
        userId: 'user123',
        username: 'testuser',
        gameMode: 'classic',
        skillLevel: 5,
        level: 5,
        xp: 1500
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully joined matchmaking queue',
        data: {
          gameMode: 'classic',
          skillLevel: 5,
          position: 1,
          estimatedWaitTime: 30,
          queueStats: expect.any(Object)
        }
      });
    });

    it('should successfully join queue with custom parameters', async () => {
      mockRequest.body = {
        gameMode: 'blitz',
        skillLevel: 7
      };

      await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockMatchmakingSocket.addToQueue).toHaveBeenCalledWith({
        userId: 'user123',
        username: 'testuser',
        gameMode: 'blitz',
        skillLevel: 7,
        level: 5,
        xp: 1500
      });
    });

    it('should handle valid game modes', async () => {
      const validModes = ['classic', 'blitz', 'ranked'];

      for (const gameMode of validModes) {
        mockRequest.body = { gameMode };
        
        await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockMatchmakingSocket.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({ gameMode })
        );
      }
    });

    it('should handle energy calculation error', async () => {
      mockEnergyManager.calculateCurrentEnergy.mockImplementation(() => {
        throw new Error('Energy calculation failed');
      });

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Energy calculation failed');
    });

    it('should handle socket manager unavailable', async () => {
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      const { joinQueue: joinQueueWithoutSocket } = await import('../../../../src/modules/game/controllers/matchmaking.controller');

      await expect(joinQueueWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Matchmaking service is currently unavailable');
    });
  });

  describe('leaveQueue', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(leaveQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when user is not in queue', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(false);

      await expect(leaveQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Not currently in matchmaking queue');

      expect(createError.badRequest).toHaveBeenCalledWith('Not currently in matchmaking queue');
    });

    it('should successfully leave queue', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(true);

      await leaveQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockMatchmakingSocket.removeFromQueue).toHaveBeenCalledWith('user123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully left matchmaking queue'
      });
    });

    it('should handle remove from queue failure', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(true);
      mockMatchmakingSocket.removeFromQueue.mockRejectedValue(new Error('Remove failed'));

      await expect(leaveQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to leave matchmaking queue');
    });
  });

  describe('getMatchmakingStatus', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getMatchmakingStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should return queue status when user is in queue', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(true);

      await getMatchmakingStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          inQueue: true,
          position: 1,
          estimatedWaitTime: 30,
          queueStats: expect.any(Object)
        }
      });
    });

    it('should return queue status when user is not in queue', async () => {
      mockMatchmakingSocket.isUserInQueue.mockReturnValue(false);

      await getMatchmakingStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          inQueue: false,
          queueStats: expect.any(Object)
        }
      });
    });

    it('should handle socket error gracefully', async () => {
      mockMatchmakingSocket.getQueueStats.mockImplementation(() => {
        throw new Error('Socket error');
      });

      await expect(getMatchmakingStatus(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to get queue status');
    });
  });

  describe('matchmakingRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(matchmakingRateLimit).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle skill level at boundaries', async () => {
      const boundaryLevels = [1, 10];

      for (const skillLevel of boundaryLevels) {
        mockRequest.body = { skillLevel };
        
        await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockMatchmakingSocket.addToQueue).toHaveBeenCalledWith(
          expect.objectContaining({ skillLevel })
        );
      }
    });

    it('should handle zero skill level', async () => {
      mockRequest.body = { skillLevel: 0 };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Skill level must be a number between 1 and 10');
    });

    it('should handle string skill level', async () => {
      mockRequest.body = { skillLevel: 'five' };

      await expect(joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Skill level must be a number between 1 and 10');
    });

    it('should use default skill level when none provided', async () => {
      mockRequest.body = { gameMode: 'classic' };

      await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockMatchmakingSocket.handleFindMatch).toHaveBeenCalledWith(
        mockUserSocket,
        expect.objectContaining({ 
          gameMode: 'classic',
          skillLevel: 1 // Default fallback
        })
      );
    });

    it('should handle energy edge case', async () => {
      mockRequest.user = { ...mockUser, energy: 10 }; // Exactly enough energy
      
      await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockEnergyManager.consumeEnergy).toHaveBeenCalledWith('user123', 10);
    });

    it('should handle queue position edge cases', async () => {
      mockMatchmakingSocket.getQueuePosition.mockReturnValue(0);

      await joinQueue(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            position: 0
          })
        })
      );
    });
  });
});

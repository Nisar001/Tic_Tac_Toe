import { Request, Response, NextFunction } from 'express';
import { forfeitGame } from '../../../../src/modules/game/controllers/forfeitGame.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../../../src/models/game.model');
jest.mock('../../../../src/server');

const Game = require('../../../../src/models/game.model');
const { socketManager } = require('../../../../src/server');

describe('ForfeitGame Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockGame: any;
  let mockSocketManager: any;

  beforeEach(() => {
    mockRequest = {
      params: { gameId: 'game123' },
      user: {
        _id: 'user123',
        username: 'testuser',
        isDeleted: false,
        isBlocked: false
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockGame = {
      _id: 'game123',
      players: [
        { user: 'user123', symbol: 'X' },
        { user: 'opponent', symbol: 'O' }
      ],
      status: 'IN_PROGRESS',
      winner: null,
      gameType: 'RANKED',
      save: jest.fn().mockResolvedValue(true)
    };

    mockSocketManager = {
      getGameSocket: jest.fn().mockReturnValue({
        handleGameForfeit: jest.fn()
      })
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Game model
    Game.findById = jest.fn().mockResolvedValue(mockGame);

    // Mock socketManager
    (socketManager as any) = mockSocketManager;
  });

  describe('forfeitGame function', () => {
    it('should forfeit game successfully', async () => {
      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(Game.findById).toHaveBeenCalledWith('game123');
      expect(mockGame.status).toBe('COMPLETED');
      expect(mockGame.winner).toBe('opponent');
      expect(mockGame.endTime).toBeInstanceOf(Date);
      expect(mockGame.forfeitedBy).toBe('user123');
      expect(mockGame.save).toHaveBeenCalled();

      expect(mockSocketManager.getGameSocket().handleGameForfeit).toHaveBeenCalledWith(mockGame);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Game forfeited successfully',
        data: {
          gameId: 'game123',
          forfeitedBy: 'user123',
          winner: 'opponent'
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when game ID is missing', async () => {
      mockRequest.params = {};

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game ID is required');
    });

    it('should throw error when game is not found', async () => {
      Game.findById.mockResolvedValue(null);

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game not found');
    });

    it('should throw error when user is not a player in the game', async () => {
      mockGame.players = [
        { user: 'otheruser1', symbol: 'X' },
        { user: 'otheruser2', symbol: 'O' }
      ];

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('You are not a player in this game');
    });

    it('should throw error when game is already completed', async () => {
      mockGame.status = 'COMPLETED';

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game is already completed');
    });

    it('should throw error when game is not in progress', async () => {
      mockGame.status = 'WAITING_FOR_PLAYER';

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game is not in progress');
    });

    it('should determine correct winner when first player forfeits', async () => {
      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockGame.winner).toBe('opponent');
    });

    it('should determine correct winner when second player forfeits', async () => {
      mockRequest.user!._id = 'opponent';
      mockGame.players = [
        { user: 'user123', symbol: 'X' },
        { user: 'opponent', symbol: 'O' }
      ];

      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockGame.winner).toBe('user123');
    });

    it('should handle socket manager not available', async () => {
      (socketManager as any) = null;

      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Should still complete the forfeit without socket notification
      expect(mockGame.status).toBe('COMPLETED');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should handle socket error gracefully', async () => {
      mockSocketManager.getGameSocket().handleGameForfeit.mockImplementation(() => {
        throw new Error('Socket error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('Socket error during game forfeit:', expect.any(Error));
      expect(mockResponse.json).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle account not active', async () => {
      mockRequest.user!.isDeleted = true;

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should set forfeit timestamp correctly', async () => {
      const beforeTime = new Date();

      await forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockGame.endTime).toBeInstanceOf(Date);
      expect(mockGame.endTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should handle database save error', async () => {
      mockGame.save.mockRejectedValue(new Error('Database error'));

      await expect(forfeitGame(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });
  });
});

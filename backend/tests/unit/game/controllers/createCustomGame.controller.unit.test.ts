import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createCustomGame, createCustomGameRateLimit } from '../../../../src/modules/game/controllers/createCustomGame.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { createError } from '../../../../src/middlewares/error.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { socketManager } from '../../../../src/server';

// Mock dependencies
jest.mock('express-rate-limit');
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    unauthorized: jest.fn((msg) => new Error(msg)),
    forbidden: jest.fn((msg) => new Error(msg)),
    badRequest: jest.fn((msg) => new Error(msg)),
    serviceUnavailable: jest.fn((msg) => new Error(msg)),
    notImplemented: jest.fn((msg) => new Error(msg)),
    internal: jest.fn((msg) => new Error(msg))
  }
}));
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/server', () => ({
  socketManager: {
    getGameSocket: jest.fn()
  }
}));

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('createCustomGame Controller', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockGameSocket: any;

  beforeEach(() => {
    mockGameSocket = {
      createCustomGame: jest.fn()
    };

    mockReq = {
      user: {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        isDeleted: false,
        isBlocked: false
      },
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    mockSocketManager.getGameSocket.mockReturnValue(mockGameSocket);
    mockAuthUtils.validateAndSanitizeInput.mockImplementation((input, maxLength) => 
      input.trim().substring(0, maxLength)
    );

    jest.clearAllMocks();
  });

  describe('createCustomGame', () => {
    it('should create a custom game successfully with valid config', async () => {
      const gameConfig = {
        gameMode: 'classic',
        isPrivate: false,
        maxPlayers: 4,
        timeLimit: 300,
        gameName: 'Test Game'
      };

      mockReq.body = { gameConfig };

      const mockGame = {
        id: 'game123',
        createdAt: new Date()
      };

      mockGameSocket.createCustomGame.mockReturnValue(mockGame);

      await createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockGameSocket.createCustomGame).toHaveBeenCalledWith(
        expect.objectContaining({
          gameMode: 'classic',
          isPrivate: false,
          maxPlayers: 4,
          timeLimit: 300,
          gameName: 'Test Game',
          creatorId: 'user123',
          creatorUsername: 'testuser',
          createdAt: expect.any(Date)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Custom game created successfully',
        data: {
          gameId: 'game123',
          gameConfig: expect.objectContaining({
            gameMode: 'classic',
            creatorId: 'user123'
          }),
          createdAt: expect.any(Date)
        }
      });
    });

    it('should throw unauthorized error when user is not authenticated', async () => {
      mockReq.user = undefined;

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw forbidden error when user account is deleted', async () => {
      mockReq.user!.isDeleted = true;

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw bad request error when gameConfig is missing', async () => {
      mockReq.body = {};

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Game configuration is required and must be an object');

      expect(createError.badRequest).toHaveBeenCalledWith('Game configuration is required and must be an object');
    });

    it('should validate game mode', async () => {
      mockReq.body = {
        gameConfig: {
          gameMode: 'invalid'
        }
      };

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Invalid game mode. Must be one of: classic, blitz, ranked, custom');
    });

    it('should validate maxPlayers range', async () => {
      mockReq.body = {
        gameConfig: {
          maxPlayers: 10 // exceeds maximum
        }
      };

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('maxPlayers must be a number between 2 and 8');
    });

    it('should validate timeLimit range', async () => {
      mockReq.body = {
        gameConfig: {
          timeLimit: 10 // below minimum
        }
      };

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('timeLimit must be a number between 30 and 3600 seconds');
    });

    it('should validate and sanitize game name', async () => {
      mockReq.body = {
        gameConfig: {
          gameName: 'ab' // too short
        }
      };

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Game name must be at least 3 characters long');
    });

    it('should set isPrivate to true when password is provided', async () => {
      mockReq.body = {
        gameConfig: {
          password: 'secretpass',
          isPrivate: false // should be overridden
        }
      };

      const mockGame = { id: 'game123', createdAt: new Date() };
      mockGameSocket.createCustomGame.mockReturnValue(mockGame);

      await createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockGameSocket.createCustomGame).toHaveBeenCalledWith(
        expect.objectContaining({
          isPrivate: true
        })
      );
    });

    it('should throw service unavailable when socketManager is not available', async () => {
      mockReq.body = { gameConfig: { gameMode: 'classic' } };
      
      // Mock socketManager as undefined
      (socketManager as any) = undefined;

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Game service is currently unavailable');
    });

    it('should throw internal error when game creation fails', async () => {
      mockReq.body = { gameConfig: { gameMode: 'classic' } };
      
      mockGameSocket.createCustomGame.mockReturnValue(null);

      await expect(createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext))
        .rejects.toThrow('Failed to create custom game');
    });

    it('should sanitize input using AuthUtils', async () => {
      const gameConfig = {
        gameName: '  Test Game  ',
        password: '  password123  '
      };

      mockReq.body = { gameConfig };
      mockAuthUtils.validateAndSanitizeInput
        .mockReturnValueOnce('Test Game')
        .mockReturnValueOnce('password123');

      const mockGame = { id: 'game123', createdAt: new Date() };
      mockGameSocket.createCustomGame.mockReturnValue(mockGame);

      await createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  Test Game  ', 50);
      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  password123  ', 50);
    });

    it('should accept all valid game modes', async () => {
      const validGameModes = ['classic', 'blitz', 'ranked', 'custom'];
      const mockGame = { id: 'game123', createdAt: new Date() };
      mockGameSocket.createCustomGame.mockReturnValue(mockGame);

      for (const gameMode of validGameModes) {
        jest.clearAllMocks();
        mockReq.body = { gameConfig: { gameMode } };

        await createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

        expect(mockGameSocket.createCustomGame).toHaveBeenCalledWith(
          expect.objectContaining({ gameMode })
        );
      }
    });

    it('should handle empty optional fields', async () => {
      mockReq.body = { gameConfig: {} }; // Empty config
      
      const mockGame = { id: 'game123', createdAt: new Date() };
      mockGameSocket.createCustomGame.mockReturnValue(mockGame);

      await createCustomGame(mockReq as AuthenticatedRequest, mockRes as Response, mockNext);

      expect(mockGameSocket.createCustomGame).toHaveBeenCalledWith(
        expect.objectContaining({
          creatorId: 'user123',
          creatorUsername: 'testuser',
          createdAt: expect.any(Date)
        })
      );

      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });
});

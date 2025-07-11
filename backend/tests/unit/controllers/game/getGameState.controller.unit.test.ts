import { Request, Response } from 'express';
import { getGameState, getGameStateRateLimit } from '../../../../src/modules/game/controllers/getGameState.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { createError } from '../../../../src/middlewares/error.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { socketManager } from '../../../../src/server';

// Mock dependencies
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    unauthorized: jest.fn((message: string) => new Error(message)),
    forbidden: jest.fn((message: string) => new Error(message)),
    badRequest: jest.fn((message: string) => new Error(message)),
    serviceUnavailable: jest.fn((message: string) => new Error(message)),
    notFound: jest.fn((message: string) => new Error(message))
  }
}));

jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/server', () => ({
  socketManager: {
    getGameSocket: jest.fn()
  }
}));

const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('GetGameState Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGameSocket: any;

  const mockUser = {
    _id: { toString: () => 'user123' },
    username: 'testuser',
    email: 'test@example.com',
    isDeleted: false,
    isBlocked: false
  };

  const mockGame = {
    id: 'game_room_123456',
    players: ['user123', 'user456'],
    spectators: [],
    state: 'in_progress',
    board: [['', '', ''], ['', '', ''], ['', '', '']],
    currentPlayer: 'user123',
    moves: 3,
    winner: null,
    createdAt: new Date(),
    lastMove: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser,
      params: { roomId: 'game_room_123456' },
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup mocks
    mockAuthUtils.validateAndSanitizeInput.mockImplementation((input) => input);
    
    mockGameSocket = {
      getActiveGames: jest.fn().mockReturnValue([mockGame]),
      isPlayerInGame: jest.fn().mockReturnValue(true),
      isSpectatorInGame: jest.fn().mockReturnValue(false)
    };

    mockSocketManager.getGameSocket.mockReturnValue(mockGameSocket);
  });

  describe('getGameState', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when room ID is missing', async () => {
      mockRequest.params = {};

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is not a string', async () => {
      mockRequest.params = { roomId: 123 as any };

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is too short after sanitization', async () => {
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('short');

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid room ID format');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid room ID format');
    });

    it('should throw error when socket manager is unavailable', async () => {
      // Create a version where socketManager is undefined
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      const { getGameState: getGameStateWithoutSocket } = await import('../../../../src/modules/game/controllers/getGameState.controller');

      await expect(getGameStateWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game service is currently unavailable');
    });

    it('should throw error when game is not found', async () => {
      mockGameSocket.getActiveGames.mockReturnValue([]);

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Game not found');

      expect(createError.notFound).toHaveBeenCalledWith('Game not found');
    });

    it('should throw error when user is not participant or spectator', async () => {
      mockGameSocket.isPlayerInGame.mockReturnValue(false);
      mockGameSocket.isSpectatorInGame.mockReturnValue(false);

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Access denied to this game');

      expect(createError.forbidden).toHaveBeenCalledWith('Access denied to this game');
    });

    it('should successfully get game state for player', async () => {
      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getGameSocket).toHaveBeenCalled();
      expect(mockGameSocket.getActiveGames).toHaveBeenCalled();
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          game: expect.objectContaining({
            id: mockGame.id,
            state: mockGame.state,
            board: mockGame.board,
            currentPlayer: mockGame.currentPlayer,
            moves: mockGame.moves,
            winner: mockGame.winner
          }),
          userRole: 'player',
          canMakeMove: true,
          gameHistory: expect.any(Array)
        }
      });
    });

    it('should successfully get game state for spectator', async () => {
      mockGameSocket.isPlayerInGame.mockReturnValue(false);
      mockGameSocket.isSpectatorInGame.mockReturnValue(true);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          game: expect.objectContaining({
            id: mockGame.id,
            state: mockGame.state,
            board: mockGame.board,
            currentPlayer: mockGame.currentPlayer
          }),
          userRole: 'spectator',
          canMakeMove: false,
          gameHistory: expect.any(Array)
        }
      });
    });

    it('should sanitize room ID input', async () => {
      mockRequest.params = { roomId: '  game_room_123456  ' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('game_room_123456');

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  game_room_123456  ', 50);
    });

    it('should handle finished game state', async () => {
      const finishedGame = {
        ...mockGame,
        state: 'finished',
        winner: 'user123',
        endedAt: new Date()
      };
      
      mockGameSocket.getActiveGames.mockReturnValue([finishedGame]);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          game: expect.objectContaining({
            state: 'finished',
            winner: 'user123'
          }),
          userRole: 'player',
          canMakeMove: false,
          gameHistory: expect.any(Array)
        }
      });
    });

    it('should handle game waiting for players', async () => {
      const waitingGame = {
        ...mockGame,
        state: 'waiting',
        players: ['user123'],
        currentPlayer: null
      };
      
      mockGameSocket.getActiveGames.mockReturnValue([waitingGame]);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          game: expect.objectContaining({
            state: 'waiting',
            currentPlayer: null
          }),
          userRole: 'player',
          canMakeMove: false,
          gameHistory: expect.any(Array)
        }
      });
    });

    it('should determine correct user turn for making moves', async () => {
      const gameWithUserTurn = {
        ...mockGame,
        currentPlayer: 'user123'
      };
      
      mockGameSocket.getActiveGames.mockReturnValue([gameWithUserTurn]);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            canMakeMove: true
          })
        })
      );
    });

    it('should determine when user cannot make move', async () => {
      const gameWithOpponentTurn = {
        ...mockGame,
        currentPlayer: 'user456'
      };
      
      mockGameSocket.getActiveGames.mockReturnValue([gameWithOpponentTurn]);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            canMakeMove: false
          })
        })
      );
    });
  });

  describe('getGameStateRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(getGameStateRateLimit).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle room ID at minimum length', async () => {
      mockRequest.params = { roomId: 'game123456' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('game123456');

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getGameSocket).toHaveBeenCalled();
    });

    it('should handle multiple games with same user', async () => {
      const multipleGames = [
        mockGame,
        {
          ...mockGame,
          id: 'game_room_789012',
          players: ['user123', 'user789']
        }
      ];
      
      mockGameSocket.getActiveGames.mockReturnValue(multipleGames);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            game: expect.objectContaining({
              id: 'game_room_123456'
            })
          })
        })
      );
    });

    it('should handle socket error gracefully', async () => {
      mockGameSocket.getActiveGames.mockImplementation(() => {
        throw new Error('Socket connection error');
      });

      await expect(getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to retrieve game state');
    });

    it('should handle game with empty board', async () => {
      const emptyGame = {
        ...mockGame,
        board: [['', '', ''], ['', '', ''], ['', '', '']],
        moves: 0
      };
      
      mockGameSocket.getActiveGames.mockReturnValue([emptyGame]);

      await getGameState(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            game: expect.objectContaining({
              moves: 0
            })
          })
        })
      );
    });
  });
});

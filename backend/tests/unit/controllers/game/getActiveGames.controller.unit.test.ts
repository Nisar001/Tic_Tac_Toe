import { Request, Response, NextFunction } from 'express';
import { getActiveGames } from '../../../../src/modules/game/controllers/getActiveGames.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../../../src/models/game.model');

const Game = require('../../../../src/models/game.model');

describe('GetActiveGames Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      query: {},
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

    // Reset all mocks
    jest.clearAllMocks();

    // Mock Game model
    Game.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue([
              {
                _id: 'game1',
                players: [
                  { user: { _id: 'user123', username: 'testuser' }, symbol: 'X' },
                  { user: { _id: 'opponent1', username: 'opponent1' }, symbol: 'O' }
                ],
                status: 'IN_PROGRESS',
                gameType: 'RANKED',
                startTime: new Date(),
                moves: []
              },
              {
                _id: 'game2',
                players: [
                  { user: { _id: 'user123', username: 'testuser' }, symbol: 'O' },
                  { user: { _id: 'opponent2', username: 'opponent2' }, symbol: 'X' }
                ],
                status: 'WAITING_FOR_MOVE',
                gameType: 'CASUAL',
                startTime: new Date(),
                moves: []
              }
            ])
          })
        })
      })
    });

    Game.countDocuments = jest.fn().mockResolvedValue(15);
  });

  describe('getActiveGames function', () => {
    it('should return active games successfully', async () => {
      await getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Game.find).toHaveBeenCalledWith({
        'players.user': 'user123',
        status: { $in: ['WAITING_FOR_PLAYER', 'IN_PROGRESS', 'WAITING_FOR_MOVE'] }
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          games: expect.arrayContaining([
            expect.objectContaining({
              _id: 'game1',
              status: 'IN_PROGRESS',
              gameType: 'RANKED'
            }),
            expect.objectContaining({
              _id: 'game2',
              status: 'WAITING_FOR_MOVE',
              gameType: 'CASUAL'
            })
          ]),
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalGames: 15,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response))
        .rejects.toThrow('Authentication required');
    });

    it('should handle pagination correctly', async () => {
      mockRequest.query = { page: '2', limit: '5' };

      await getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Game.find().populate().sort().limit().skip).toHaveBeenCalledWith(5);
    });

    it('should handle empty results', async () => {
      Game.find().populate().sort().limit().skip.mockResolvedValue([]);
      Game.countDocuments.mockResolvedValue(0);

      await getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          games: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalGames: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        }
      });
    });

    it('should populate player information correctly', async () => {
      await getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Game.find().populate).toHaveBeenCalledWith('players.user', 'username avatar level');
    });

    it('should sort games by most recent first', async () => {
      await getActiveGames(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(Game.find().populate().sort).toHaveBeenCalledWith({ startTime: -1 });
    });
  });
});

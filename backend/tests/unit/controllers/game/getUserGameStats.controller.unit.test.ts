import { Request, Response, NextFunction } from 'express';
import { getUserGameStats } from '../../../../src/modules/game/controllers/getUserGameStats.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/models/game.model');

const User = require('../../../../src/models/user.model');
const Game = require('../../../../src/models/game.model');

describe('GetUserGameStats Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: { userId: 'user123' },
      user: {
        _id: 'currentUser',
        username: 'currentUser'
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock User model
    User.findById = jest.fn().mockResolvedValue({
      _id: 'user123',
      username: 'testuser',
      gameStats: {
        gamesPlayed: 50,
        wins: 30,
        losses: 15,
        draws: 5,
        winStreak: 3,
        longestWinStreak: 8,
        totalPlayTime: 3600000,
        averageGameTime: 72000
      },
      level: 10,
      totalXP: 2500,
      createdAt: new Date('2023-01-01')
    });

    // Mock Game model for recent games
    Game.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue([
            {
              _id: 'game1',
              gameType: 'RANKED',
              status: 'COMPLETED',
              winner: 'user123',
              players: [{ user: 'user123' }, { user: 'opponent1' }],
              startTime: new Date(),
              endTime: new Date(),
              moves: []
            },
            {
              _id: 'game2',
              gameType: 'CASUAL',
              status: 'COMPLETED',
              winner: 'opponent2',
              players: [{ user: 'user123' }, { user: 'opponent2' }],
              startTime: new Date(),
              endTime: new Date(),
              moves: []
            }
          ])
        })
      })
    });
  });

  describe('getUserGameStats function', () => {
    it('should return user game stats successfully', async () => {
      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(Game.find).toHaveBeenCalledWith({
        'players.user': 'user123',
        status: 'COMPLETED'
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user123',
            username: 'testuser',
            level: 10,
            totalXP: 2500
          },
          stats: {
            gamesPlayed: 50,
            wins: 30,
            losses: 15,
            draws: 5,
            winRate: 0.6,
            winStreak: 3,
            longestWinStreak: 8,
            totalPlayTime: 3600000,
            averageGameTime: 72000
          },
          recentGames: expect.arrayContaining([
            expect.objectContaining({
              _id: 'game1',
              gameType: 'RANKED',
              status: 'COMPLETED'
            })
          ]),
          memberSince: new Date('2023-01-01')
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when user ID is missing', async () => {
      mockRequest.params = {};

      await expect(getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User ID is required');
    });

    it('should throw error when user is not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should handle user with no game stats', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'newuser',
        gameStats: null,
        level: 1,
        totalXP: 0,
        createdAt: new Date()
      });

      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user123',
            username: 'newuser',
            level: 1,
            totalXP: 0
          },
          stats: {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            winStreak: 0,
            longestWinStreak: 0,
            totalPlayTime: 0,
            averageGameTime: 0
          },
          recentGames: expect.any(Array),
          memberSince: expect.any(Date)
        }
      });
    });

    it('should calculate win rate correctly', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        gameStats: {
          gamesPlayed: 100,
          wins: 75,
          losses: 20,
          draws: 5
        },
        level: 15,
        totalXP: 5000,
        createdAt: new Date()
      });

      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.data.stats.winRate).toBe(0.75);
    });

    it('should handle zero games played for win rate calculation', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        gameStats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        },
        level: 1,
        totalXP: 0,
        createdAt: new Date()
      });

      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.data.stats.winRate).toBe(0);
    });

    it('should limit recent games to 10', async () => {
      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(Game.find().sort().limit).toHaveBeenCalledWith(10);
    });

    it('should sort recent games by most recent first', async () => {
      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(Game.find().sort).toHaveBeenCalledWith({ endTime: -1 });
    });

    it('should populate recent games with player information', async () => {
      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(Game.find().sort().limit().populate).toHaveBeenCalledWith('players.user', 'username avatar level');
    });

    it('should handle database errors gracefully', async () => {
      User.findById.mockRejectedValue(new Error('Database error'));

      await expect(getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });

    it('should not expose sensitive user information', async () => {
      await getUserGameStats(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const userData = responseCall.data.user;

      expect(userData).not.toHaveProperty('email');
      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('refreshTokens');
    });
  });
});

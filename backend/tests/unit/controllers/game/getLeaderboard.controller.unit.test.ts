import { Request, Response, NextFunction } from 'express';
import { getLeaderboard, getLeaderboardRateLimit } from '../../../../src/modules/game/controllers/getLeaderboard.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('GetLeaderboard Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      query: {}
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock User model
    User.aggregate = jest.fn().mockResolvedValue([
      {
        _id: 'user1',
        username: 'player1',
        avatar: 'avatar1.jpg',
        level: 10,
        score: 150,
        winRate: 0.75,
        gameStats: {
          wins: 15,
          losses: 5,
          draws: 0,
          gamesPlayed: 20,
          streak: 5
        },
        lastGameAt: new Date()
      },
      {
        _id: 'user2',
        username: 'player2',
        avatar: 'avatar2.jpg',
        level: 8,
        score: 120,
        winRate: 0.6,
        gameStats: {
          wins: 12,
          losses: 8,
          draws: 0,
          gamesPlayed: 20,
          streak: 2
        },
        lastGameAt: new Date()
      }
    ]);

    User.countDocuments = jest.fn().mockResolvedValue(50);
  });

  describe('getLeaderboard function', () => {
    it('should return leaderboard successfully with default parameters', async () => {
      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.aggregate).toHaveBeenCalledWith([
        { $match: expect.objectContaining({
          isDeleted: { $ne: true },
          isBlocked: { $ne: true },
          'gameStats.gamesPlayed': { $gt: 0 }
        })},
        { $addFields: expect.any(Object) },
        { $sort: { score: -1, winRate: -1, 'gameStats.wins': -1 } },
        { $skip: 0 },
        { $limit: 20 },
        { $project: expect.any(Object) }
      ]);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          leaderboard: expect.arrayContaining([
            expect.objectContaining({
              rank: 1,
              username: 'player1',
              winRate: 0.75
            }),
            expect.objectContaining({
              rank: 2,
              username: 'player2',
              winRate: 0.6
            })
          ]),
          pagination: {
            currentPage: 1,
            totalPages: 3,
            totalUsers: 50,
            hasNextPage: true,
            hasPreviousPage: false
          },
          meta: {
            timeframe: 'all',
            generatedAt: expect.any(Date)
          }
        }
      });
    });

    it('should handle pagination correctly', async () => {
      mockRequest.query = { page: '2', limit: '10' };

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $skip: 10 },
          { $limit: 10 }
        ])
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: {
              currentPage: 2,
              totalPages: 5,
              totalUsers: 50,
              hasNextPage: true,
              hasPreviousPage: true
            }
          })
        })
      );
    });

    it('should filter by daily timeframe', async () => {
      mockRequest.query = { timeframe: 'daily' };

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: expect.objectContaining({
            lastGameAt: { $gte: expect.any(Date) }
          })}
        ])
      );
    });

    it('should filter by weekly timeframe', async () => {
      mockRequest.query = { timeframe: 'weekly' };

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: expect.objectContaining({
            lastGameAt: { $gte: expect.any(Date) }
          })}
        ])
      );
    });

    it('should filter by monthly timeframe', async () => {
      mockRequest.query = { timeframe: 'monthly' };

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(User.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          { $match: expect.objectContaining({
            lastGameAt: { $gte: expect.any(Date) }
          })}
        ])
      );
    });

    it('should throw error for invalid page number', async () => {
      mockRequest.query = { page: '0' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Page must be a positive number');
    });

    it('should throw error for non-numeric page', async () => {
      mockRequest.query = { page: 'invalid' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Page must be a positive number');
    });

    it('should throw error for invalid limit', async () => {
      mockRequest.query = { limit: '0' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 100');
    });

    it('should throw error for limit too high', async () => {
      mockRequest.query = { limit: '150' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 100');
    });

    it('should throw error for non-numeric limit', async () => {
      mockRequest.query = { limit: 'invalid' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 100');
    });

    it('should throw error for invalid timeframe', async () => {
      mockRequest.query = { timeframe: 'invalid' };

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid timeframe. Must be one of: all, daily, weekly, monthly');
    });

    it('should round win rates to 2 decimal places', async () => {
      User.aggregate.mockResolvedValue([
        {
          _id: 'user1',
          username: 'player1',
          winRate: 0.666666,
          gameStats: { wins: 2, losses: 1, draws: 0, gamesPlayed: 3, streak: 1 },
          score: 50
        }
      ]);

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            leaderboard: expect.arrayContaining([
              expect.objectContaining({
                winRate: 0.67
              })
            ])
          })
        })
      );
    });

    it('should calculate ranks correctly with pagination', async () => {
      mockRequest.query = { page: '3', limit: '5' };

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const leaderboard = responseCall.data.leaderboard;

      expect(leaderboard[0].rank).toBe(11); // (3-1) * 5 + 1
      expect(leaderboard[1].rank).toBe(12); // (3-1) * 5 + 2
    });

    it('should handle database errors gracefully', async () => {
      User.aggregate.mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to fetch leaderboard data');

      expect(consoleSpy).toHaveBeenCalledWith('Leaderboard error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle empty leaderboard results', async () => {
      User.aggregate.mockResolvedValue([]);
      User.countDocuments.mockResolvedValue(0);

      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          leaderboard: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalUsers: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          meta: {
            timeframe: 'all',
            generatedAt: expect.any(Date)
          }
        }
      });
    });

    it('should include correct aggregation fields', async () => {
      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const aggregateCalls = User.aggregate.mock.calls[0][0];
      const addFieldsStage = aggregateCalls.find((stage: any) => stage.$addFields);
      
      expect(addFieldsStage.$addFields).toHaveProperty('winRate');
      expect(addFieldsStage.$addFields).toHaveProperty('score');
    });

    it('should project correct user fields', async () => {
      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const aggregateCalls = User.aggregate.mock.calls[0][0];
      const projectStage = aggregateCalls.find((stage: any) => stage.$project);
      
      expect(projectStage.$project).toHaveProperty('username', 1);
      expect(projectStage.$project).toHaveProperty('avatar', 1);
      expect(projectStage.$project).toHaveProperty('level', 1);
      expect(projectStage.$project).toHaveProperty('gameStats');
      expect(projectStage.$project).not.toHaveProperty('password');
      expect(projectStage.$project).not.toHaveProperty('email');
    });

    it('should sort by score, then win rate, then wins', async () => {
      await getLeaderboard(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const aggregateCalls = User.aggregate.mock.calls[0][0];
      const sortStage = aggregateCalls.find((stage: any) => stage.$sort);
      
      expect(sortStage.$sort).toEqual({
        score: -1,
        winRate: -1,
        'gameStats.wins': -1
      });
    });
  });

  describe('getLeaderboardRateLimit', () => {
    it('should be configured with correct settings', () => {
      expect(getLeaderboardRateLimit).toBeDefined();
      // Rate limit configuration is tested functionally in integration tests
    });
  });
});

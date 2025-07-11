import { Request, Response, NextFunction } from 'express';
import { logoutAll } from '../../../../src/modules/auth/controllers/logoutAll.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../../../src/models/user.model');

const User = require('../../../../src/models/user.model');

describe('LogoutAll Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'testuser',
        lastRoomJoinTime: new Date(),
        email: 'testuser@example.com',
        provider: 'manual',
        level: 1,
        refreshTokens: [
          { token: 'token1', createdAt: new Date(), expiresAt: new Date(Date.now() + 100000) },
          { token: 'token2', createdAt: new Date(), expiresAt: new Date(Date.now() + 100000) },
          { token: 'token3', createdAt: new Date(), expiresAt: new Date(Date.now() + 100000) }
        ],
        save: jest.fn(),
        xp: 0,
        energy: 100,
        maxEnergy: 100,
        energyUpdatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        friends: [],
        friendRequests: { sent: [], received: [] },
        avatar: '',
        bio: '',
        stats: {
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          winRate: 0
        },
        isEmailVerified: true,
        comparePassword: jest.fn().mockResolvedValue(true),
        calculateWinRate: jest.fn().mockReturnValue(0),
        calculateLevel: jest.fn().mockReturnValue(1),
        isBlocked: false,
        // Mock missing IUser methods/properties
        addXP: jest.fn(),
        canPlayGame: jest.fn().mockReturnValue(true),
        consumeEnergy: jest.fn(),
        regenerateEnergy: jest.fn(),
        // Add more dummy methods as needed to satisfy IUser
      } as any // <-- Cast to any to bypass strict IUser checks
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();
    mockUser = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      refreshTokens: ['token1', 'token2', 'token3'],
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock User model
    User.findById = jest.fn().mockResolvedValue(mockUser);
  });

  describe('logoutAll function', () => {
    it('should logout from all devices successfully', async () => {
      await logoutAll(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
      expect(User.findById).toHaveBeenCalledWith(new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'));
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(logoutAll(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should handle user not found in database', async () => {
      User.findById.mockResolvedValue(null);

      await expect(logoutAll(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should handle user with no refresh tokens', async () => {
      mockUser.refreshTokens = [];

      await logoutAll(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out from all devices successfully'
      });
    });

    it('should handle database save error', async () => {
      mockUser.save.mockRejectedValue(new Error('Database error'));

      await expect(logoutAll(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });
  });
});

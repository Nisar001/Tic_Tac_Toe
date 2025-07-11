import { Request, Response, NextFunction } from 'express';
import { logout } from '../../../../src/modules/auth/controllers/logout.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../../../src/models/user.model');

const User = require('../../../../src/models/user.model');

describe('Logout Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      headers: {
        authorization: 'Bearer validRefreshToken'
      },
      user: {
        _id: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439011'),
        username: 'testuser',
        email: 'testuser@example.com',
        provider: 'local',
        level: 1,
        lastRoomJoinTime: new Date(),
        // Add other required IUser properties with mock values as needed
        // For example:
        // isActive: true,
        // roles: [],
        // ...etc.
      } as any // Use 'as any' to bypass strict type checking for test mocks
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    const { Types } = require('mongoose');
    mockUser = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      refreshTokens: ['validRefreshToken', 'otherToken'],
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock User model
    User.findById = jest.fn().mockResolvedValue(mockUser);
  });

  describe('logout function', () => {
    it('should logout successfully with valid refresh token', async () => {
      await logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual(['otherToken']);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when authorization header is missing', async () => {
      mockRequest.headers = {};

      await expect(logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Refresh token required');
    });

    it('should throw error when refresh token format is invalid', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      await expect(logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid token format');
    });

    it('should handle case when token is not in user\'s refresh tokens', async () => {
      mockRequest.headers = { authorization: 'Bearer unknownToken' };

      await logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual(['validRefreshToken', 'otherToken']);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should handle user not found in database', async () => {
      User.findById.mockResolvedValue(null);

      await expect(logout(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });
  });
});

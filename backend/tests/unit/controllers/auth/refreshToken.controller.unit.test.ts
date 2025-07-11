import { Request, Response, NextFunction } from 'express';
import { refreshToken } from '../../../../src/modules/auth/controllers/refreshToken.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('RefreshToken Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      headers: {
        authorization: 'Bearer validRefreshToken'
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      refreshTokens: ['validRefreshToken', 'otherToken'],
      isDeleted: false,
      isBlocked: false,
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.verifyRefreshToken as jest.Mock).mockResolvedValue({
      userId: 'user123',
      tokenId: 'tokenId123'
    });
    (AuthUtils.generateAccessToken as jest.Mock).mockReturnValue('newAccessToken');
    (AuthUtils.generateRefreshToken as jest.Mock).mockReturnValue('newRefreshToken');

    // Mock User model
    User.findById = jest.fn().mockResolvedValue(mockUser);
  });

  describe('refreshToken function', () => {
    it('should refresh tokens successfully with valid refresh token', async () => {
      await refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.verifyRefreshToken).toHaveBeenCalledWith('validRefreshToken');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(AuthUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      });
      expect(AuthUtils.generateRefreshToken).toHaveBeenCalledWith('user123');

      expect(mockUser.refreshTokens).toEqual(['otherToken', 'newRefreshToken']);
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          accessToken: 'newAccessToken',
          refreshToken: 'newRefreshToken',
          user: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com'
          }
        }
      });
    });

    it('should throw error when authorization header is missing', async () => {
      mockRequest.headers = {};

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Refresh token required');
    });

    it('should throw error when token format is invalid', async () => {
      mockRequest.headers = { authorization: 'InvalidFormat' };

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid token format');
    });

    it('should throw error when refresh token is invalid', async () => {
      (AuthUtils.verifyRefreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error when user is not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should throw error when account is deleted', async () => {
      mockUser.isDeleted = true;

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when account is blocked', async () => {
      mockUser.isBlocked = true;

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is blocked');
    });

    it('should throw error when refresh token is not in user tokens', async () => {
      mockUser.refreshTokens = ['otherToken1', 'otherToken2'];

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should remove old refresh token and add new one', async () => {
      await refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).not.toContain('validRefreshToken');
      expect(mockUser.refreshTokens).toContain('newRefreshToken');
    });

    it('should handle case with no existing refresh tokens', async () => {
      mockUser.refreshTokens = [];

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid refresh token');
    });

    it('should not expose sensitive user information', async () => {
      await refreshToken(mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const userData = responseCall.data.user;

      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('refreshTokens');
      expect(userData).not.toHaveProperty('emailVerificationToken');
    });

    it('should handle database save error', async () => {
      mockUser.save.mockRejectedValue(new Error('Database error'));

      await expect(refreshToken(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });
  });
});

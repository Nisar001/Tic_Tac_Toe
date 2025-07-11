import { Request, Response, NextFunction } from 'express';
import { deleteAccount } from '../../../../src/modules/auth/controllers/deleteAccount.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('DeleteAccount Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: {
        _id: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439011'),
        username: 'testuser',
        email: 'test@example.com',
        isDeleted: false,
        isBlocked: false,
        lastRoomJoinTime: new Date(),
        provider: 'manual',
        level: 1,
        xp: 0,
        avatar: '',
        bio: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: undefined,
        refreshTokens: [],
        password: 'hashedPassword',
        friends: [],
        friendRequests: { sent: [], received: [] },
        isOnline: false,
        isEmailVerified: true,
        emailVerificationToken: '',
        resetPasswordToken: '',
        resetPasswordExpires: new Date(),
        energy: 100,
        maxEnergy: 100,
        energyUpdatedAt: new Date(),
        lastSeen: new Date(),
      } as any
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      isDeleted: false,
      deletedAt: null,
      refreshTokens: ['token1', 'token2'],
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.comparePassword as jest.Mock).mockResolvedValue(true);

    // Mock User model
    User.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(mockUser)
    });

    // Mock console.log
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('deleteAccount function', () => {
    it('should delete account successfully with valid password', async () => {
      mockRequest.body = { 
        password: 'userPassword123',
        confirmText: 'DELETE'
      };

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.comparePassword).toHaveBeenCalledWith('userPassword123', 'hashedPassword');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.isDeleted).toBe(true);
      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(mockUser.refreshTokens).toEqual([]);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Account deleted successfully. We\'re sorry to see you go!'
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { password: 'userPassword123' };

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when password is missing', async () => {
      mockRequest.body = {};

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Password is required to delete account');
    });

    it('should throw error when password is not a string', async () => {
      mockRequest.body = { password: 123 };

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Password must be a string');
    });

    it('should throw error when account is already deleted', async () => {
      mockRequest.user!.isDeleted = true;
      mockRequest.body = { password: 'userPassword123' };

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is already deleted');
    });

    it('should throw error when account is blocked', async () => {
      mockRequest.user!.isBlocked = true;
      mockRequest.body = { password: 'userPassword123' };

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is blocked and cannot be deleted');
    });

    it('should throw error when user not found in database', async () => {
      mockRequest.body = { password: 'userPassword123' };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should throw error when password is incorrect', async () => {
      mockRequest.body = { password: 'wrongPassword' };
      (AuthUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Incorrect password');
    });

    it('should sanitize password input', async () => {
      mockRequest.body = { password: '  userPassword123  ' };

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  userPassword123  ', 255);
    });

    it('should clear all refresh tokens on account deletion', async () => {
      mockRequest.body = { password: 'userPassword123' };
      mockUser.refreshTokens = ['token1', 'token2', 'token3'];

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual([]);
    });

    it('should log account deletion for audit', async () => {
      mockRequest.body = { password: 'userPassword123' };
      const consoleSpy = jest.spyOn(console, 'log');

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Account deleted for user: ${mockUser._id}`)
      );
    });

    it('should set deletion timestamp', async () => {
      mockRequest.body = { password: 'userPassword123' };
      const beforeTime = new Date();

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.deletedAt).toBeInstanceOf(Date);
      expect(mockUser.deletedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should handle database save errors', async () => {
      mockRequest.body = { password: 'userPassword123' };
      mockUser.save.mockRejectedValue(new Error('Database error'));

      await expect(deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });

    it('should handle already deleted user gracefully', async () => {
      mockRequest.body = { password: 'userPassword123' };
      mockUser.isDeleted = true;

      await deleteAccount(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      // Should still proceed with the deletion process
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});

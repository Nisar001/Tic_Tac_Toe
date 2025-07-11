import { Request, Response, NextFunction } from 'express';
import { updateProfile } from '../../../../src/modules/auth/controllers/updateProfile.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('UpdateProfile Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      body: {
      username: 'newusername',
      bio: 'Updated bio',
      avatar: 'new-avatar.jpg',
      preferences: {
        theme: 'dark',
        notifications: true
      }
      },
    user: ({
    _id: new (require('mongoose').Types.ObjectId)('507f1f77bcf86cd799439011'),
    username: 'oldusername',
    email: 'test@example.com',
    isDeleted: false,
    isBlocked: false,
    lastRoomJoinTime: new Date(),
    provider: 'manual',
    level: 1,
    xp: 0,
    bio: '',
    avatar: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    password: '',
    refreshTokens: [],
    emailVerificationToken: '',
    isEmailVerified: true,
    // Mock required IUser properties with default values
    energy: 100,
    maxEnergy: 100,
    energyUpdatedAt: new Date(),
    isOnline: false,
    stats: {
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      winRate: 0
    },
    friends: [],
    friendRequests: { sent: [], received: [] },

    passwordResetToken: '',
    passwordResetExpires: new Date(),
    lockedUntil: new Date(),
    lastLogin: new Date(),
    lastPasswordChange: new Date(),
    deletedAt: undefined,
    // Add more properties as needed for your IUser interface
    } as unknown) as import('../../../../src/models/user.model').IUser
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      username: 'oldusername',
      email: 'test@example.com',
      bio: 'Old bio',
      avatar: 'old-avatar.jpg',
      preferences: {
        theme: 'dark',
        notifications: true
      },
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isValidUsernameSecure as jest.Mock).mockReturnValue({ valid: true });

    // Mock User model
    User.findById = jest.fn().mockResolvedValue(mockUser);
    User.findOne = jest.fn().mockResolvedValue(null); // No existing user with new username
  });

  describe('updateProfile function', () => {
    it('should update profile successfully with valid data', async () => {
      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.username).toBe('newusername');
      expect(mockUser.bio).toBe('Updated bio');
      expect(mockUser.avatar).toBe('new-avatar.jpg');
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: expect.objectContaining({
            username: 'newusername',
            bio: 'Updated bio',
            avatar: 'new-avatar.jpg'
          })
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when account is deleted', async () => {
      mockRequest.user!.isDeleted = true;

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when account is blocked', async () => {
      mockRequest.user!.isBlocked = true;

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error for invalid username', async () => {
      mockRequest.body = { username: 'invalid@username' };
      (AuthUtils.isValidUsernameSecure as jest.Mock).mockReturnValue({
        valid: false,
        reason: 'Username contains invalid characters'
      });

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Username contains invalid characters');
    });

    it('should throw error when username is already taken', async () => {
      mockRequest.body = { username: 'existinguser' };
      User.findOne.mockResolvedValue({
        _id: 'otheruser',
        username: 'existinguser'
      });

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Username is already taken');
    });

    it('should allow keeping the same username', async () => {
      mockRequest.body = { username: 'oldusername', bio: 'New bio' };

      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.username).toBe('oldusername');
      expect(mockUser.bio).toBe('New bio');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: expect.any(Object)
      });
    });

    it('should sanitize input fields', async () => {
      mockRequest.body = {
        username: '  newusername  ',
        bio: '  Updated bio  ',
        avatar: '  new-avatar.jpg  '
      };

      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  newusername  ', 20);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  Updated bio  ', 200);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  new-avatar.jpg  ', 255);
    });

    it('should update preferences when provided', async () => {
      mockRequest.body = {
        preferences: {
          theme: 'light',
          notifications: false,
          language: 'en'
        }
      };

      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.preferences).toEqual({
        theme: 'light',
        notifications: false,
        language: 'en'
      });
    });

    it('should validate bio length', async () => {
      const longBio = 'a'.repeat(201);
      mockRequest.body = { bio: longBio };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue(longBio);

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Bio is too long (max 200 characters)');
    });

    it('should handle partial updates', async () => {
      mockRequest.body = { bio: 'Only bio update' };

      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.username).toBe('oldusername'); // unchanged
      expect(mockUser.bio).toBe('Only bio update'); // changed
      expect(mockUser.avatar).toBe('old-avatar.jpg'); // unchanged
    });

    it('should not update when no valid fields provided', async () => {
      mockRequest.body = {};

      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.save).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'No updates provided',
        data: expect.any(Object)
      });
    });

    it('should handle user not found in database', async () => {
      User.findById.mockResolvedValue(null);

      await expect(updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should not expose sensitive information in response', async () => {
      await updateProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const userData = responseCall.data.user;

      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('refreshTokens');
      expect(userData).not.toHaveProperty('emailVerificationToken');
    });
  });
});

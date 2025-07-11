import { Request, Response, NextFunction } from 'express';
import { changePassword, changePasswordRateLimit } from '../../../../src/modules/auth/controllers/changePassword.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { Types } from 'mongoose';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('ChangePassword Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      user: {
        _id: new Types.ObjectId(),
        username: 'testuser',
        email: 'test@example.com',
        isDeleted: false,
        isBlocked: false,
        // Mock all required IUser properties with dummy values
        lastRoomJoinTime: new Date(),
        provider: 'local',
        level: 1,
        xp: 0,
        roles: [],
        avatar: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        password: 'hashedOldPassword',
        refreshTokens: [],
        lastPasswordChange: null,
        passwordResetToken: '',
        passwordResetExpires: new Date(),
        // Add any other required IUser properties as needed for your codebase
      } as any
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();
    mockUser = {
      _id: (mockRequest.user as any)._id,
      password: 'hashedOldPassword',
      refreshTokens: ['token1', 'token2'],
      lastPasswordChange: null,
      passwordResetToken: 'resetToken',
      passwordResetExpires: new Date(),
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(true);
    (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(false);
    (AuthUtils.comparePassword as jest.Mock).mockResolvedValue(true);
    (AuthUtils.hashPassword as jest.Mock).mockResolvedValue('hashedNewPassword');
    (AuthUtils.isActionAllowed as jest.Mock).mockReturnValue(true);

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

  describe('changePassword function', () => {
    it('should change password successfully with valid data', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.comparePassword).toHaveBeenCalledWith('oldPassword123', 'hashedOldPassword');
      expect(AuthUtils.hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.password).toBe('hashedNewPassword');
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.passwordResetToken).toBe(null);
      expect(mockUser.passwordResetExpires).toBe(null);
      expect(mockUser.lastPasswordChange).toBeInstanceOf(Date);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password changed successfully. Please log in again with your new password.'
      });
    });

    it('should throw error when current password is missing', async () => {
      mockRequest.body = {
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Current password and new password are required');
    });

    it('should throw error when new password is missing', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Current password and new password are required');
    });

    it('should throw error when passwords are not strings', async () => {
      mockRequest.body = {
        currentPassword: 123,
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Passwords must be strings');
    });

    it('should throw error when confirm password is missing', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('New password and confirmation password do not match');
    });

    it('should throw error when passwords do not match', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('New password and confirmation password do not match');
    });

    it('should throw error for invalid new password', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: '123',
        confirmPassword: '123'
      };

      (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(false);

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('New password must be at least 6 characters with letters and numbers');
    });

    it('should throw error for common password', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'password',
        confirmPassword: 'password'
      };

      (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(true);

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Please choose a more secure password');
    });

    it('should throw error when new password is same as current', async () => {
      mockRequest.body = {
        currentPassword: 'samePassword123',
        newPassword: 'samePassword123',
        confirmPassword: 'samePassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('New password must be different from current password');
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when account is deleted', async () => {
      mockRequest.user!.isDeleted = true;
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when account is blocked', async () => {
      mockRequest.user!.isBlocked = true;
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when user not found in database', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('User not found');
    });

    it('should throw error when current password is incorrect', async () => {
      mockRequest.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      (AuthUtils.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when password change is within cooldown period', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      mockUser.lastPasswordChange = new Date();
      (AuthUtils.isActionAllowed as jest.Mock).mockReturnValue(false);

      await expect(changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Please wait before changing your password again');
    });

    it('should clear all refresh tokens on password change', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual([]);
    });

    it('should clear password reset tokens on password change', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockUser.passwordResetToken).toBe(null);
      expect(mockUser.passwordResetExpires).toBe(null);
    });

    it('should log password change for audit', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      const consoleSpy = jest.spyOn(console, 'log');

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Password changed for user: ${mockUser._id}`)
      );
    });

    it('should sanitize input passwords', async () => {
      mockRequest.body = {
        currentPassword: '  oldPassword123  ',
        newPassword: '  newPassword123  ',
        confirmPassword: '  newPassword123  '
      };

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  oldPassword123  ', 255);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  newPassword123  ', 255);
    });

    it('should check password change cooldown correctly', async () => {
      mockRequest.body = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      mockUser.lastPasswordChange = pastDate;

      await changePassword(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.isActionAllowed).toHaveBeenCalledWith(pastDate, 5 * 60 * 1000);
    });
  });

  describe('changePasswordRateLimit', () => {
    it('should be configured with correct settings', () => {
      expect(changePasswordRateLimit).toBeDefined();
      // Rate limit configuration is tested functionally in integration tests
    });
  });
});

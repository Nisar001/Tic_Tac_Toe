import { Request, Response, NextFunction } from 'express';
import { resetPassword } from '../../../../src/modules/auth/controllers/resetPassword.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('ResetPassword Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      body: {
        token: 'resetToken123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      passwordResetToken: 'resetToken123',
      passwordResetExpires: new Date(Date.now() + 10 * 60 * 1000),
      refreshTokens: ['token1', 'token2'],
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(true);
    (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(false);
    (AuthUtils.hashPassword as jest.Mock).mockResolvedValue('hashedNewPassword');

    // Mock User model
    User.findOne = jest.fn().mockResolvedValue(mockUser);
  });

  describe('resetPassword function', () => {
    it('should reset password successfully with valid token', async () => {
      await resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({
        passwordResetToken: 'resetToken123',
        passwordResetExpires: { $gt: expect.any(Date) }
      });

      expect(AuthUtils.hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(mockUser.password).toBe('hashedNewPassword');
      expect(mockUser.passwordResetToken).toBe(null);
      expect(mockUser.passwordResetExpires).toBe(null);
      expect(mockUser.refreshTokens).toEqual([]);
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully. Please log in with your new password.'
      });
    });

    it('should throw error when token is missing', async () => {
      mockRequest.body = {
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      };

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Reset token, new password, and confirmation are required');
    });

    it('should throw error when new password is missing', async () => {
      mockRequest.body = {
        token: 'resetToken123',
        confirmPassword: 'newPassword123'
      };

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Reset token, new password, and confirmation are required');
    });

    it('should throw error when passwords do not match', async () => {
      mockRequest.body = {
        token: 'resetToken123',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword'
      };

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('New password and confirmation do not match');
    });

    it('should throw error for invalid password', async () => {
      (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(false);

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Password must be at least 6 characters with letters and numbers');
    });

    it('should throw error for common password', async () => {
      (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(true);

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please choose a more secure password');
    });

    it('should throw error for invalid or expired token', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error for expired token', async () => {
      mockUser.passwordResetExpires = new Date(Date.now() - 1000);

      await expect(resetPassword(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid or expired reset token');
    });

    it('should clear all refresh tokens on password reset', async () => {
      await resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUser.refreshTokens).toEqual([]);
    });

    it('should sanitize input password', async () => {
      mockRequest.body = {
        token: 'resetToken123',
        newPassword: '  newPassword123  ',
        confirmPassword: '  newPassword123  '
      };

      await resetPassword(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  newPassword123  ', 255);
    });
  });
});

import { Request, Response, NextFunction } from 'express';
import { requestPasswordReset } from '../../../../src/modules/auth/controllers/requestPasswordReset.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { EmailService } from '../../../../src/services/email.service';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/services/email.service');

const User = require('../../../../src/models/user.model');

describe('RequestPasswordReset Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      body: {
        email: 'test@example.com'
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      isDeleted: false,
      isBlocked: false,
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim().toLowerCase());
    (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(true);
    (AuthUtils.generatePasswordResetToken as jest.Mock).mockReturnValue('resetToken123');

    // Mock EmailService
    (EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue(true);

    // Mock User model
    User.findOne = jest.fn().mockResolvedValue(mockUser);
  });

  describe('requestPasswordReset function', () => {
    it('should send password reset email successfully', async () => {
      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('test@example.com', 255);
      expect(AuthUtils.isValidEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        isDeleted: { $ne: true },
        isBlocked: { $ne: true }
      });
      expect(AuthUtils.generatePasswordResetToken).toHaveBeenCalled();
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'resetToken123');

      expect(mockUser.passwordResetToken).toBe('resetToken123');
      expect(mockUser.passwordResetExpires).toBeInstanceOf(Date);
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully'
      });
    });

    it('should throw error when email is missing', async () => {
      mockRequest.body = {};

      await expect(requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email is required');
    });

    it('should throw error for invalid email format', async () => {
      mockRequest.body = { email: 'invalid-email' };
      (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid email address');
    });

    it('should return success even when user not found (security)', async () => {
      User.findOne.mockResolvedValue(null);

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully'
      });
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not send email for deleted account', async () => {
      mockUser.isDeleted = true;

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully'
      });
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not send email for blocked account', async () => {
      mockUser.isBlocked = true;

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully'
      });
      expect(EmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should handle email service failure gracefully', async () => {
      (EmailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Email service down'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send password reset email:', expect.any(Error));
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset email sent successfully'
      });

      consoleSpy.mockRestore();
    });

    it('should set password reset token expiry (15 minutes)', async () => {
      const beforeTime = new Date(Date.now() + 14 * 60 * 1000);
      const afterTime = new Date(Date.now() + 16 * 60 * 1000);

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUser.passwordResetExpires.getTime()).toBeGreaterThan(beforeTime.getTime());
      expect(mockUser.passwordResetExpires.getTime()).toBeLessThan(afterTime.getTime());
    });

    it('should sanitize email input', async () => {
      mockRequest.body = { email: '  TEST@EXAMPLE.COM  ' };

      await requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  TEST@EXAMPLE.COM  ', 255);
    });

    it('should handle database save error', async () => {
      mockUser.save.mockRejectedValue(new Error('Database error'));

      await expect(requestPasswordReset(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });
  });
});

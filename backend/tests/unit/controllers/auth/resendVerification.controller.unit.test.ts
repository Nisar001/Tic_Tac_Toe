import { Request, Response } from 'express';
import { resendVerification, resendVerificationRateLimit } from '../../../../src/modules/auth/controllers/resendVerification.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { EmailService } from '../../../../src/services/email.service';
import { createError } from '../../../../src/middlewares/error.middleware';

// Mock dependencies
const mockUser = {
  findOne: jest.fn(),
  save: jest.fn()
};

jest.mock('../../../../src/models/user.model', () => mockUser);
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/services/email.service');
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    badRequest: jest.fn((message: string) => new Error(message)),
    tooManyRequests: jest.fn((message: string) => new Error(message)),
    serviceUnavailable: jest.fn((message: string) => new Error(message))
  }
}));

describe('ResendVerification Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      body: {},
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup default mocks
    (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(true);
    (AuthUtils.isSuspiciousEmail as jest.Mock).mockReturnValue(false);
    (AuthUtils.generateVerificationCode as jest.Mock).mockReturnValue('123456');
    (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);
  });

  describe('resendVerification', () => {
    it('should throw error when email is not provided', async () => {
      mockRequest.body = {};

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email is required');

      expect(createError.badRequest).toHaveBeenCalledWith('Email is required');
    });

    it('should throw error when email is invalid', async () => {
      mockRequest.body = { email: 'invalid-email' };
      (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid email address');

      expect(createError.badRequest).toHaveBeenCalledWith('Please provide a valid email address');
    });

    it('should throw error when email is suspicious', async () => {
      mockRequest.body = { email: 'test@example.com' };
      (AuthUtils.isSuspiciousEmail as jest.Mock).mockReturnValue(true);

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid email format');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid email format');
    });

    it('should return generic message when user does not exist', async () => {
      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(null);

      await resendVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'If the email is registered and not verified, a verification email has been sent'
      });
    });

    it('should throw error when email is already verified', async () => {
      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue({
        email: 'test@example.com',
        isEmailVerified: true
      });

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email is already verified');

      expect(createError.badRequest).toHaveBeenCalledWith('Email is already verified');
    });

    it('should throw error when cooldown period has not passed', async () => {
      const now = new Date();
      const recentRequest = new Date(now.getTime() - 30000); // 30 seconds ago
      
      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue({
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: recentRequest
      });

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please wait at least 1 minute before requesting another verification email');

      expect(createError.tooManyRequests).toHaveBeenCalledWith(
        'Please wait at least 1 minute before requesting another verification email'
      );
    });

    it('should successfully send verification email for valid request', async () => {
      const now = new Date();
      const oldRequest = new Date(now.getTime() - 120000); // 2 minutes ago
      
      const mockUserDoc = {
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: oldRequest,
        save: jest.fn().mockResolvedValue(true)
      };

      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(mockUserDoc);

      await resendVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserDoc.save).toHaveBeenCalled();
      expect(EmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        '123456'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verification email sent successfully'
      });
    });

    it('should handle email service failure', async () => {
      const now = new Date();
      const oldRequest = new Date(now.getTime() - 120000); // 2 minutes ago
      
      const mockUserDoc = {
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: oldRequest,
        save: jest.fn().mockResolvedValue(true)
      };

      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(mockUserDoc);
      (EmailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service failed')
      );

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to send verification email. Please try again later.');

      expect(createError.serviceUnavailable).toHaveBeenCalledWith(
        'Failed to send verification email. Please try again later.'
      );
    });

    it('should sanitize email input by trimming and converting to lowercase', async () => {
      mockRequest.body = { email: '  TEST@EXAMPLE.COM  ' };
      mockUser.findOne.mockResolvedValue(null);

      await resendVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should update user with new verification details', async () => {
      const now = new Date();
      const oldRequest = new Date(now.getTime() - 120000); // 2 minutes ago
      
      const mockUserDoc = {
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: oldRequest,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        save: jest.fn().mockResolvedValue(true)
      };

      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(mockUserDoc);

      await resendVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserDoc.emailVerificationToken).toBe('123456');
      expect(mockUserDoc.emailVerificationExpiry).toBeInstanceOf(Date);
      expect(mockUserDoc.lastVerificationRequest).toBeInstanceOf(Date);
      expect(mockUserDoc.save).toHaveBeenCalled();
    });

    it('should work when lastVerificationRequest is null', async () => {
      const mockUserDoc = {
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: null,
        save: jest.fn().mockResolvedValue(true)
      };

      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(mockUserDoc);

      await resendVerification(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockUserDoc.save).toHaveBeenCalled();
      expect(EmailService.sendVerificationEmail).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Verification email sent successfully'
      });
    });
  });

  describe('resendVerificationRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(resendVerificationRateLimit).toBeDefined();
      // Note: Testing rate limit middleware configuration would require more complex setup
      // In a real scenario, you might want to test this with integration tests
    });
  });

  describe('edge cases', () => {
    it('should handle user.save() failure', async () => {
      const now = new Date();
      const oldRequest = new Date(now.getTime() - 120000);
      
      const mockUserDoc = {
        email: 'test@example.com',
        isEmailVerified: false,
        lastVerificationRequest: oldRequest,
        save: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      mockRequest.body = { email: 'test@example.com' };
      mockUser.findOne.mockResolvedValue(mockUserDoc);

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });

    it('should handle empty email string', async () => {
      mockRequest.body = { email: '' };

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email is required');
    });

    it('should handle whitespace-only email', async () => {
      mockRequest.body = { email: '   ' };
      (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(resendVerification(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid email address');
    });
  });
});

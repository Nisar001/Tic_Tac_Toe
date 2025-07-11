import { Request, Response, NextFunction } from 'express';
import { verifyEmail } from '../../../../src/modules/auth/controllers/verifyEmail.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');

const User = require('../../../../src/models/user.model');

describe('VerifyEmail Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUser: any;

  beforeEach(() => {
    mockRequest = {
      body: {
        email: 'test@example.com',
        verificationCode: '123456'
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      isEmailVerified: false,
      emailVerificationToken: '123456',
      emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(true);

    // Mock User model
    User.findOne = jest.fn().mockResolvedValue(mockUser);
  });

  describe('verifyEmail function', () => {
    it('should verify email successfully with valid code', async () => {
      await verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        emailVerificationToken: '123456',
        emailVerificationExpiry: { $gt: expect.any(Date) }
      });

      expect(mockUser.isEmailVerified).toBe(true);
      expect(mockUser.emailVerificationToken).toBe(null);
      expect(mockUser.emailVerificationExpiry).toBe(null);
      expect(mockUser.save).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully'
      });
    });

    it('should throw error when email is missing', async () => {
      mockRequest.body = { verificationCode: '123456' };

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email and verification code are required');
    });

    it('should throw error when verification code is missing', async () => {
      mockRequest.body = { email: 'test@example.com' };

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email and verification code are required');
    });

    it('should throw error for invalid email format', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        verificationCode: '123456'
      };

      (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid email address');
    });

    it('should throw error when verification code is invalid', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid or expired verification code');
    });

    it('should throw error when verification code is expired', async () => {
      mockUser.emailVerificationExpiry = new Date(Date.now() - 1000);
      User.findOne.mockResolvedValue(mockUser);

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid or expired verification code');
    });

    it('should handle already verified email', async () => {
      mockUser.isEmailVerified = true;

      await verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email is already verified'
      });
    });

    it('should sanitize input email', async () => {
      mockRequest.body = {
        email: '  TEST@EXAMPLE.COM  ',
        verificationCode: '123456'
      };

      await verifyEmail(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  TEST@EXAMPLE.COM  ', 255);
    });

    it('should handle database save errors', async () => {
      mockUser.save.mockRejectedValue(new Error('Database error'));

      await expect(verifyEmail(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Database error');
    });
  });
});

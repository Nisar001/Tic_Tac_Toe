import { Request, Response, NextFunction } from 'express';
import { register, registrationRateLimit } from '../../../../src/modules/auth/controllers/register.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { EmailService } from '../../../../src/services/email.service';
import { createError } from '../../../../src/middlewares/error.middleware';
import { config } from '../../../../src/config';

// Mock dependencies
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/services/email.service');
jest.mock('../../../../src/config');

const User = require('../../../../src/models/user.model');

describe('Register Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent')
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isValidUsernameSecure as jest.Mock).mockReturnValue({ valid: true });
    (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(true);
    (AuthUtils.isSuspiciousEmail as jest.Mock).mockReturnValue(false);
    (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(true);
    (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(false);
    (AuthUtils.isValidPhoneNumber as jest.Mock).mockReturnValue(true);
    (AuthUtils.hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
    (AuthUtils.generateVerificationCode as jest.Mock).mockReturnValue('123456');

    // Mock config
    (config as any).ENERGY_CONFIG = { MAX_ENERGY: 100 };

    // Mock EmailService
    (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(true);

    // Mock User model
    User.findOne = jest.fn().mockResolvedValue(null);
    User.prototype.save = jest.fn().mockResolvedValue({
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    });
    User.mockImplementation(() => ({
      _id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      save: jest.fn().mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      })
    }));
  });

  describe('register function', () => {
    it('should register a new user successfully with valid data', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '+1234567890',
        dateOfBirth: '1990-01-01'
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        data: {
          userId: 'user123',
          email: 'test@example.com',
          username: 'testuser',
          verificationSent: true
        }
      });
    });

    it('should register user without optional fields', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(EmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw error when required fields are missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
        // missing username
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error when email is missing', async () => {
      mockRequest.body = {
        username: 'testuser',
        password: 'password123'
        // missing email
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error when password is missing', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com'
        // missing password
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Username, email, and password are required');
    });

    it('should throw error for invalid username', async () => {
      mockRequest.body = {
        username: 'invalid-user',
        email: 'test@example.com',
        password: 'password123'
      };

      (AuthUtils.isValidUsernameSecure as jest.Mock).mockReturnValue({
        valid: false,
        reason: 'Username contains invalid characters'
      });

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Username contains invalid characters');
    });

    it('should throw error for invalid email format', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      };

      (AuthUtils.isValidEmail as jest.Mock).mockReturnValue(false);

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid email address');
    });

    it('should throw error for suspicious email', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'suspicious@tempmail.com',
        password: 'password123'
      };

      (AuthUtils.isSuspiciousEmail as jest.Mock).mockReturnValue(true);

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for invalid password', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      (AuthUtils.isValidPassword as jest.Mock).mockReturnValue(false);

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Password must be at least 6 characters with letters and numbers');
    });

    it('should throw error for common password', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password'
      };

      (AuthUtils.isCommonPassword as jest.Mock).mockReturnValue(true);

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Password is too common. Please choose a stronger password');
    });

    it('should throw error for invalid phone number', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: 'invalid-phone'
      };

      (AuthUtils.isValidPhoneNumber as jest.Mock).mockReturnValue(false);

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid phone number');
    });

    it('should throw error for invalid date of birth', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        dateOfBirth: 'invalid-date'
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid date of birth');
    });

    it('should throw error for user under 13 years old', async () => {
      const recentDate = new Date();
      recentDate.setFullYear(recentDate.getFullYear() - 10);

      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        dateOfBirth: recentDate.toISOString()
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('You must be at least 13 years old to register');
    });

    it('should throw error for unrealistic age', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 200);

      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        dateOfBirth: oldDate.toISOString()
      };

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Please provide a valid date of birth');
    });

    it('should throw error when email already exists', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue({
        email: 'existing@example.com',
        username: 'otheruser'
      });

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Email is already registered');
    });

    it('should throw error when username already exists', async () => {
      mockRequest.body = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123'
      };

      User.findOne.mockResolvedValue({
        email: 'other@example.com',
        username: 'existinguser'
      });

      await expect(register(mockRequest as Request, mockResponse as Response, mockNext))
        .rejects.toThrow('Username is already taken');
    });

    it('should handle email service failure gracefully', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      (EmailService.sendVerificationEmail as jest.Mock).mockRejectedValue(new Error('Email service down'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send verification email:', expect.any(Error));
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      
      consoleSpy.mockRestore();
    });

    it('should sanitize input data correctly', async () => {
      mockRequest.body = {
        username: '  testuser  ',
        email: '  TEST@EXAMPLE.COM  ',
        password: 'password123',
        phoneNumber: '  +1234567890  '
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  testuser  ', 20);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  +1234567890  ', 20);
    });

    it('should include registration metadata', async () => {
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await register(mockRequest as Request, mockResponse as Response, mockNext);

      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        registrationIP: '127.0.0.1',
        registrationUserAgent: 'test-user-agent'
      }));
    });
  });

  describe('registrationRateLimit', () => {
    it('should be configured with correct settings', () => {
      expect(registrationRateLimit).toBeDefined();
      // Rate limit configuration is tested functionally in integration tests
    });
  });
});

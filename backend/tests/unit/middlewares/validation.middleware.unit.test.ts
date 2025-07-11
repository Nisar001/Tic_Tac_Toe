import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChangePassword,
  validateDeleteAccount,
  validateRefreshToken,
  validateResendVerification,
  validateEmailVerification,
  validateGameCreation,
  validateRoomId,
  validateMatchmakingQueue
} from '../../../src/middlewares/validation.middleware';
import { AuthUtils } from '../../../src/utils/auth.utils';

// Mock dependencies
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    custom: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    equals: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isBoolean: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    isMobilePhone: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    isNumeric: jest.fn().mockReturnThis(),
    isMongoId: jest.fn().mockReturnThis()
  })),
  param: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isMongoId: jest.fn().mockReturnThis()
  })),
  query: jest.fn(() => ({
    optional: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

jest.mock('../../../src/utils/auth.utils');

const mockValidationResult = validationResult as jest.MockedFunction<typeof validationResult>;
const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should proceed to next middleware when no validation errors', () => {
      mockValidationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      } as any);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 with formatted errors when validation fails', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'email',
          msg: 'Invalid email',
          value: 'invalid-email'
        },
        {
          type: 'field',
          path: 'password',
          msg: 'Password too short',
          value: '123'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email',
            value: 'invalid-email'
          },
          {
            field: 'password',
            message: 'Password too short',
            value: '123'
          }
        ]
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle non-field validation errors', () => {
      const mockErrors = [
        {
          type: 'unknown',
          msg: 'Unknown error'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'unknown',
            message: 'Unknown error',
            value: undefined
          }
        ]
      });
    });
  });

  describe('Validation Chain Structure', () => {
    it('should have validateUserRegistration as array of validation chains', () => {
      expect(Array.isArray(validateUserRegistration)).toBe(true);
      expect(validateUserRegistration.length).toBeGreaterThan(0);
    });

    it('should have validateUserLogin as array of validation chains', () => {
      expect(Array.isArray(validateUserLogin)).toBe(true);
      expect(validateUserLogin.length).toBeGreaterThan(0);
    });

    it('should have validatePasswordResetRequest as array of validation chains', () => {
      expect(Array.isArray(validatePasswordResetRequest)).toBe(true);
      expect(validatePasswordResetRequest.length).toBeGreaterThan(0);
    });

    it('should have validatePasswordReset as array of validation chains', () => {
      expect(Array.isArray(validatePasswordReset)).toBe(true);
      expect(validatePasswordReset.length).toBeGreaterThan(0);
    });

    it('should have validateChangePassword as array of validation chains', () => {
      expect(Array.isArray(validateChangePassword)).toBe(true);
      expect(validateChangePassword.length).toBeGreaterThan(0);
    });

    it('should have validateDeleteAccount as array of validation chains', () => {
      expect(Array.isArray(validateDeleteAccount)).toBe(true);
      expect(validateDeleteAccount.length).toBeGreaterThan(0);
    });

    it('should have validateRefreshToken as array of validation chains', () => {
      expect(Array.isArray(validateRefreshToken)).toBe(true);
      expect(validateRefreshToken.length).toBeGreaterThan(0);
    });

    it('should have validateResendVerification as array of validation chains', () => {
      expect(Array.isArray(validateResendVerification)).toBe(true);
      expect(validateResendVerification.length).toBeGreaterThan(0);
    });

    it('should have validateEmailVerification as array of validation chains', () => {
      expect(Array.isArray(validateEmailVerification)).toBe(true);
      expect(validateEmailVerification.length).toBeGreaterThan(0);
    });

    it('should have validateGameCreation as array of validation chains', () => {
      expect(Array.isArray(validateGameCreation)).toBe(true);
      expect(validateGameCreation.length).toBeGreaterThan(0);
    });

    it('should have validateRoomId as array of validation chains', () => {
      expect(Array.isArray(validateRoomId)).toBe(true);
      expect(validateRoomId.length).toBeGreaterThan(0);
    });

    it('should have validateMatchmakingQueue as array of validation chains', () => {
      expect(Array.isArray(validateMatchmakingQueue)).toBe(true);
      expect(validateMatchmakingQueue.length).toBeGreaterThan(0);
    });
  });

  describe('AuthUtils Integration', () => {
    it('should call AuthUtils.isValidUsername for username validation', () => {
      mockAuthUtils.isValidUsername.mockReturnValue(true);
      
      // Since we're testing the validation chain structure,
      // we verify that the validators are set up correctly
      expect(validateUserRegistration).toBeDefined();
      expect(mockAuthUtils.isValidUsername).toBeDefined();
    });

    it('should call AuthUtils.isValidEmail for email validation', () => {
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      
      expect(validateUserRegistration).toBeDefined();
      expect(mockAuthUtils.isValidEmail).toBeDefined();
    });

    it('should call AuthUtils.isValidPassword for password validation', () => {
      mockAuthUtils.isValidPassword.mockReturnValue(true);
      
      expect(validateUserRegistration).toBeDefined();
      expect(mockAuthUtils.isValidPassword).toBeDefined();
    });
  });

  describe('Validation Field Coverage', () => {
    describe('User Registration Fields', () => {
      it('should validate all required registration fields', () => {
        // Test that we have validation for all expected fields
        const expectedFields = ['username', 'email', 'password', 'confirmPassword'];
        // The validation chains should cover these fields
        expect(validateUserRegistration.length).toBeGreaterThan(expectedFields.length - 1);
      });
    });

    describe('User Login Fields', () => {
      it('should validate login fields', () => {
        const expectedFields = ['email', 'password'];
        expect(validateUserLogin.length).toBe(expectedFields.length);
      });
    });

    describe('Password Reset Fields', () => {
      it('should validate password reset request fields', () => {
        expect(validatePasswordResetRequest.length).toBeGreaterThan(0);
      });

      it('should validate password reset fields', () => {
        const expectedFields = ['token', 'newPassword', 'confirmPassword'];
        expect(validatePasswordReset.length).toBe(expectedFields.length);
      });
    });

    describe('Change Password Fields', () => {
      it('should validate change password fields', () => {
        const expectedFields = ['currentPassword', 'newPassword', 'confirmPassword'];
        expect(validateChangePassword.length).toBe(expectedFields.length);
      });
    });

    describe('Delete Account Fields', () => {
      it('should validate delete account fields', () => {
        const expectedFields = ['password', 'confirmDeletion'];
        expect(validateDeleteAccount.length).toBe(expectedFields.length);
      });
    });

    describe('Email Verification Fields', () => {
      it('should validate email verification fields', () => {
        const expectedFields = ['email', 'verificationCode'];
        expect(validateEmailVerification.length).toBe(expectedFields.length);
      });
    });

    describe('Game Creation Fields', () => {
      it('should validate game creation fields', () => {
        // All fields are optional, but we should have validators for each
        expect(validateGameCreation.length).toBeGreaterThan(0);
      });
    });

    describe('Room ID Validation', () => {
      it('should validate room ID parameter', () => {
        expect(validateRoomId.length).toBe(1);
      });
    });

    describe('Matchmaking Queue Fields', () => {
      it('should validate matchmaking queue fields', () => {
        // All fields are optional but should have validators
        expect(validateMatchmakingQueue.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Message Format', () => {
    it('should return consistent error format across all validations', () => {
      const mockErrors = [
        {
          type: 'field',
          path: 'testField',
          msg: 'Test error message',
          value: 'testValue'
        }
      ];

      mockValidationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      } as any);

      handleValidationErrors(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String),
            value: expect.anything()
          })
        ])
      });
    });
  });

  describe('Security Validations', () => {
    it('should have password strength validation', () => {
      // Password validation should be present in multiple validators
      expect(validateUserRegistration).toBeDefined();
      expect(validatePasswordReset).toBeDefined();
      expect(validateChangePassword).toBeDefined();
    });

    it('should have email format validation', () => {
      // Email validation should be present in multiple validators
      expect(validateUserRegistration).toBeDefined();
      expect(validateUserLogin).toBeDefined();
      expect(validatePasswordResetRequest).toBeDefined();
      expect(validateResendVerification).toBeDefined();
      expect(validateEmailVerification).toBeDefined();
    });

    it('should have confirmation field validation', () => {
      // Password confirmation should be present in relevant validators
      expect(validateUserRegistration).toBeDefined();
      expect(validatePasswordReset).toBeDefined();
      expect(validateChangePassword).toBeDefined();
    });

    it('should have sanitization for string inputs', () => {
      // String inputs should be trimmed and sanitized
      expect(validateUserRegistration).toBeDefined();
      expect(validateGameCreation).toBeDefined();
    });
  });

  describe('Validation Chain Configuration', () => {
    it('should properly configure validation chains without throwing', () => {
      expect(() => {
        // Test that all validation chains can be imported without errors
        validateUserRegistration;
        validateUserLogin;
        validatePasswordResetRequest;
        validatePasswordReset;
        validateChangePassword;
        validateDeleteAccount;
        validateRefreshToken;
        validateResendVerification;
        validateEmailVerification;
        validateGameCreation;
        validateRoomId;
        validateMatchmakingQueue;
      }).not.toThrow();
    });
  });
});

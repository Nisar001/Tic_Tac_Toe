import { AuthUtils } from '../../../src/utils/auth.utils';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

describe('AuthUtils Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      // Arrange
      const password = 'testPassword123';
      const salt = 'mockSalt';
      const hashedPassword = 'hashedPassword123';
      
      (mockedBcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Act
      const result = await AuthUtils.hashPassword(password);

      // Assert
      expect(mockedBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, salt);
      expect(result).toBe(hashedPassword);
    });

    it('should handle bcrypt errors', async () => {
      // Arrange
      const password = 'testPassword123';
      (mockedBcrypt.genSalt as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      // Act & Assert
      await expect(AuthUtils.hashPassword(password)).rejects.toThrow('Password hashing failed');
    });
  });

  describe('comparePassword', () => {
    it('should compare passwords successfully', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await AuthUtils.comparePassword(password, hashedPassword);

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      // Arrange
      const password = 'wrongPassword';
      const hashedPassword = 'hashedPassword123';
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await AuthUtils.comparePassword(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle bcrypt compare errors', async () => {
      // Arrange
      const password = 'testPassword123';
      const hashedPassword = 'hashedPassword123';
      (mockedBcrypt.compare as jest.Mock).mockRejectedValue(new Error('Compare error'));

      // Act & Assert
      await expect(AuthUtils.comparePassword(password, hashedPassword)).rejects.toThrow('Password comparison failed');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate access token successfully', () => {
      // Arrange
      const payload = { userId: '123', email: 'test@example.com' };
      const mockToken = 'mockAccessToken';
      (mockedJwt.sign as jest.Mock).mockReturnValue(mockToken);

      // Act
      const result = AuthUtils.generateAccessToken(payload);

      // Assert
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        { expiresIn: '15m' }
      );
      expect(result).toBe(mockToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token successfully', () => {
      // Arrange
      const payload = { userId: '123' };
      const mockToken = 'mockRefreshToken';
      (mockedJwt.sign as jest.Mock).mockReturnValue(mockToken);

      // Act
      const result = AuthUtils.generateRefreshToken(payload);

      // Assert
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        'test-refresh-secret',
        { expiresIn: '7d' }
      );
      expect(result).toBe(mockToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify access token successfully', () => {
      // Arrange
      const token = 'validToken';
      const decoded = { userId: '123', email: 'test@example.com' };
      (mockedJwt.verify as jest.Mock).mockReturnValue(decoded);

      // Act
      const result = AuthUtils.verifyAccessToken(token);

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-secret');
      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid token', () => {
      // Arrange
      const token = 'invalidToken';
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => AuthUtils.verifyAccessToken(token)).toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify refresh token successfully', () => {
      // Arrange
      const token = 'validRefreshToken';
      const decoded = { userId: '123' };
      (mockedJwt.verify as jest.Mock).mockReturnValue(decoded);

      // Act
      const result = AuthUtils.verifyRefreshToken(token);

      // Assert
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, 'test-refresh-secret');
      expect(result).toEqual(decoded);
    });

    it('should throw error for invalid refresh token', () => {
      // Arrange
      const token = 'invalidRefreshToken';
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => AuthUtils.verifyRefreshToken(token)).toThrow('Invalid refresh token');
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      // Arrange
      const userId = '123';
      const email = 'test@example.com';
      const mockAccessToken = 'mockAccessToken';
      const mockRefreshToken = 'mockRefreshToken';
      
      (mockedJwt.sign as jest.Mock)
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Act
      const result = AuthUtils.generateTokenPair(userId, email);

      // Assert
      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken
      });
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate email verification token', () => {
      // Arrange
      const mockBuffer = Buffer.from('mockhexstring');
      (mockedCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      mockBuffer.toString = jest.fn().mockReturnValue('mockhextoken');

      // Act
      const result = AuthUtils.generateEmailVerificationToken();

      // Assert
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe('mockhextoken');
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate password reset token', () => {
      // Arrange
      const mockBuffer = Buffer.from('mockhexstring');
      (mockedCrypto.randomBytes as jest.Mock).mockReturnValue(mockBuffer);
      mockBuffer.toString = jest.fn().mockReturnValue('mockresethex');

      // Act
      const result = AuthUtils.generatePasswordResetToken();

      // Assert
      expect(mockedCrypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe('mockresethex');
    });
  });

  describe('isValidEmail', () => {
    it('should validate valid email addresses', () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      // Act & Assert
      validEmails.forEach(email => {
        expect(AuthUtils.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      // Arrange
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com',
        'test@.com',
        ''
      ];

      // Act & Assert
      invalidEmails.forEach(email => {
        expect(AuthUtils.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      // Arrange
      const validPasswords = [
        'Password123',
        'MyStr0ng',
        'Complex1ty',
        'Secure123'
      ];

      // Act & Assert
      validPasswords.forEach(password => {
        expect(AuthUtils.isValidPassword(password)).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      // Arrange
      const invalidPasswords = [
        'password', // no number
        'PASSWORD', // no lowercase
        '12345678', // no letters
        'Pass1', // too short
        ''
      ];

      // Act & Assert
      invalidPasswords.forEach(password => {
        expect(AuthUtils.isValidPassword(password)).toBe(false);
      });
    });
  });

  describe('isValidUsername', () => {
    it('should validate valid usernames', () => {
      // Arrange
      const validUsernames = ['testuser', 'user123', 'test_user', 'User_123'];

      // Act & Assert
      validUsernames.forEach(username => {
        expect(AuthUtils.isValidUsername(username)).toBe(true);
      });
    });

    it('should reject invalid usernames', () => {
      // Arrange
      const invalidUsernames = ['ab', 'user@domain', 'user-name', ''];

      // Act & Assert
      invalidUsernames.forEach(username => {
        expect(AuthUtils.isValidUsername(username)).toBe(false);
      });
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      // Arrange
      const authHeader = 'Bearer validToken123';

      // Act
      const result = AuthUtils.extractTokenFromHeader(authHeader);

      // Assert
      expect(result).toBe('validToken123');
    });

    it('should return null for invalid header format', () => {
      // Arrange
      const invalidHeaders = [
        'validToken123',
        'Basic validToken123',
        'Bearer',
        'Bearer ',
        ''
      ];

      // Act & Assert
      invalidHeaders.forEach(header => {
        expect(AuthUtils.extractTokenFromHeader(header)).toBe(null);
      });
    });

    it('should return null for null/undefined header', () => {
      // Act & Assert
      expect(AuthUtils.extractTokenFromHeader(null as any)).toBe(null);
      expect(AuthUtils.extractTokenFromHeader(undefined)).toBe(null);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate verification code with default length', () => {
      // Act
      const result = AuthUtils.generateVerificationCode();

      // Assert
      expect(result).toHaveLength(6);
      expect(/^\d{6}$/.test(result)).toBe(true);
    });

    it('should generate verification code with custom length', () => {
      // Act
      const result = AuthUtils.generateVerificationCode(4);

      // Assert
      expect(result).toHaveLength(4);
      expect(/^\d{4}$/.test(result)).toBe(true);
    });
  });

  describe('calculateXPForLevel', () => {
    it('should calculate XP required for level', () => {
      // Act & Assert
      expect(AuthUtils.calculateXPForLevel(1)).toBe(100);
      expect(AuthUtils.calculateXPForLevel(2)).toBe(120);
      expect(AuthUtils.calculateXPForLevel(3)).toBe(144);
    });
  });

  describe('isSuspiciousEmail', () => {
    it('should detect suspicious email patterns', () => {
      // Arrange
      const suspiciousEmails = [
        'test++@example.com', // multiple + signs
        'test..user@example.com', // consecutive dots
        'test@user@example.com', // multiple @ signs
        'test<script>@example.com', // HTML injection
        '12345@example.com', // starts with numbers only
        'test@12345' // ends with numbers only
      ];

      // Act & Assert
      suspiciousEmails.forEach(email => {
        expect(AuthUtils.isSuspiciousEmail(email)).toBe(true);
      });
    });

    it('should not flag valid emails as suspicious', () => {
      // Arrange
      const validEmails = [
        'test@example.com',
        'user.name@domain.com',
        'user+tag@example.com'
      ];

      // Act & Assert
      validEmails.forEach(email => {
        expect(AuthUtils.isSuspiciousEmail(email)).toBe(false);
      });
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      // Arrange
      const commonPasswords = ['password', 'password123', '123456', 'admin'];

      // Act & Assert
      commonPasswords.forEach(password => {
        expect(AuthUtils.isCommonPassword(password)).toBe(true);
      });
    });

    it('should not flag strong passwords as common', () => {
      // Arrange
      const strongPasswords = ['MyStrongPassword123!', 'UniquePass456$'];

      // Act & Assert
      strongPasswords.forEach(password => {
        expect(AuthUtils.isCommonPassword(password)).toBe(false);
      });
    });
  });

  describe('isValidUsernameSecure', () => {
    it('should validate secure usernames', () => {
      // Act
      const result = AuthUtils.isValidUsernameSecure('validuser123');

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should reject reserved usernames', () => {
      // Act
      const result = AuthUtils.isValidUsernameSecure('admin');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('reserved word');
    });

    it('should reject numeric-only usernames', () => {
      // Act
      const result = AuthUtils.isValidUsernameSecure('123456');

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('only numbers');
    });
  });

  describe('isActionAllowed', () => {
    it('should allow action when no previous action', () => {
      // Act
      const result = AuthUtils.isActionAllowed(null, 5000);

      // Assert
      expect(result).toBe(true);
    });

    it('should allow action when cooldown has passed', () => {
      // Arrange
      const lastAction = new Date(Date.now() - 10000); // 10 seconds ago
      const cooldownMs = 5000; // 5 seconds

      // Act
      const result = AuthUtils.isActionAllowed(lastAction, cooldownMs);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny action when cooldown has not passed', () => {
      // Arrange
      const lastAction = new Date(Date.now() - 2000); // 2 seconds ago
      const cooldownMs = 5000; // 5 seconds

      // Act
      const result = AuthUtils.isActionAllowed(lastAction, cooldownMs);

      // Assert
      expect(result).toBe(false);
    });
  });
});

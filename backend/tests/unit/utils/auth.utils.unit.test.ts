// Unit tests for auth.utils.ts
import AuthUtils from '../../../src/utils/auth.utils';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../../../src/config';

describe('AuthUtils', () => {
  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = AuthUtils.generateAccessToken(payload);
      const decoded = jwt.verify(token, config.JWT_SECRET);
      expect(decoded).toMatchObject(payload);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = { userId: '123' };
      const token = AuthUtils.generateRefreshToken(payload);
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
      expect(decoded).toMatchObject(payload);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwt.sign(payload, config.JWT_SECRET);
      const result = AuthUtils.verifyAccessToken(token);
      expect(result).toMatchObject(payload);
    });

    it('should throw an error for an invalid access token', () => {
      expect(() => AuthUtils.verifyAccessToken('invalid_token')).toThrow('Invalid access token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload = { userId: '123' };
      const token = jwt.sign(payload, config.JWT_REFRESH_SECRET);
      const result = AuthUtils.verifyRefreshToken(token);
      expect(result).toMatchObject(payload);
    });

    it('should throw an error for an invalid refresh token', () => {
      expect(() => AuthUtils.verifyRefreshToken('invalid_token')).toThrow('Invalid refresh token');
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'password123';
      const hash = await AuthUtils.hashPassword(password);
      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);
    });
  });

  describe('comparePassword', () => {
    it('should compare a password with its hash', async () => {
      const password = 'password123';
      const hash = await bcrypt.hash(password, 12);
      const isMatch = await AuthUtils.comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for a mismatched password', async () => {
      const password = 'password123';
      const hash = await bcrypt.hash('differentPassword', 12);
      const isMatch = await AuthUtils.comparePassword(password, hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate a random email verification token', () => {
      const token = AuthUtils.generateEmailVerificationToken();
      expect(token).toHaveLength(64);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a random password reset token', () => {
      const token = AuthUtils.generatePasswordResetToken();
      expect(token).toHaveLength(64);
    });
  });

  describe('generatePasswordResetExpiry', () => {
    it('should generate a password reset expiry date', () => {
      const expiry = AuthUtils.generatePasswordResetExpiry();
      const now = new Date();
      expect(expiry.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('isValidEmail', () => {
    it('should validate a correct email', () => {
      expect(AuthUtils.isValidEmail('test@example.com')).toBe(true);
    });

    it('should invalidate an incorrect email', () => {
      expect(AuthUtils.isValidEmail('invalid-email')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate a correct password', () => {
      expect(AuthUtils.isValidPassword('Password1')).toBe(true);
    });

    it('should invalidate an incorrect password', () => {
      expect(AuthUtils.isValidPassword('short')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should validate a correct username', () => {
      expect(AuthUtils.isValidUsername('valid_username')).toBe(true);
    });

    it('should invalidate an incorrect username', () => {
      expect(AuthUtils.isValidUsername('invalid username')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize input by removing unsafe characters', () => {
      expect(AuthUtils.sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });
  });

  describe('generateGameId', () => {
    it('should generate a unique game ID', () => {
      const gameId = AuthUtils.generateGameId();
      expect(gameId).toMatch(/^game_\d+_[a-f0-9]{8}$/);
    });
  });

  describe('generateRoomId', () => {
    it('should generate a unique room ID', () => {
      const roomId = AuthUtils.generateRoomId();
      expect(roomId).toMatch(/^room_\d+_[a-f0-9]{8}$/);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from a valid Authorization header', () => {
      const token = AuthUtils.extractTokenFromHeader('Bearer valid_token');
      expect(token).toBe('valid_token');
    });

    it('should return null for an invalid Authorization header', () => {
      expect(AuthUtils.extractTokenFromHeader('InvalidHeader')).toBeNull();
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate a verification code of specified length', () => {
      const code = AuthUtils.generateVerificationCode(6);
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[0-9]{6}$/);
    });
  });

  describe('calculateXPForLevel', () => {
    it('should calculate XP required for a given level', () => {
      expect(AuthUtils.calculateXPForLevel(1)).toBe(100);
      expect(AuthUtils.calculateXPForLevel(2)).toBeGreaterThan(100);
    });
  });

  describe('calculateLevelFromXP', () => {
    it('should calculate level from total XP', () => {
      expect(AuthUtils.calculateLevelFromXP(100)).toBe(1);
      expect(AuthUtils.calculateLevelFromXP(300)).toBe(2);
    });
  });

  describe('getXPProgress', () => {
    it('should calculate XP progress for current level', () => {
      const progress = AuthUtils.getXPProgress(300);
      expect(progress.currentLevel).toBe(2);
      expect(progress.currentLevelXP).toBeGreaterThan(0);
      expect(progress.nextLevelXP).toBeGreaterThan(progress.currentLevelXP);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = AuthUtils.generateTokenPair('123', 'test@example.com');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a secure random token of specified length', () => {
      const token = AuthUtils.generateSecureToken(32);
      expect(token).toHaveLength(32);
    });
  });

  describe('verifyToken', () => {
    it('should verify an access token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwt.sign(payload, config.JWT_SECRET);
      const result = AuthUtils.verifyToken(token, 'access');
      expect(result).toMatchObject(payload);
    });

    it('should verify a refresh token', () => {
      const payload = { userId: '123' };
      const token = jwt.sign(payload, config.JWT_REFRESH_SECRET);
      const result = AuthUtils.verifyToken(token, 'refresh');
      expect(result).toMatchObject(payload);
    });

    it('should throw an error for an invalid token', () => {
      expect(() => AuthUtils.verifyToken('invalid_token')).toThrow('Invalid token');
    });
  });
});

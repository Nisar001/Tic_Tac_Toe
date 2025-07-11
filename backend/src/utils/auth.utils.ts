import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { JWTPayload } from '../types';

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;

  static generateAccessToken(payload: JWTPayload): string {
    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    if (!config.JWT_EXPIRES_IN) {
      throw new Error('JWT_EXPIRES_IN is not defined');
    }
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as any);
  }

  static generateRefreshToken(payload: { userId: string }): string {
    if (!config.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    if (!config.JWT_REFRESH_EXPIRES_IN) {
      throw new Error('JWT_REFRESH_EXPIRES_IN is not defined');
    }
    return jwt.sign(
      payload,
      config.JWT_REFRESH_SECRET,
      {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      } as any
    );
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  static generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generatePasswordResetExpiry(): Date {
    return new Date(Date.now() + 3600000); // 1 hour
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password: string): boolean {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return passwordRegex.test(password);
  }

  static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  static isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleaned);
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static generateGameId(): string {
    return `game_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  static generateRoomId(): string {
    return `room_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
  }

  static generateVerificationCode(length = 6): string {
    const digits = '0123456789';
    return Array.from({ length }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  }

  static calculateXPForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }

  static calculateLevelFromXP(totalXP: number): number {
    let level = 1;
    let accumulatedXP = 0;
    while (accumulatedXP <= totalXP) {
      accumulatedXP += this.calculateXPForLevel(level);
      if (accumulatedXP <= totalXP) level++;
    }
    return level;
  }

  static getXPProgress(totalXP: number): {
    currentLevel: number;
    currentLevelXP: number;
    nextLevelXP: number;
  } {
    const currentLevel = this.calculateLevelFromXP(totalXP);
    const xpForPreviousLevels = Array.from({ length: currentLevel - 1 }, (_, i) =>
      this.calculateXPForLevel(i + 1)
    ).reduce((a, b) => a + b, 0);

    return {
      currentLevel,
      currentLevelXP: totalXP - xpForPreviousLevels,
      nextLevelXP: this.calculateXPForLevel(currentLevel),
    };
  }

  static generateTokenPair(
    userId: string,
    email: string
  ): { accessToken: string; refreshToken: string } {
    const payload = { userId, email };
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ userId }),
    };
  }

  static generateSecureToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  static verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload | JwtPayload {
    const secret = type === 'access' ? config.JWT_SECRET : config.JWT_REFRESH_SECRET;
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === 'string') {
        throw new Error('Invalid token payload');
      }
      return decoded;
    } catch {
      throw new Error('Invalid token');
    }
  }

  static isSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /\+.*\+/, /\.{2,}/, /@.*@/, /[<>\"']/g, /^\d+@/, /@\d+$/, /(.)\1{4,}/
    ];
    return suspiciousPatterns.some((pattern) => pattern.test(email));
  }

  static validateAndSanitizeInput(input: string, maxLength = 255): string {
    if (typeof input !== 'string') throw new Error('Input must be a string');
    return input.trim().replace(/[<>\"'&]/g, '').substring(0, maxLength);
  }

  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', 'password123', '123456', '12345678', 'qwerty',
      'abc123', 'password1', 'admin', 'root', 'user', 'guest',
      'welcome', 'login', 'passw0rd', '1234567890'
    ];
    return commonPasswords.includes(password.toLowerCase());
  }

  static isValidUsernameSecure(username: string): { valid: boolean; reason?: string } {
    if (!this.isValidUsername(username)) {
      return { valid: false, reason: 'Username must be 3-20 characters with letters, numbers, and underscores only' };
    }

    const reservedWords = [
      'admin', 'root', 'user', 'guest', 'test', 'demo', 'system',
      'api', 'www', 'mail', 'ftp', 'support', 'help', 'info'
    ];

    if (reservedWords.includes(username.toLowerCase())) {
      return { valid: false, reason: 'Username cannot be a reserved word' };
    }

    if (/^\d+$/.test(username)) {
      return { valid: false, reason: 'Username cannot be only numbers' };
    }

    return { valid: true };
  }

  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static isActionAllowed(lastAction: Date | null, cooldownMs: number): boolean {
    return !lastAction || Date.now() - lastAction.getTime() >= cooldownMs;
  }
}

export default AuthUtils;

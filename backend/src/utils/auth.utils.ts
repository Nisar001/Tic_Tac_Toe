import * as jwt from 'jsonwebtoken';
import { Secret } from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { config } from '../config';
import { JWTPayload } from '../types';

export class AuthUtils {
  private static readonly SALT_ROUNDS = 10;

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

  static generateTokenPair(userId: string, email: string): { accessToken: string; refreshToken: string } {
    const accessToken = this.generateAccessToken({ userId, email, tokenType: 'access' });
    const refreshToken = this.generateRefreshToken({ userId });
    return { accessToken, refreshToken };
  }

  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
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

  static isValidUsernameSecure(username: string): { valid: boolean; reason?: string } {
    if (!username || typeof username !== 'string') {
      return { valid: false, reason: 'Username is required' };
    }
    
    if (username.length < 3) {
      return { valid: false, reason: 'Username must be at least 3 characters long' };
    }
    
    if (username.length > 20) {
      return { valid: false, reason: 'Username cannot exceed 20 characters' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, reason: 'Username can only contain letters, numbers and underscores' };
    }
    
    return { valid: true };
  }

  static validateAndSanitizeInput(input: string, maxLength: number = 100): string {
    if (!input || typeof input !== 'string') {
      throw new Error('Input is required and must be a string');
    }
    
    const sanitized = input.trim().replace(/[<>]/g, '');
    
    if (sanitized.length > maxLength) {
      throw new Error(`Input cannot exceed ${maxLength} characters`);
    }
    
    return sanitized;
  }

  static isSuspiciousEmail(email: string): boolean {
    const suspiciousPatterns = [
      /10minutemail/i,
      /tempmail/i,
      /guerrillamail/i,
      /mailinator/i,
      /throwaway/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(email));
  }

  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', '12345678', 'abc123', 'password1'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  static isActionAllowed(lastAction: Date | null, cooldownMs: number): boolean {
    return !lastAction || Date.now() - lastAction.getTime() >= cooldownMs;
  }

  static generateSecureToken(length = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  static verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
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
    try {
      // Validate inputs
      if (!password || !hash) {
        return false;
      }

      if (typeof password !== 'string' || typeof hash !== 'string') {
        return false;
      }

      if (hash.length !== 60 || !hash.startsWith('$2')) {
        return false;
      }
      
      const result = await bcrypt.compare(password, hash);
      return result;
    } catch (error) {
      // Use proper logger instead of console.error for production
      return false;
    }
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
}

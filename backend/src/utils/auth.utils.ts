import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { JWTPayload } from '../types';

export class AuthUtils {
  private static readonly SALT_ROUNDS = 12;

  static generateAccessToken(payload: { userId: string; email: string }): string {
    return jwt.sign(payload, config.JWT_SECRET as string, {
      expiresIn: config.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET as string, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET as string) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, config.JWT_REFRESH_SECRET as string) as { userId: string };
    } catch (error) {
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
    return new Date(Date.now() + 3600000); // 1 hour from now
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPassword(password: string): boolean {
    // At least 6 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
    return passwordRegex.test(password);
  }

  static isValidUsername(username: string): boolean {
    // 3-20 characters, letters, numbers, and underscores only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic international phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
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

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare password with hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate random verification code
   */
  static generateVerificationCode(length: number = 6): string {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  }

  /**
   * Calculate XP required for next level
   */
  static calculateXPForLevel(level: number): number {
    return Math.floor(100 * Math.pow(1.2, level - 1));
  }

  /**
   * Calculate level from total XP
   */
  static calculateLevelFromXP(totalXP: number): number {
    let level = 1;
    let xpRequired = 0;
    
    while (xpRequired <= totalXP) {
      xpRequired += this.calculateXPForLevel(level);
      if (xpRequired <= totalXP) {
        level++;
      }
    }
    
    return level;
  }

  /**
   * Get XP progress for current level
   */
  static getXPProgress(totalXP: number): { currentLevel: number; currentLevelXP: number; nextLevelXP: number } {
    const currentLevel = this.calculateLevelFromXP(totalXP);
    let xpUsed = 0;
    
    for (let i = 1; i < currentLevel; i++) {
      xpUsed += this.calculateXPForLevel(i);
    }
    
    const currentLevelXP = totalXP - xpUsed;
    const nextLevelXP = this.calculateXPForLevel(currentLevel);
    
    return {
      currentLevel,
      currentLevelXP,
      nextLevelXP
    };
  }

  /**
   * Generate both access and refresh tokens
   */
  static generateTokenPair(userId: any, email: string): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: userId.toString(),
      email
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ userId: userId.toString() })
    };
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Verify token with type
   */
  static verifyToken(token: string, type: 'access' | 'refresh' = 'access'): any {
    const secret = type === 'access' 
      ? config.JWT_SECRET as string
      : config.JWT_REFRESH_SECRET as string;

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

export default AuthUtils;

import * as jwt from 'jsonwebtoken';
import { JwtPayload, Secret } from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
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
    try {
      // Validate inputs
      if (!password || !hash) {
        console.log('❌ Invalid password or hash input');
        return false;
      }

      if (typeof password !== 'string' || typeof hash !== 'string') {
        console.log('❌ Password or hash is not a string');
        return false;
      }

      if (hash.length !== 60 || !hash.startsWith('$2')) {
        console.log('❌ Invalid bcrypt hash format');
        return false;
      }

      console.log('🔑 AuthUtils.comparePassword:');
      console.log('- Password length:', password.length);
      console.log('- Hash format valid:', /^\$2[aby]\$\d+\$/.test(hash));
      
      const result = await bcrypt.compare(password, hash);
      console.log('- Bcrypt comparison result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Password comparison error in AuthUtils:', error);
      return false;
    }
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

  static async testPasswordHashing(password: string): Promise<{ hash: string; isValid: boolean }> {
    try {
      console.log('🧪 Testing password hashing...');
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(password, salt);
      const isValid = await bcrypt.compare(password, hash);
      
      console.log('- Generated hash:', hash);
      console.log('- Hash verification:', isValid);
      
      return { hash, isValid };
    } catch (error) {
      console.error('❌ Password hashing test error:', error);
      throw error;
    }
  }

  // Debugging helper method to generate a fresh hash for testing
  static async generateTestHash(password: string): Promise<string> {
    console.log('🔧 Generating fresh hash for password:', JSON.stringify(password));
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    console.log('Generated hash:', hash);
    
    // Test the hash immediately
    const testResult = await bcrypt.compare(password, hash);
    console.log('Fresh hash test result:', testResult);
    
    return hash;
  }

  // Emergency password reset helper for debugging
  static async createDebugHash(): Promise<void> {
    console.log('🚨 Creating debug hashes for common passwords...');
    
    const testPasswords = [
      'SecurePass123!',
      'password123',
      'admin123',
      'test123',
      '123456'
    ];
    
    for (const pwd of testPasswords) {
      const hash = await bcrypt.hash(pwd, 12);
      console.log(`Password: "${pwd}" -> Hash: ${hash}`);
      
      // Verify each one
      const isValid = await bcrypt.compare(pwd, hash);
      console.log(`Verification: ${isValid}\n`);
    }
  }

  // Utility method to create a fresh password hash for testing/debugging
  static async createFreshPasswordHash(plainPassword: string): Promise<{hash: string, testResult: boolean}> {
    try {
      console.log('🔧 Creating fresh password hash...');
      console.log('- Plain password:', plainPassword);
      
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hash = await bcrypt.hash(plainPassword, salt);
      
      console.log('- Generated hash:', hash);
      
      // Test the hash immediately
      const testResult = await bcrypt.compare(plainPassword, hash);
      console.log('- Immediate test result:', testResult);
      
      return { hash, testResult };
    } catch (error) {
      console.error('❌ Error creating fresh hash:', error);
      throw error;
    }
  }

  // TEMPORARY: Emergency password reset method for debugging
  static async emergencyPasswordReset(email: string, newPassword: string): Promise<boolean> {
    try {
      console.log('🚨 EMERGENCY PASSWORD RESET');
      console.log('- Email:', email);
      console.log('- New password:', newPassword);

      // Import User model dynamically to avoid circular dependencies
      const User = (await import('../models/user.model')).default;
      
      // Find user
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        console.log('❌ User not found');
        return false;
      }

      // Generate new hash
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const newHash = await bcrypt.hash(newPassword, salt);
      
      console.log('- Generated new hash:', newHash);

      // Test the new hash
      const testResult = await bcrypt.compare(newPassword, newHash);
      console.log('- Hash test result:', testResult);

      if (!testResult) {
        console.log('❌ Hash test failed');
        return false;
      }

      // Update user password
      user.password = newHash;
      await user.save();

      console.log('✅ Password updated successfully');
      return true;

    } catch (error) {
      console.error('❌ Emergency password reset failed:', error);
      return false;
    }
  }
}

export default AuthUtils;

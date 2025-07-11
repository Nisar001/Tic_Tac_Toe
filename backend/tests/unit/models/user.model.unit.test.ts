import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import UserModel, { IUser } from '../../../src/models/user.model';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('../../../src/utils/logger');

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockLogger = {
  logError: logger.logError as jest.MockedFunction<typeof logger.logError>,
  logDebug: logger.logDebug as jest.MockedFunction<typeof logger.logDebug>
};

describe('User Model', () => {
  let validUserData: Partial<IUser>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    validUserData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      provider: 'manual',
      level: 1,
      xp: 0,
      energy: 5,
      maxEnergy: 5,
      stats: {
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        winRate: 0
      },
      friends: [],
      friendRequests: {
        sent: [],
        received: []
      }
    };

    // Setup bcrypt mocks
    (mockBcrypt.genSalt as any).mockResolvedValue('salt');
    (mockBcrypt.hash as any).mockResolvedValue('hashedpassword');
    (mockBcrypt.compare as any).mockResolvedValue(true);
  });

  describe('Schema Validation', () => {
    it('should validate a valid user', () => {
      const user = new UserModel(validUserData);
      const validationError = user.validateSync();
      
      expect(validationError).toBeUndefined();
    });

    it('should require email', () => {
      const user = new UserModel({ ...validUserData, email: undefined });
      const validationError = user.validateSync();
      
      expect(validationError?.errors.email).toBeDefined();
    });

    it('should require username', () => {
      const user = new UserModel({ ...validUserData, username: undefined });
      const validationError = user.validateSync();
      
      expect(validationError?.errors.username).toBeDefined();
    });

    it('should require provider', () => {
      const user = new UserModel({ ...validUserData, provider: undefined });
      const validationError = user.validateSync();
      
      expect(validationError?.errors.provider).toBeDefined();
    });

    it('should validate email format', () => {
      const user = new UserModel({ ...validUserData, email: 'invalid-email' });
      const validationError = user.validateSync();
      
      expect(validationError?.errors.email).toBeDefined();
    });

    it('should validate username length and format', () => {
      let user = new UserModel({ ...validUserData, username: 'ab' }); // Too short
      let validationError = user.validateSync();
      expect(validationError?.errors.username).toBeDefined();

      user = new UserModel({ ...validUserData, username: 'a'.repeat(25) }); // Too long
      validationError = user.validateSync();
      expect(validationError?.errors.username).toBeDefined();

      user = new UserModel({ ...validUserData, username: 'user@name' }); // Invalid characters
      validationError = user.validateSync();
      expect(validationError?.errors.username).toBeDefined();
    });

    it('should validate provider enum', () => {
      const user = new UserModel({ ...validUserData, provider: 'invalid' as any });
      const validationError = user.validateSync();
      
      expect(validationError?.errors.provider).toBeDefined();
    });

    it('should set default values correctly', () => {
      const user = new UserModel({
        email: 'test@example.com',
        username: 'testuser',
        provider: 'manual'
      });
      
      expect(user.level).toBe(1);
      expect(user.xp).toBe(0);
      expect(user.energy).toBe(5);
      expect(user.maxEnergy).toBe(5);
      expect(user.isOnline).toBe(false);
      expect(user.isEmailVerified).toBe(false);
      expect(user.failedLoginAttempts).toBe(0);
      expect(user.isLocked).toBe(false);
    });
  });

  describe('Pre-save Middleware', () => {
    it('should hash password before saving', async () => {
      const user = new UserModel(validUserData);
      user.password = 'newpassword';
      
      // Mock the save operation
      await user.validate();
      // Simulate pre-save middleware execution
      const preSaveHook = UserModel.schema.pre.bind(UserModel.schema);
      
      expect(mockBcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword', 'salt');
    });

    it('should not hash password if not modified', async () => {
      const user = new UserModel(validUserData);
      user.isModified = jest.fn().mockReturnValue(false);
      
      await user.validate();
      
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
    });

    it('should handle password hashing errors', async () => {
      const user = new UserModel(validUserData);
      (mockBcrypt.hash as any).mockRejectedValue(new Error('Hashing failed'));
      
      user.password = 'newpassword';
      
      // The error should be logged
      // Note: In actual implementation, this would prevent saving
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('Password hashing error')
      );
    });

    it('should validate password length before hashing', async () => {
      const user = new UserModel({ ...validUserData, password: '123' }); // Too short
      const validationError = user.validateSync();
      
      expect(validationError?.errors.password).toBeDefined();
    });

    it('should calculate win rate and level before saving', async () => {
      const user = new UserModel({
        ...validUserData,
        stats: { wins: 7, losses: 3, draws: 0, gamesPlayed: 10, winRate: 0 },
        xp: 250
      });
      
      user.sanitizeData();
      const validation = user.validateUserData();
      user.stats.winRate = user.calculateWinRate();
      user.level = user.calculateLevel();
      
      expect(user.stats.winRate).toBe(70);
      expect(user.level).toBeGreaterThan(1);
    });
  });

  describe('Instance Methods', () => {
    describe('comparePassword', () => {
      it('should compare passwords correctly', async () => {
        const user = new UserModel(validUserData);
        user.password = 'hashedpassword';
        
        const result = await user.comparePassword('password123');
        
        expect(result).toBe(true);
        expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
      });

      it('should return false for incorrect password', async () => {
        const user = new UserModel(validUserData);
        user.password = 'hashedpassword';
        (mockBcrypt.compare as any).mockResolvedValue(false);
        
        const result = await user.comparePassword('wrongpassword');
        
        expect(result).toBe(false);
      });

      it('should return false when password is missing', async () => {
        const user = new UserModel(validUserData);
        user.password = undefined;
        
        const result = await user.comparePassword('password123');
        
        expect(result).toBe(false);
        expect(mockLogger.logDebug).toHaveBeenCalledWith(
          expect.stringContaining('Password comparison failed: missing password data')
        );
      });

      it('should return false when candidate password is invalid', async () => {
        const user = new UserModel(validUserData);
        user.password = 'hashedpassword';
        
        const result = await user.comparePassword(null as any);
        
        expect(result).toBe(false);
      });

      it('should handle bcrypt comparison errors', async () => {
        const user = new UserModel(validUserData);
        user.password = 'hashedpassword';
        (mockBcrypt.compare as any).mockRejectedValue(new Error('Comparison failed'));
        
        const result = await user.comparePassword('password123');
        
        expect(result).toBe(false);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Password comparison error')
        );
      });
    });

    describe('calculateWinRate', () => {
      it('should calculate win rate correctly', () => {
        const user = new UserModel({
          ...validUserData,
          stats: { wins: 7, losses: 3, draws: 0, gamesPlayed: 10, winRate: 0 }
        });
        
        const winRate = user.calculateWinRate();
        
        expect(winRate).toBe(70);
      });

      it('should return 0 for no games played', () => {
        const user = new UserModel({
          ...validUserData,
          stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 }
        });
        
        const winRate = user.calculateWinRate();
        
        expect(winRate).toBe(0);
      });

      it('should handle missing stats', () => {
        const user = new UserModel(validUserData);
        user.stats = undefined as any;
        
        const winRate = user.calculateWinRate();
        
        expect(winRate).toBe(0);
      });

      it('should handle negative values', () => {
        const user = new UserModel({
          ...validUserData,
          stats: { wins: -5, losses: 3, draws: 0, gamesPlayed: 10, winRate: 0 }
        });
        
        const winRate = user.calculateWinRate();
        
        expect(winRate).toBe(0); // Should use Math.max(0, wins)
      });

      it('should handle calculation errors', () => {
        const user = new UserModel(validUserData);
        // Mock Math.round to throw error
        const originalRound = Math.round;
        Math.round = jest.fn(() => {
          throw new Error('Math error');
        });
        
        const winRate = user.calculateWinRate();
        
        expect(winRate).toBe(0);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Win rate calculation error')
        );
        
        // Restore Math.round
        Math.round = originalRound;
      });
    });

    describe('calculateLevel', () => {
      it('should calculate level correctly for low XP', () => {
        const user = new UserModel({ ...validUserData, xp: 50 });
        
        const level = user.calculateLevel();
        
        expect(level).toBe(1);
      });

      it('should calculate level correctly for medium XP', () => {
        const user = new UserModel({ ...validUserData, xp: 250 });
        
        const level = user.calculateLevel();
        
        expect(level).toBeGreaterThan(1);
      });

      it('should cap level at maximum', () => {
        const user = new UserModel({ ...validUserData, xp: 999999999 });
        
        const level = user.calculateLevel();
        
        expect(level).toBeLessThanOrEqual(100);
      });

      it('should handle negative XP', () => {
        const user = new UserModel({ ...validUserData, xp: -100 });
        
        const level = user.calculateLevel();
        
        expect(level).toBe(1);
      });

      it('should handle calculation errors', () => {
        const user = new UserModel(validUserData);
        // Mock Math.pow to throw error
        const originalPow = Math.pow;
        Math.pow = jest.fn(() => {
          throw new Error('Math error');
        });
        
        const level = user.calculateLevel();
        
        expect(level).toBe(1);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Level calculation error')
        );
        
        // Restore Math.pow
        Math.pow = originalPow;
      });
    });

    describe('addXP', () => {
      it('should add XP correctly', () => {
        const user = new UserModel({ ...validUserData, xp: 100 });
        
        user.addXP(50);
        
        expect(user.xp).toBe(150);
        expect(user.level).toBeGreaterThanOrEqual(1);
      });

      it('should reject negative XP', () => {
        const user = new UserModel({ ...validUserData, xp: 100 });
        
        user.addXP(-50);
        
        expect(user.xp).toBe(100); // Should remain unchanged
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Invalid XP value')
        );
      });

      it('should reject invalid XP types', () => {
        const user = new UserModel({ ...validUserData, xp: 100 });
        
        user.addXP('invalid' as any);
        
        expect(user.xp).toBe(100);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Invalid XP value')
        );
      });

      it('should cap XP gain to prevent abuse', () => {
        const user = new UserModel({ ...validUserData, xp: 100 });
        
        user.addXP(50000); // Very large XP gain
        
        expect(user.xp).toBe(10100); // Should be capped to maxXPGain (10000)
      });

      it('should handle XP addition errors', () => {
        const user = new UserModel(validUserData);
        // Mock calculateLevel to throw error
        user.calculateLevel = jest.fn(() => {
          throw new Error('Level calculation error');
        });
        
        user.addXP(50);
        
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Add XP error')
        );
      });
    });

    describe('canPlayGame', () => {
      it('should return true when energy is available', () => {
        const user = new UserModel({ ...validUserData, energy: 3 });
        
        const canPlay = user.canPlayGame();
        
        expect(canPlay).toBe(true);
      });

      it('should return false when energy is zero', () => {
        const user = new UserModel({ ...validUserData, energy: 0 });
        
        const canPlay = user.canPlayGame();
        
        expect(canPlay).toBe(false);
      });

      it('should regenerate energy before checking', () => {
        const user = new UserModel({
          ...validUserData,
          energy: 0,
          energyUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        });
        user.regenerateEnergy = jest.fn();
        
        user.canPlayGame();
        
        expect(user.regenerateEnergy).toHaveBeenCalled();
      });

      it('should handle canPlayGame errors', () => {
        const user = new UserModel(validUserData);
        user.regenerateEnergy = jest.fn(() => {
          throw new Error('Regeneration error');
        });
        
        const canPlay = user.canPlayGame();
        
        expect(canPlay).toBe(false);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Can play game check error')
        );
      });
    });

    describe('consumeEnergy', () => {
      it('should consume energy when available', () => {
        const user = new UserModel({ ...validUserData, energy: 3 });
        user.regenerateEnergy = jest.fn();
        
        const consumed = user.consumeEnergy();
        
        expect(consumed).toBe(true);
        expect(user.energy).toBe(2);
        expect(user.energyUpdatedAt).toBeInstanceOf(Date);
      });

      it('should not consume energy when none available', () => {
        const user = new UserModel({ ...validUserData, energy: 0 });
        user.regenerateEnergy = jest.fn();
        
        const consumed = user.consumeEnergy();
        
        expect(consumed).toBe(false);
        expect(user.energy).toBe(0);
      });

      it('should regenerate energy before consuming', () => {
        const user = new UserModel({ ...validUserData, energy: 1 });
        user.regenerateEnergy = jest.fn();
        
        user.consumeEnergy();
        
        expect(user.regenerateEnergy).toHaveBeenCalled();
      });

      it('should handle energy consumption errors', () => {
        const user = new UserModel(validUserData);
        user.regenerateEnergy = jest.fn(() => {
          throw new Error('Regeneration error');
        });
        
        const consumed = user.consumeEnergy();
        
        expect(consumed).toBe(false);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Energy consumption error')
        );
      });
    });

    describe('regenerateEnergy', () => {
      beforeEach(() => {
        // Mock Date.now for consistent testing
        jest.spyOn(Date, 'now').mockReturnValue(1000000);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should regenerate energy over time', () => {
        const now = Date.now();
        const user = new UserModel({
          ...validUserData,
          energy: 3,
          maxEnergy: 5,
          energyUpdatedAt: new Date(now - 2 * 60 * 60 * 1000) // 2 hours ago
        });
        
        user.regenerateEnergy();
        
        expect(user.energy).toBe(4); // Should gain 1 energy (2 hours / 1.5 hours per energy)
      });

      it('should not exceed max energy', () => {
        const now = Date.now();
        const user = new UserModel({
          ...validUserData,
          energy: 4,
          maxEnergy: 5,
          energyUpdatedAt: new Date(now - 10 * 60 * 60 * 1000) // 10 hours ago
        });
        
        user.regenerateEnergy();
        
        expect(user.energy).toBe(5); // Should cap at maxEnergy
      });

      it('should handle negative time differences', () => {
        const now = Date.now();
        const user = new UserModel({
          ...validUserData,
          energy: 3,
          energyUpdatedAt: new Date(now + 60 * 60 * 1000) // 1 hour in future
        });
        
        user.regenerateEnergy();
        
        expect(user.energyUpdatedAt.getTime()).toBe(now);
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Negative time difference detected')
        );
      });

      it('should handle missing energyUpdatedAt', () => {
        const user = new UserModel({
          ...validUserData,
          energy: 3,
          energyUpdatedAt: undefined as any
        });
        
        user.regenerateEnergy();
        
        // Should not crash and should set energyUpdatedAt
        expect(user.energyUpdatedAt).toBeInstanceOf(Date);
      });

      it('should handle regeneration errors', () => {
        const user = new UserModel(validUserData);
        // Mock Date constructor to throw error
        const originalDate = Date;
        global.Date = jest.fn(() => {
          throw new Error('Date error');
        }) as any;
        global.Date.now = Date.now;
        
        user.regenerateEnergy();
        
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Energy regeneration error')
        );
        
        // Restore Date
        global.Date = originalDate;
      });
    });

    describe('sanitizeData', () => {
      it('should sanitize string fields', () => {
        const user = new UserModel({
          ...validUserData,
          email: '  TEST@EXAMPLE.COM  ',
          username: '  testuser  ',
          avatar: '  https://example.com/avatar.jpg  '
        });
        
        user.sanitizeData();
        
        expect(user.email).toBe('test@example.com');
        expect(user.username).toBe('testuser');
        expect(user.avatar).toBe('https://example.com/avatar.jpg');
      });

      it('should sanitize numeric fields', () => {
        const user = new UserModel({
          ...validUserData,
          level: 150, // Above max
          xp: -50, // Below min
          energy: 10, // Above max
          maxEnergy: 25 // Above limit
        });
        
        user.sanitizeData();
        
        expect(user.level).toBe(100); // Capped at 100
        expect(user.xp).toBe(0); // Set to minimum
        expect(user.energy).toBe(5); // Capped at maxEnergy
        expect(user.maxEnergy).toBe(20); // Capped at limit
      });

      it('should sanitize stats object', () => {
        const user = new UserModel({
          ...validUserData,
          stats: {
            wins: -5,
            losses: 10.7,
            draws: -2,
            gamesPlayed: 15.3,
            winRate: 0
          }
        });
        
        user.sanitizeData();
        
        expect(user.stats.wins).toBe(0);
        expect(user.stats.losses).toBe(10);
        expect(user.stats.draws).toBe(0);
        expect(user.stats.gamesPlayed).toBe(15);
      });

      it('should initialize missing stats', () => {
        const user = new UserModel(validUserData);
        user.stats = undefined as any;
        
        user.sanitizeData();
        
        expect(user.stats).toEqual({
          wins: 0,
          losses: 0,
          draws: 0,
          gamesPlayed: 0,
          winRate: 0
        });
      });

      it('should sanitize array fields', () => {
        const user = new UserModel(validUserData);
        user.friends = 'invalid' as any;
        user.friendRequests = 'invalid' as any;
        
        user.sanitizeData();
        
        expect(Array.isArray(user.friends)).toBe(true);
        expect(user.friendRequests).toEqual({ sent: [], received: [] });
      });

      it('should sanitize date fields', () => {
        const user = new UserModel(validUserData);
        user.energyUpdatedAt = 'invalid' as any;
        user.lastSeen = 'invalid' as any;
        
        user.sanitizeData();
        
        expect(user.energyUpdatedAt).toBeInstanceOf(Date);
        expect(user.lastSeen).toBeInstanceOf(Date);
      });

      it('should handle sanitization errors', () => {
        const user = new UserModel(validUserData);
        // Mock toString to throw error
        const originalToString = String.prototype.toString;
        String.prototype.toString = jest.fn(() => {
          throw new Error('ToString error');
        });
        
        user.sanitizeData();
        
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('Data sanitization error')
        );
        
        // Restore toString
        String.prototype.toString = originalToString;
      });
    });

    describe('validateUserData', () => {
      it('should validate correct user data', () => {
        const user = new UserModel(validUserData);
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect missing email', () => {
        const user = new UserModel(validUserData);
        user.email = '';
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Email is required and must be a string');
      });

      it('should detect invalid email format', () => {
        const user = new UserModel(validUserData);
        user.email = 'invalid-email';
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Email format is invalid');
      });

      it('should detect invalid username', () => {
        const user = new UserModel(validUserData);
        user.username = 'a'; // Too short
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Username must be between 3 and 20 characters');
      });

      it('should detect invalid provider', () => {
        const user = new UserModel(validUserData);
        user.provider = 'invalid' as any;
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Invalid provider');
      });

      it('should require password for manual provider', () => {
        const user = new UserModel(validUserData);
        user.provider = 'manual';
        user.password = '';
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain(
          'Password is required and must be at least 6 characters for manual registration'
        );
      });

      it('should validate numeric fields', () => {
        const user = new UserModel(validUserData);
        user.level = -1;
        user.xp = -5;
        user.energy = -1;
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Level must be a number between 1 and 100');
        expect(validation.errors).toContain('XP must be a non-negative number');
        expect(validation.errors).toContain('Energy must be a non-negative number');
      });

      it('should handle validation errors', () => {
        const user = new UserModel(validUserData);
        // Mock test method to throw error
        const originalTest = RegExp.prototype.test;
        RegExp.prototype.test = jest.fn(() => {
          throw new Error('Regex error');
        });
        
        const validation = user.validateUserData();
        
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Validation process failed');
        expect(mockLogger.logError).toHaveBeenCalledWith(
          expect.stringContaining('User data validation error')
        );
        
        // Restore test method
        RegExp.prototype.test = originalTest;
      });
    });
  });

  describe('JSON Transform', () => {
    it('should exclude sensitive fields from JSON output', () => {
      const user = new UserModel({
        ...validUserData,
        password: 'hashedpassword',
        emailVerificationToken: 'token123',
        resetPasswordToken: 'resettoken',
        resetPasswordExpires: new Date()
      });
      
      const json = user.toJSON();
      
      expect(json.password).toBeUndefined();
      expect(json.emailVerificationToken).toBeUndefined();
      expect(json.resetPasswordToken).toBeUndefined();
      expect(json.resetPasswordExpires).toBeUndefined();
      expect(json.email).toBe('test@example.com'); // Should include non-sensitive fields
    });
  });

  describe('Indexes', () => {
    it('should have correct indexes defined', () => {
      const indexes = UserModel.schema.indexes();
      
      const indexFields = indexes.map(index => Object.keys(index[0]));
      
      expect(indexFields).toContainEqual(['email']);
      expect(indexFields).toContainEqual(['username']);
      expect(indexFields).toContainEqual(['provider', 'providerId']);
      expect(indexFields).toContainEqual(['level']);
      expect(indexFields).toContainEqual(['isOnline']);
      expect(indexFields).toContainEqual(['stats.winRate']);
    });
  });
});

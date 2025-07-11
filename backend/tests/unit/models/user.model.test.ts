// User Model Unit Tests
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User, { IUser } from '../../../src/models/user.model';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  clearTestDatabase,
  generateTestEmail,
  generateTestUsername,
  generateTestPassword,
  TEST_CONSTANTS
} from '../../utils/testHelpers';

describe('User Model', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('User Creation', () => {
    it('should create a valid user with required fields', async () => {
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.provider).toBe('manual');
      expect(savedUser.isEmailVerified).toBe(false);
      expect(savedUser.level).toBe(1);
      expect(savedUser.xp).toBe(0);
      expect(savedUser.energy).toBe(5);
      expect(savedUser.maxEnergy).toBe(5);
      expect(savedUser.isOnline).toBe(false);
      expect(savedUser.stats).toEqual({
        wins: 0,
        losses: 0,
        draws: 0,
        gamesPlayed: 0,
        winRate: 0
      });
    });

    it('should hash the password before saving', async () => {
      const password = generateTestPassword();
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        password,
        provider: 'manual' as const
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.password).toBeDefined();
      expect(savedUser.password).not.toBe(password);
      expect(await bcrypt.compare(password, savedUser.password!)).toBe(true);
    });

    it('should not require password for social providers', async () => {
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        provider: 'google' as const,
        providerId: 'google_id_123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.password).toBeUndefined();
      expect(savedUser.provider).toBe('google');
      expect(savedUser.providerId).toBe('google_id_123');
    });

    it('should require password for manual provider', async () => {
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        provider: 'manual' as const
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const email = generateTestEmail();
      const userData1 = {
        email,
        username: generateTestUsername(),
        password: generateTestPassword(),
        provider: 'manual' as const
      };
      const userData2 = {
        email,
        username: generateTestUsername(),
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      const username = generateTestUsername();
      const userData1 = {
        email: generateTestEmail(),
        username,
        password: generateTestPassword(),
        provider: 'manual' as const
      };
      const userData2 = {
        email: generateTestEmail(),
        username,
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user1 = new User(userData1);
      await user1.save();

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        username: generateTestUsername(),
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate username length and format', async () => {
      // Too short username
      const userData1 = {
        email: generateTestEmail(),
        username: 'ab',
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user1 = new User(userData1);
      await expect(user1.save()).rejects.toThrow();

      // Invalid characters
      const userData2 = {
        email: generateTestEmail(),
        username: 'test@user',
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      const user2 = new User(userData2);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should validate password length for manual provider', async () => {
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        password: '123', // Too short
        provider: 'manual' as const
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User Methods', () => {
    let user: IUser;

    beforeEach(async () => {
      const userData = {
        email: generateTestEmail(),
        username: generateTestUsername(),
        password: generateTestPassword(),
        provider: 'manual' as const
      };

      user = new User(userData);
      await user.save();
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const password = generateTestPassword();
        user.password = await bcrypt.hash(password, 12);
        await user.save();

        const isMatch = await user.comparePassword(password);
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const password = generateTestPassword();
        user.password = await bcrypt.hash(password, 12);
        await user.save();

        const isMatch = await user.comparePassword('wrongpassword');
        expect(isMatch).toBe(false);
      });

      it('should handle undefined password', async () => {
        user.password = undefined;
        await user.save();

        const isMatch = await user.comparePassword('anypassword');
        expect(isMatch).toBe(false);
      });
    });

    describe('calculateWinRate', () => {
      it('should calculate correct win rate', () => {
        user.stats.wins = 7;
        user.stats.losses = 3;
        user.stats.draws = 0;
        user.stats.gamesPlayed = 10;

        const winRate = user.calculateWinRate();
        expect(winRate).toBe(70);
      });

      it('should return 0 for no games played', () => {
        user.stats.gamesPlayed = 0;

        const winRate = user.calculateWinRate();
        expect(winRate).toBe(0);
      });

      it('should handle draws correctly', () => {
        user.stats.wins = 5;
        user.stats.losses = 3;
        user.stats.draws = 2;
        user.stats.gamesPlayed = 10;

        const winRate = user.calculateWinRate();
        expect(winRate).toBe(50);
      });
    });

    describe('calculateLevel', () => {
      it('should calculate level based on XP', () => {
        user.xp = 150;
        const level = user.calculateLevel();
        expect(level).toBe(2); // Assuming 100 XP per level
      });

      it('should return 1 for low XP', () => {
        user.xp = 50;
        const level = user.calculateLevel();
        expect(level).toBe(1);
      });

      it('should cap at reasonable level', () => {
        user.xp = 10000;
        const level = user.calculateLevel();
        expect(level).toBeGreaterThan(1);
        expect(level).toBeLessThan(1000); // Reasonable cap
      });
    });

    describe('addXP', () => {
      it('should add XP and update level', () => {
        const initialXP = user.xp;
        const initialLevel = user.level;
        
        user.addXP(150);
        
        expect(user.xp).toBe(initialXP + 150);
        expect(user.totalXP).toBe((user.totalXP || 0) + 150);
        // Level should be recalculated
        const newLevel = user.calculateLevel();
        expect(user.level).toBe(newLevel);
      });

      it('should handle negative XP gracefully', () => {
        user.xp = 100;
        user.addXP(-50);
        
        expect(user.xp).toBe(50);
      });

      it('should not allow XP to go below 0', () => {
        user.xp = 50;
        user.addXP(-100);
        
        expect(user.xp).toBe(0);
      });
    });

    describe('canPlayGame', () => {
      it('should return true when user has energy', () => {
        user.energy = 3;
        expect(user.canPlayGame()).toBe(true);
      });

      it('should return false when user has no energy', () => {
        user.energy = 0;
        expect(user.canPlayGame()).toBe(false);
      });

      it('should consider account status', () => {
        user.energy = 5;
        user.isDeleted = true;
        expect(user.canPlayGame()).toBe(false);
      });

      it('should consider account lock status', () => {
        user.energy = 5;
        user.isLocked = true;
        user.lockedUntil = new Date(Date.now() + 3600000); // 1 hour in future
        expect(user.canPlayGame()).toBe(false);
      });
    });

    describe('consumeEnergy', () => {
      it('should consume energy when available', () => {
        user.energy = 3;
        const result = user.consumeEnergy();
        
        expect(result).toBe(true);
        expect(user.energy).toBe(2);
      });

      it('should not consume energy when none available', () => {
        user.energy = 0;
        const result = user.consumeEnergy();
        
        expect(result).toBe(false);
        expect(user.energy).toBe(0);
      });

      it('should update energy timestamp', () => {
        user.energy = 3;
        const beforeTime = new Date();
        user.consumeEnergy();
        
        expect(user.energyUpdatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      });
    });

    describe('regenerateEnergy', () => {
      it('should regenerate energy up to max', () => {
        user.energy = 2;
        user.maxEnergy = 5;
        user.energyUpdatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
        
        user.regenerateEnergy();
        
        expect(user.energy).toBeGreaterThan(2);
        expect(user.energy).toBeLessThanOrEqual(5);
      });

      it('should not exceed max energy', () => {
        user.energy = 5;
        user.maxEnergy = 5;
        
        user.regenerateEnergy();
        
        expect(user.energy).toBe(5);
      });
    });

    describe('sanitizeData', () => {
      it('should remove sensitive fields', () => {
        user.password = 'hashedpassword';
        user.refreshTokens = [{ token: 'token', createdAt: new Date(), expiresAt: new Date() }];
        
        user.sanitizeData();
        
        // Should remove sensitive data from object for responses
        const sanitized = user.toObject();
        expect(sanitized.password).toBeUndefined();
        expect(sanitized.refreshTokens).toBeUndefined();
      });
    });

    describe('validateUserData', () => {
      it('should validate correct user data', () => {
        const validation = user.validateUserData();
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      it('should detect invalid email', () => {
        user.email = 'invalid-email';
        const validation = user.validateUserData();
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('email'))).toBe(true);
      });

      it('should detect invalid username', () => {
        user.username = 'ab'; // Too short
        const validation = user.validateUserData();
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(error => error.includes('username'))).toBe(true);
      });
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Create test users
      const users = [
        {
          email: 'user1@test.com',
          username: 'user1',
          password: generateTestPassword(),
          provider: 'manual' as const,
          stats: { wins: 10, losses: 5, draws: 2, gamesPlayed: 17, winRate: 58.8 }
        },
        {
          email: 'user2@test.com',
          username: 'user2',
          password: generateTestPassword(),
          provider: 'manual' as const,
          stats: { wins: 8, losses: 8, draws: 4, gamesPlayed: 20, winRate: 40 }
        },
        {
          email: 'user3@test.com',
          username: 'user3',
          password: generateTestPassword(),
          provider: 'google' as const,
          providerId: 'google_123',
          stats: { wins: 15, losses: 3, draws: 1, gamesPlayed: 19, winRate: 78.9 }
        }
      ];

      await User.insertMany(users);
    });

    it('should find users by email', async () => {
      const user = await User.findOne({ email: 'user1@test.com' });
      expect(user).toBeTruthy();
      expect(user?.username).toBe('user1');
    });

    it('should find users by provider', async () => {
      const manualUsers = await User.find({ provider: 'manual' });
      expect(manualUsers).toHaveLength(2);

      const socialUsers = await User.find({ provider: 'google' });
      expect(socialUsers).toHaveLength(1);
    });

    it('should sort users by win rate', async () => {
      const topPlayers = await User.find({})
        .sort({ 'stats.winRate': -1 })
        .limit(2);

      expect(topPlayers).toHaveLength(2);
      expect(topPlayers[0].username).toBe('user3');
      expect(topPlayers[1].username).toBe('user1');
    });

    it('should find online users', async () => {
      await User.updateOne({ username: 'user1' }, { isOnline: true });
      
      const onlineUsers = await User.find({ isOnline: true });
      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0].username).toBe('user1');
    });
  });

  describe('User Indexes', () => {
    it('should have proper indexes for performance', async () => {
      const indexes = await User.collection.getIndexes();
      
      // Check for email index
      expect(Object.keys(indexes).some(key => key.includes('email'))).toBe(true);
      
      // Check for username index
      expect(Object.keys(indexes).some(key => key.includes('username'))).toBe(true);
    });
  });
});

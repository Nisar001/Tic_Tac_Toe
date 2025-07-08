// Unit tests for user.model.ts
import mongoose from 'mongoose';
import User, { IUser } from '../../../src/models/user.model';

describe('User Model', () => {
  it('should create a valid user instance', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      password: 'password123',
    };

    const user = new User(userData);
    const validationError = user.validateSync();

    expect(validationError).toBeUndefined();
    expect(user.email).toBe('test@example.com');
    expect(user.username).toBe('testuser');
    expect(user.provider).toBe('manual');
  });

  it('should throw validation error for missing required fields', async () => {
    const user = new User({});
    const validationError = user.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors['email']).toBeDefined();
    expect(validationError?.errors['username']).toBeDefined();
    expect(validationError?.errors['provider']).toBeDefined();
  });

  it('should hash password before saving', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      password: 'password123',
    };

    const user = new User(userData);
    await user.save();

    expect(user.password).not.toBe('password123');
    expect(await user.comparePassword('password123')).toBe(true);
  });

  it('should calculate win rate correctly', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      stats: {
        wins: 10,
        losses: 5,
        draws: 5,
        gamesPlayed: 20,
        winRate: 0,
      },
    };

    const user = new User(userData);
    user.stats.winRate = user.calculateWinRate();

    expect(user.stats.winRate).toBe(50);
  });

  it('should calculate level based on XP', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      xp: 500,
    };

    const user = new User(userData);
    user.level = user.calculateLevel();

    expect(user.level).toBeGreaterThan(1);
  });

  it('should regenerate energy correctly', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      energy: 0,
      maxEnergy: 5,
      energyUpdatedAt: new Date(Date.now() - (3 * 60 * 60 * 1000)), // 3 hours ago
    };

    const user = new User(userData);
    user.regenerateEnergy();

    expect(user.energy).toBeGreaterThan(0);
    expect(user.energy).toBeLessThanOrEqual(user.maxEnergy);
  });

  it('should consume energy correctly', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      energy: 3,
      maxEnergy: 5,
    };

    const user = new User(userData);
    const canPlay = user.consumeEnergy();

    expect(canPlay).toBe(true);
    expect(user.energy).toBe(2);
  });

  it('should prevent game play if energy is insufficient', async () => {
    const userData: Partial<IUser> = {
      email: 'test@example.com',
      username: 'testuser',
      provider: 'manual',
      energy: 0,
      maxEnergy: 5,
    };

    const user = new User(userData);
    const canPlay = user.canPlayGame();

    expect(canPlay).toBe(false);
  });
});

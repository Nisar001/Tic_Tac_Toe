import { Request, Response, NextFunction } from 'express';
import { login } from '../../../../src/modules/auth/controllers/login.controller';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { EnergyManager } from '../../../../src/utils/energy.utils';
import { createError } from '../../../../src/middlewares/error.middleware';
import { createMockEnergyStatus, createMockUser } from '../../../utils/testHelpers';

// Mock dependencies
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/utils/energy.utils');
jest.mock('../../../../src/models/user.model');
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    badRequest: jest.fn().mockImplementation((message) => new Error(message)),
    unauthorized: jest.fn().mockImplementation((message) => new Error(message))
  }
}));

const mockUser = {
  findOne: jest.fn()
};
jest.doMock('../../../../src/models/user.model', () => mockUser);

describe('Login Controller Unit Tests', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockAuthUtils: jest.Mocked<typeof AuthUtils>;
  let mockEnergyManager: jest.Mocked<typeof EnergyManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test User Agent')
    };
    
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
    mockEnergyManager = EnergyManager as jest.Mocked<typeof EnergyManager>;
  });

  describe('Successful login', () => {
    it('should login user successfully with valid credentials', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 80,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        level: 5,
        totalXP: 1000,
        avatar: 'avatar.jpg',
        stats: { gamesPlayed: 10 },
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockEnergyStatus = {
        currentEnergy: 85,
        energyToRegen: 5,
        timeToFullEnergy: 0
      };

      const mockTokens = {
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token'
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        ...mockEnergyStatus,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue(mockTokens);

      await login(req as Request, res as Response, next);

      expect(mockAuthUtils.isValidEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(mockAuthUtils.comparePassword).toHaveBeenCalledWith('password123', 'hashedpassword');
      expect(mockEnergyManager.calculateCurrentEnergy).toHaveBeenCalled();
      expect(mockAuthUtils.generateTokenPair).toHaveBeenCalledWith('user123', 'test@example.com');
      expect(mockUserData.save).toHaveBeenCalledTimes(2);
      
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            level: 5,
            totalXP: 1000,
            energy: 85,
            avatar: 'avatar.jpg',
            isEmailVerified: true,
            stats: { gamesPlayed: 10 }
          },
          tokens: mockTokens,
          energyStatus: mockEnergyStatus
        }
      });
    });

    it('should update user login timestamp and energy', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 50,
        lastEnergyUpdate: new Date(Date.now() - 60000),
        lastEnergyRegenTime: new Date(),
        lastLogin: new Date(), // Added lastLogin property
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockEnergyStatus = {
        currentEnergy: 60,
        energyToRegen: 10,
        timeToFullEnergy: 0
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        ...mockEnergyStatus,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      await login(req as Request, res as Response, next);

      expect(mockUserData.energy).toBe(60);
      expect(mockUserData.lastLogin).toBeInstanceOf(Date);
      expect(mockUserData.lastEnergyUpdate).toBeInstanceOf(Date);
      expect(mockUserData.refreshTokens).toHaveLength(1);
      expect(mockUserData.refreshTokens[0]).toEqual({
        token: 'token2',
        createdAt: expect.any(Date),
        expiresAt: expect.any(Date)
      });
    });
  });

  describe('Input validation', () => {
    it('should throw error when email is missing', async () => {
      req.body = { password: 'password123' };

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Email and password are required');
      expect(createError.badRequest).toHaveBeenCalledWith('Email and password are required');
    });

    it('should throw error when password is missing', async () => {
      req.body = { email: 'test@example.com' };

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Email and password are required');
      expect(createError.badRequest).toHaveBeenCalledWith('Email and password are required');
    });

    it('should throw error when both email and password are missing', async () => {
      req.body = {};

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Email and password are required');
      expect(createError.badRequest).toHaveBeenCalledWith('Email and password are required');
    });

    it('should throw error when email format is invalid', async () => {
      req.body = {
        email: 'invalid-email',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(false);

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Please provide a valid email address');
      expect(createError.badRequest).toHaveBeenCalledWith('Please provide a valid email address');
    });
  });

  describe('Authentication failures', () => {
    it('should throw error when user does not exist', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      });

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Invalid email or password');
      expect(createError.unauthorized).toHaveBeenCalledWith('Invalid email or password');
    });

    it('should throw error when password is incorrect', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true
      };

      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.comparePassword.mockResolvedValue(false);

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Invalid email or password');
      expect(createError.unauthorized).toHaveBeenCalledWith('Invalid email or password');
    });

    it('should throw error when email is not verified', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: false
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.comparePassword.mockResolvedValue(true);

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Please verify your email before logging in');
      expect(createError.unauthorized).toHaveBeenCalledWith('Please verify your email before logging in');
    });
  });

  describe('Energy management', () => {
    it('should calculate and update energy status correctly', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 30,
        lastEnergyUpdate: new Date(Date.now() - 300000), // 5 minutes ago
        lastEnergyRegenTime: new Date(Date.now() - 300000),
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockEnergyStatus = {
        currentEnergy: 50,
        energyToRegen: 20,
        timeToFullEnergy: 1800000 // 30 minutes
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        ...mockEnergyStatus,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      await login(req as Request, res as Response, next);

      expect(mockEnergyManager.calculateCurrentEnergy).toHaveBeenCalledWith(
        30,
        mockUserData.lastEnergyUpdate,
        mockUserData.lastEnergyRegenTime
      );
      expect(mockUserData.energy).toBe(50);
      expect(mockUserData.lastEnergyUpdate).toBeInstanceOf(Date);
    });

    it('should update energy regeneration time when energy increased', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 30,
        lastEnergyUpdate: new Date(Date.now() - 300000),
        lastEnergyRegenTime: new Date(Date.now() - 300000),
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockEnergyStatus = {
        currentEnergy: 50, // Higher than current energy
        energyToRegen: 20,
        timeToFullEnergy: 1800000
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        ...mockEnergyStatus,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      await login(req as Request, res as Response, next);

      expect(mockUserData.lastEnergyRegenTime).toBeInstanceOf(Date);
    });
  });

  describe('Token management', () => {
    it('should generate and store refresh token', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 100,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [] as Array<{ token: string; createdAt: Date; expiresAt: Date }>,
        save: jest.fn().mockResolvedValue(true)
      };

      const mockTokens = {
        accessToken: 'access.jwt.token',
        refreshToken: 'refresh.jwt.token'
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 100,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue(mockTokens);

      await login(req as Request, res as Response, next);

      expect(mockAuthUtils.generateTokenPair).toHaveBeenCalledWith('user123', 'test@example.com');
      expect(mockUserData.refreshTokens).toHaveLength(1);
      expect(mockUserData.refreshTokens[0].token).toBe('refresh.jwt.token');
      expect(mockUserData.refreshTokens[0].createdAt).toBeInstanceOf(Date);
      expect(mockUserData.refreshTokens[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should set refresh token expiry to 7 days', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 100,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [] as Array<{ token: string; createdAt: Date; expiresAt: Date }>,
        save: jest.fn().mockResolvedValue(true)
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 100,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      const beforeLogin = Date.now();
      await login(req as Request, res as Response, next);
      const afterLogin = Date.now();

      const refreshToken = mockUserData.refreshTokens[0];
      const expiryTime = refreshToken.expiresAt.getTime();
      const expectedMinExpiry = beforeLogin + 7 * 24 * 60 * 60 * 1000;
      const expectedMaxExpiry = afterLogin + 7 * 24 * 60 * 60 * 1000;

      expect(expiryTime).toBeGreaterThanOrEqual(expectedMinExpiry);
      expect(expiryTime).toBeLessThanOrEqual(expectedMaxExpiry);
    });
  });

  describe('Response format', () => {
    it('should return correct response structure', async () => {
      const mockUserData = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 75,
        level: 3,
        totalXP: 500,
        avatar: 'user-avatar.png',
        stats: { wins: 10, losses: 5 },
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      const mockEnergyStatus = {
        currentEnergy: 80,
        energyToRegen: 5,
        timeToFullEnergy: 300000
      };

      const mockTokens = {
        accessToken: 'access123',
        refreshToken: 'refresh123'
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        ...mockEnergyStatus,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue(mockTokens);

      await login(req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            level: 3,
            totalXP: 500,
            energy: 80, // Updated energy
            avatar: 'user-avatar.png',
            isEmailVerified: true,
            stats: { wins: 10, losses: 5 }
          },
          tokens: mockTokens,
          energyStatus: mockEnergyStatus
        }
      });
    });

    it('should not include password in response', async () => {
      const mockUserData = {
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 100,
        level: 1,
        totalXP: 0,
        avatar: null,
        stats: {},
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 100,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      await login(req as Request, res as Response, next);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.data.user).not.toHaveProperty('password');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors during user lookup', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Database connection failed');
    });

    it('should handle password comparison errors', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.comparePassword.mockRejectedValue(new Error('Password comparison failed'));

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Password comparison failed');
    });

    it('should handle token generation errors', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 100,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true)
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 100,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Token generation failed');
    });

    it('should handle user save errors', async () => {
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedpassword',
        isEmailVerified: true,
        energy: 100,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        refreshTokens: [],
        save: jest.fn().mockRejectedValue(new Error('Save failed'))
      };

      req.body = {
        email: 'test@example.com',
        password: 'password123'
      };

      mockAuthUtils.isValidEmail.mockReturnValue(true);
      mockUser.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      });
      mockAuthUtils.comparePassword.mockResolvedValue(true);
      mockEnergyManager.calculateCurrentEnergy.mockReturnValue({
        currentEnergy: 100,
        maxEnergy: 100,
        nextRegenTime: new Date(),
        timeUntilNextRegen: 0,
        canPlay: true
      });
      mockAuthUtils.generateTokenPair.mockReturnValue({
        accessToken: 'token1',
        refreshToken: 'token2'
      });

      await expect(login(req as Request, res as Response, next)).rejects.toThrow('Save failed');
    });
  });
});

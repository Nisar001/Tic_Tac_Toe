import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  checkEnergy,
  AuthenticatedRequest
} from '../../../src/middlewares/auth.middleware';
import AuthUtils from '../../../src/utils/auth.utils';
import User from '../../../src/models/user.model';


// Mock dependencies
jest.mock('../../../src/utils/auth.utils');
jest.mock('../../../src/models/user.model');
jest.mock('../../../src/utils/logger', () => ({
  logError: jest.fn(),
  logDebug: jest.fn()
}));

describe('Auth Middleware Unit Tests', () => {
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let mockAuthUtils: jest.Mocked<typeof AuthUtils>;
  let mockUser: jest.Mocked<typeof User>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    req = {
      headers: {},
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' } as any
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
    mockUser = User as jest.Mocked<typeof User>;

    // Reset rate limiting
    const authAttempts = new Map();
    Object.defineProperty(global, 'authAttempts', {
      value: authAttempts,
      writable: true
    });
  });

  describe('authenticate middleware', () => {
    it('should authenticate successfully with valid token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        isEmailVerified: true,
        isOnline: true,
        lastSeen: new Date()
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(mockAuthUtils.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${mockToken}`);
      expect(mockAuthUtils.verifyAccessToken).toHaveBeenCalledWith(mockToken);
      expect(mockUser.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual(mockUserData);
      expect(req.token).toBe(mockToken);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization header required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization header', async () => {
      req.headers!.authorization = 123 as any;

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization header required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when token extraction fails', async () => {
      req.headers!.authorization = 'Bearer invalid';
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format (too short)', async () => {
      const shortToken = 'abc';
      req.headers!.authorization = `Bearer ${shortToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(shortToken);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format (too long)', async () => {
      const longToken = 'a'.repeat(1001);
      req.headers!.authorization = `Bearer ${longToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(longToken);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token format'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when token verification fails', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;
      
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token payload', async () => {
      const mockToken = 'valid.jwt.token';
      const invalidDecoded = { exp: Date.now() / 1000 + 3600 }; // Missing userId
      
      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(invalidDecoded as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token payload'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      
      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication service temporarily unavailable'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request when user not found', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'nonexistent', email: 'nonexistent@example.com', exp: Date.now() / 1000 + 3600 };
      
      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request for unverified user', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        isEmailVerified: false
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email not verified',
        requiresVerification: true
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request for inactive user', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        isEmailVerified: true,
        isOnline: false,
        lastSeen: ninetyOneDaysAgo
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account has been inactive. Please contact support.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // Simulate multiple failed attempts
      for (let i = 0; i < 10; i++) {
        await authenticate(req as AuthenticatedRequest, res as Response, next);
      }

      // Next attempt should be rate limited
      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenLastCalledWith(429);
      expect(res.json).toHaveBeenLastCalledWith({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: 15 * 60
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;
      
      mockAuthUtils.extractTokenFromHeader.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication service error'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate middleware', () => {
    it('should continue without authentication when no header provided', async () => {
      await optionalAuthenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should authenticate successfully when valid token provided', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        isEmailVerified: true
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      await optionalAuthenticate(req as AuthenticatedRequest, res as Response, next);

      expect(req.user).toEqual(mockUserData);
      expect(req.token).toBe(mockToken);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      const mockToken = 'invalid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;
      
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await optionalAuthenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when user not verified', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123', email: 'test@example.com', exp: Date.now() / 1000 + 3600 };
      const mockUserData = {
        _id: 'user123',
        email: 'test@example.com',
        isEmailVerified: false
      };

      req.headers!.authorization = `Bearer ${mockToken}`;
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(mockDecoded);
      mockUser.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUserData)
      } as any);

      await optionalAuthenticate(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('checkEnergy middleware', () => {
    const mockUser = {
      _id: 'user123',
      energy: 10,
      energyUpdatedAt: new Date(),
      regenerateEnergy: jest.fn()
    };

    beforeEach(() => {
      req.user = {
        _id: new (require('mongoose').Types.ObjectId)(),
        lastRoomJoinTime: new Date(),
        email: 'test@example.com',
        password: 'hashed',
        username: 'testuser',
        provider: 'manual',
        level: 1,
        xp: 0,
        energy: 5,
        maxEnergy: 10,
        energyUpdatedAt: new Date(),
        isOnline: true,
        lastSeen: new Date(),
        friends: [],
        friendRequests: { sent: [], received: [] },
        stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 },
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        comparePassword: jest.fn(),
        calculateWinRate: jest.fn(),
        calculateLevel: jest.fn(),
        addXP: jest.fn(),
        canPlayGame: jest.fn(),
        consumeEnergy: jest.fn(),
        regenerateEnergy: jest.fn(),
        sanitizeData: jest.fn(),
      } as any;
    });

    it('should pass when user has sufficient energy', () => {
      const middleware = checkEnergy(5);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject when user has insufficient energy', () => {
      const middleware = checkEnergy(15);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient energy',
        currentEnergy: 10,
        requiredEnergy: 15,
        nextRegenTime: expect.any(Date)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user is not authenticated', () => {
      req.user = undefined;
      const middleware = checkEnergy(5);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid energy requirement', () => {
      const middleware = checkEnergy(-1);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid energy requirement configuration'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid user energy data', () => {
      req.user!.energy = 'invalid' as any;
      const middleware = checkEnergy(5);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User energy data is invalid'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should continue when energy regeneration fails', () => {
      req.user!.regenerateEnergy = jest.fn().mockImplementation(() => {
        throw new Error('Regeneration failed');
      });
      
      const middleware = checkEnergy(5);
      middleware(req as AuthenticatedRequest, res as Response, next);

      expect(next).toHaveBeenCalled();
      // logError is mocked globally at the top of the file
      expect(require('../../../src/utils/logger').logError).toHaveBeenCalled();
    });
  });


  describe('Error handling and edge cases', () => {
    it('should handle missing IP address gracefully', async () => {
      // Use a new request object without IP
      const reqWithoutIp = {
        headers: {},
        connection: undefined
      } as any;
      
      await authenticate(reqWithoutIp as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      // Should not crash due to missing IP
    });

    it('should handle malformed authorization header', async () => {
      req.headers!.authorization = '';

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authorization header required'
      });
    });

    it('should handle null token from extractTokenFromHeader', async () => {
      req.headers!.authorization = 'Bearer token';
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(null);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required'
      });
    });

    it('should handle undefined decoded token', async () => {
      const mockToken = 'valid.jwt.token';
      req.headers!.authorization = `Bearer ${mockToken}`;
      
      mockAuthUtils.extractTokenFromHeader.mockReturnValue(mockToken);
      mockAuthUtils.verifyAccessToken.mockReturnValue(undefined as any);

      await authenticate(req as AuthenticatedRequest, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token payload'
      });
    });
  });
});

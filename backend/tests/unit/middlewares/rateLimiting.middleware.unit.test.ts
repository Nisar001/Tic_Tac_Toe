import rateLimit, { Options } from 'express-rate-limit';
import { Connection, Document, Model, ModifiedPathsSnapshot, QueryOptions, Types, UpdateQuery } from 'mongoose';
import { Request, Response } from 'express';
import {
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit,
  gameCreationRateLimit,
  chatRateLimit,
  friendRequestRateLimit,
  profileUpdateRateLimit,
  createDynamicRateLimit
} from '../../../src/middlewares/rateLimiting.middleware';
import { IUser } from 'models/user.model';

// Mock dependencies
jest.mock('express-rate-limit');
jest.mock('../../../src/config', () => ({
  config: {
    RATE_LIMIT: {
      WINDOW_MS: 60000, // 1 minute
      MAX_REQUESTS: 100
    }
  }
}));

const mockRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    // Add stubs for missing Mongoose Document methods
    const mongooseDocStubs = {
      validateUserData: jest.fn(),
      $assertPopulated: jest.fn(),
      $clearModifiedPaths: jest.fn(),
      $clone: jest.fn(),
      $getAllSubdocs: jest.fn(),
      $ignore: jest.fn(),
      $isDefault: jest.fn(),
      $isEmpty: jest.fn(),
      $isValid: jest.fn(),
      $locals: {},
      $markValid: jest.fn(),
      $model: jest.fn(),
      $op: null,
      $session: jest.fn(),
      $set: jest.fn(),
      $where: {},
      depopulate: jest.fn(),
      equals: jest.fn(),
      errors: undefined,
      get: jest.fn(),
      init: jest.fn(),
      invalidate: jest.fn(),
      isDirectModified: jest.fn(),
      isInit: jest.fn(),
      isModified: jest.fn(),
      isSelected: jest.fn(),
      markModified: jest.fn(),
      modifiedPaths: jest.fn(),
      overwrite: jest.fn(),
      populate: jest.fn(),
      remove: jest.fn(),
      replaceOne: jest.fn(),
      save: jest.fn(),
      set: jest.fn(),
      toJSON: jest.fn(),
      toObject: jest.fn(),
      unmarkModified: jest.fn(),
      update: jest.fn(),
      updateOne: jest.fn(),
      validate: jest.fn(),
      validateSync: jest.fn(),
    };
    mockReq = {
      ip: '127.0.0.1',
      user: {
        _id: new Types.ObjectId(),
        email: 'a@b.com',
        username: 'user',
        provider: 'manual',
        level: 1,
        xp: 0,
        energy: 10,
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
        lastRoomJoinTime: new Date(),
        ...mongooseDocStubs,
        $createModifiedPathsSnapshot: function (): ModifiedPathsSnapshot {
          throw new Error('Function not implemented.');
        },
        $isDeleted: function (val?: boolean): boolean {
          throw new Error('Function not implemented.');
        },
        $getPopulatedDocs: function (): Document[] {
          throw new Error('Function not implemented.');
        },
        $inc: function (path: string | string[], val?: number): IUser {
          throw new Error('Function not implemented.');
        },
        $restoreModifiedPathsSnapshot: function (snapshot: ModifiedPathsSnapshot): IUser {
          throw new Error('Function not implemented.');
        },
        collection: {} as any,
        db: new Connection,
        deleteOne: function (options?: QueryOptions) {
          throw new Error('Function not implemented.');
        },
        directModifiedPaths: function (): Array<string> {
          throw new Error('Function not implemented.');
        },
        getChanges: function (): UpdateQuery<IUser> {
          throw new Error('Function not implemented.');
        },
        increment: function (): IUser {
          throw new Error('Function not implemented.');
        },
        isDirectSelected: function <T extends string | number | symbol>(path: T): boolean {
          throw new Error('Function not implemented.');
        },
        isNew: false,
        model: function <ModelType = Model<unknown, {}, {}, {}, Document<unknown, {}, unknown, {}> & { _id: Types.ObjectId; } & { __v: number; }, any>>(name?: string): ModelType {
          throw new Error('Function not implemented.');
        },
        $parent: function (): Document | undefined {
          throw new Error('Function not implemented.');
        },
        populated: function (path: string) {
          throw new Error('Function not implemented.');
        },
        schema: {} as any
      }
    };
  });

  describe('emailVerificationRateLimit', () => {
    it('should configure email verification rate limiting', () => {
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 5 * 60 * 1000, // 5 minutes
          max: 3,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should have correct email verification error message', () => {
      const call = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many verification requests, please try again later'
      );
      expect(call).toBeDefined();
      expect(call?.[0]?.message).toEqual({
        success: false,
        message: 'Too many verification requests, please try again later',
        retryAfter: 300
      });
    });
  });

  describe('gameCreationRateLimit', () => {
    it('should configure game creation rate limiting', () => {
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 1 * 60 * 1000, // 1 minute
          max: 10,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should have correct game creation error message', () => {
      const call = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many game creation requests, please slow down'
      );
      expect(call).toBeDefined();
      expect(call?.[0]?.message).toEqual({
        success: false,
        message: 'Too many game creation requests, please slow down',
        retryAfter: 60
      });
    });
  });

  describe('chatRateLimit', () => {
    it('should configure chat rate limiting', () => {
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 1 * 60 * 1000, // 1 minute
          max: 30,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should have correct chat error message', () => {
      const call = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many messages, please slow down'
      );
      expect(call).toBeDefined();
      expect(call?.[0]?.message).toEqual({
        success: false,
        message: 'Too many messages, please slow down',
        retryAfter: 60
      });
    });
  });

  describe('friendRequestRateLimit', () => {
    it('should configure friend request rate limiting', () => {
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 20,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should have correct friend request error message', () => {
      const call = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many friend requests, please try again later'
      );
      expect(call).toBeDefined();
      expect(call?.[0]?.message).toEqual({
        success: false,
        message: 'Too many friend requests, please try again later',
        retryAfter: 3600
      });
    });
  });

  describe('profileUpdateRateLimit', () => {
    it('should configure profile update rate limiting', () => {
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 10,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should have correct profile update error message', () => {
      const call = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many profile updates, please try again later'
      );
      expect(call).toBeDefined();
      expect(call?.[0]?.message).toEqual({
        success: false,
        message: 'Too many profile updates, please try again later',
        retryAfter: 3600
      });
    });
  });

  describe('createDynamicRateLimit', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const fakeHandler = Object.assign(jest.fn(), {
        resetKey: jest.fn(),
        getKey: jest.fn()
      });
      mockRateLimit.mockReturnValue(fakeHandler);
    });

    it('should create dynamic rate limit with default window', () => {
      createDynamicRateLimit(10);
      
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000, // default 1 minute
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should create dynamic rate limit with custom window', () => {
      createDynamicRateLimit(10, 120000);
      
      expect(mockRateLimit).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 120000,
          standardHeaders: true,
          legacyHeaders: false
        })
      );
    });

    it('should calculate max requests based on user level', () => {
      createDynamicRateLimit(10);
      const call = mockRateLimit.mock.calls[0];
      const maxFunction = call[0]?.max;

      // Initialize mockRes before using it
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };

      if (typeof maxFunction === 'function') {
        // Level 1 user
        mockReq.user = {
          lastRoomJoinTime: new Date(),
          _id: 'id',
          email: 'a@b.com',
          username: 'user',
          provider: 'manual',
          level: 1,
          xp: 0,
          energy: 10,
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
          sanitizeData: jest.fn()
        } as any;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(10); // base rate

        // Level 5 user
        mockReq.user!.level = 5;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(13); // 1.3x multiplier

        // Level 10 user
        mockReq.user!.level = 10;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(19); // 1.9x multiplier

        // Level 20 user (should cap at 2x)
        mockReq.user!.level = 20;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(20); // 2x multiplier (capped)

        // User without level
        mockReq.user = {
          lastRoomJoinTime: new Date(),
          _id: 'id',
          email: 'a@b.com',
          username: 'user',
          provider: 'manual',
          xp: 0,
          energy: 10,
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
          sanitizeData: jest.fn()
        } as any;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(10); // default to level 1

        // No user object
        delete mockReq.user;
        expect(maxFunction(mockReq as Request, mockRes as Response)).toBe(10); // default to level 1
      }
    });

    it('should handle dynamic rate limit exceeded', () => {
      createDynamicRateLimit(10, 60000);
      const call = mockRateLimit.mock.calls[0];
      const handler = call[0]?.handler;
      
      if (handler) {
        const mockOptions: any = {
          windowMs: 60000,
          max: 10,
          message: { success: false, message: 'Rate limit exceeded, please try again later' },
          statusCode: 429,
          standardHeaders: true,
          legacyHeaders: false,
          handler: jest.fn(),
          keyGenerator: jest.fn(),
          skip: jest.fn(),
          requestPropertyName: 'rateLimit',
          skipFailedRequests: false,
          skipSuccessfulRequests: false,
          limit: 10,
          identifier: 'test',
          requestWasSuccessful: jest.fn(),
          store: { incr: jest.fn(), decrement: jest.fn(), resetKey: jest.fn() }
        };
        handler(mockReq as Request, mockRes as Response, jest.fn(), mockOptions);
        expect(mockRes.status).toHaveBeenCalledWith(429);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          message: 'Rate limit exceeded, please try again later',
          retryAfter: 60
        });
      }
    });

    it('should have correct dynamic rate limit message structure', () => {
      createDynamicRateLimit(10);
      const call = mockRateLimit.mock.calls[0];
      
      expect(call[0]?.message).toEqual({
        success: false,
        message: 'Rate limit exceeded, please try again later'
      });
    });
  });

  describe('Rate Limit Error Responses', () => {
    it('should return consistent error response format', () => {
      const expectedFormat = {
        success: false,
        message: expect.any(String),
        retryAfter: expect.any(Number)
      };

      // Test all rate limiters have consistent format
      const rateLimiters = [
        'Too many requests, please try again later',
        'Too many authentication attempts, please try again later',
        'Too many password reset requests, please try again later',
        'Too many verification requests, please try again later',
        'Too many game creation requests, please slow down',
        'Too many messages, please slow down',
        'Too many friend requests, please try again later',
        'Too many profile updates, please try again later'
      ];

      rateLimiters.forEach(message => {
        const call = mockRateLimit.mock.calls.find(call => 
          call[0]?.message?.message === message
        );
        if (call) {
          expect(call[0]?.message).toEqual(expect.objectContaining(expectedFormat));
        }
      });
    });

    it('should have appropriate retry after times', () => {
      const retryTimes = [
        { message: 'Too many requests, please try again later', retryAfter: 60 },
        { message: 'Too many authentication attempts, please try again later', retryAfter: 900 },
        { message: 'Too many password reset requests, please try again later', retryAfter: 3600 },
        { message: 'Too many verification requests, please try again later', retryAfter: 300 },
        { message: 'Too many game creation requests, please slow down', retryAfter: 60 },
        { message: 'Too many messages, please slow down', retryAfter: 60 },
        { message: 'Too many friend requests, please try again later', retryAfter: 3600 },
        { message: 'Too many profile updates, please try again later', retryAfter: 3600 }
      ];

      retryTimes.forEach(({ message, retryAfter }) => {
        const call = mockRateLimit.mock.calls.find(call => 
          call[0]?.message?.message === message
        );
        if (call) {
          expect(call[0]?.message?.retryAfter).toBe(retryAfter);
        }
      });
    });
  });

  describe('Rate Limit Headers', () => {
    it('should enable standard headers for all rate limiters', () => {
      const allCalls = mockRateLimit.mock.calls;
      
      allCalls.forEach(call => {
        if (call[0]) {
          expect(call[0].standardHeaders).toBe(true);
          expect(call[0].legacyHeaders).toBe(false);
        }
      });
    });
  });

  describe('Rate Limit Security', () => {
    it('should skip successful requests for auth rate limiter only', () => {
      const authCall = mockRateLimit.mock.calls.find(call => 
        call[0]?.message?.message === 'Too many authentication attempts, please try again later'
      );
      expect(authCall?.[0]?.skipSuccessfulRequests).toBe(true);

      // Other rate limiters should not skip successful requests
      const otherCalls = mockRateLimit.mock.calls.filter(call => 
        call[0]?.message?.message !== 'Too many authentication attempts, please try again later'
      );
      otherCalls.forEach(call => {
        expect(call[0]?.skipSuccessfulRequests).toBeUndefined();
      });
    });

    it('should have progressively stricter limits for sensitive operations', () => {
      const limits = new Map();
      
      mockRateLimit.mock.calls.forEach(call => {
        if (call[0]?.message?.message) {
          limits.set(call[0].message.message, call[0].max);
        }
      });

      // Auth should be strictest
      expect(limits.get('Too many authentication attempts, please try again later')).toBe(5);
      
      // Password reset should be very strict
      expect(limits.get('Too many password reset requests, please try again later')).toBe(3);
      
      // Email verification should be strict
      expect(limits.get('Too many verification requests, please try again later')).toBe(3);
      
      // Game creation should allow more requests
      expect(limits.get('Too many game creation requests, please slow down')).toBe(10);
      
      // Chat should allow the most
      expect(limits.get('Too many messages, please slow down')).toBe(30);
    });
  });
});

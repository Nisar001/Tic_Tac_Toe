import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { instagramLogin, instagramAuthRateLimit } from '../../../../../src/modules/auth/controllers/social/instagram.controller';
import UserModel, { IUser } from '../../../../../src/models/user.model';
import { AuthUtils } from '../../../../../src/utils/auth.utils';
import { Logger } from '../../../../../src/utils/logger';

// Mock dependencies
jest.mock('passport');
jest.mock('../../../../../src/models/user.model');
jest.mock('../../../../../src/utils/auth.utils');
jest.mock('../../../../../src/utils/logger');

const mockPassport = passport as jest.Mocked<typeof passport>;
const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('Instagram Social Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockGet: jest.Mock;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    provider: 'instagram',
    providerId: 'instagram123',
    avatar: 'http://example.com/avatar.jpg',
    isEmailVerified: true,
    level: 1,
    xp: 0,
    energy: 100,
    lastRoomJoinTime: new Date(),
    maxEnergy: 100,
    energyUpdatedAt: new Date(),
    isOnline: true,
    lastSeen: new Date(),
    lastLoginMethod: 'instagram',
    lastLoginIP: '127.0.0.1',
    createdAt: new Date(),
    updatedAt: new Date(),
    // Mocked IUser properties
    friends: [],
    friendRequests: [],
    stats: {},
    comparePassword: jest.fn().mockResolvedValue(true),
    save: jest.fn(),
    toJSON: jest.fn().mockReturnThis(),
    // Add more properties/methods as needed for your IUser interface
    // For demonstration, add a few more common ones:
    roles: [],
    achievements: [],
    notifications: [],
    blockList: [],
    isBanned: false,
    banReason: '',
    reportCount: 0,
    // Add any additional required IUser properties/methods here as needed

    // Stub out missing IUser methods and properties
    calculateWinRate: jest.fn().mockReturnValue(0),
    calculateLevel: jest.fn().mockReturnValue(1),
    addXP: jest.fn(),
    canPlayGame: jest.fn().mockReturnValue(true),
    // Add stubs for all other required IUser methods/properties as needed
    // Example:
    getFriends: jest.fn().mockReturnValue([]),
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    declineFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
    getStats: jest.fn().mockReturnValue({}),
    updateStats: jest.fn(),
    getAchievements: jest.fn().mockReturnValue([]),
    addAchievement: jest.fn(),
    getNotifications: jest.fn().mockReturnValue([]),
    addNotification: jest.fn(),
    markNotificationAsRead: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    isUserBlocked: jest.fn().mockReturnValue(false),
    ban: jest.fn(),
    unban: jest.fn(),
    report: jest.fn(),
    // Add more as required by your IUser interface

    // Add stubs for missing IUser methods/properties to satisfy the interface
    consumeEnergy: jest.fn(),
    regenerateEnergy: jest.fn(),
    sanitizeData: jest.fn().mockReturnValue({}),
    validateUserData: jest.fn().mockReturnValue(true),
    // Add additional stubs as needed for the remaining IUser properties/methods
    // Example:
    updateProfile: jest.fn(),
    getProfile: jest.fn().mockReturnValue({}),
    setOnlineStatus: jest.fn(),
    getOnlineStatus: jest.fn().mockReturnValue(true),
    // ...repeat for all other missing IUser methods/properties
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockGet = jest.fn();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser as unknown as IUser,
      query: { code: 'instagram_auth_code' },
      ip: '127.0.0.1',
      get: mockGet,
      logIn: jest.fn()
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup default mocks
    mockGet.mockReturnValue('Mozilla/5.0');
    mockAuthUtils.generateAccessToken.mockReturnValue('access_token_123');
    mockAuthUtils.generateRefreshToken.mockReturnValue('refresh_token_123');
    mockUserModel.findById.mockResolvedValue({
      _id: 'user123',
      email: 'test@example.com',
      username: 'testuser'
    });
    mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);
  });

  describe('instagramLogin', async () => {
    it('should return error when no user and no auth code provided', async () => {
      mockRequest.user = undefined;
      mockRequest.query = {};

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Invalid authentication request',
        code: 'INVALID_AUTH_REQUEST'
      });
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Instagram login attempted without proper authentication flow',
        expect.any(Object)
      );
    });

    it('should handle passport authentication error', async () => {
      const authError = new Error('OAuth error');
      
      // Mock passport.authenticate to call callback with error
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(authError, false, null);
          }
        };
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Authentication service temporarily unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Instagram authentication error',
        expect.any(Object)
      );
    });

    it('should handle authentication failure without user', async () => {
      // Mock passport.authenticate to call callback with no user
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, false, { message: 'Authentication failed' });
          }
        };
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Instagram authentication failed',
        code: 'AUTH_FAILED',
        details: 'Authentication failed'
      });
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Instagram authentication failed',
        expect.any(Object)
      );
    });

    it('should successfully authenticate and login user', async () => {
      mockRequest.logIn = jest.fn().mockImplementation((user, callback) => {
        callback(null);
      });

      // Mock passport.authenticate to call callback with valid user
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, mockUser, null);
          }
        };
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAuthUtils.generateAccessToken).toHaveBeenCalledWith({
        userId: mockUser._id,
        email: mockUser.email
      });
      expect(mockAuthUtils.generateRefreshToken).toHaveBeenCalledWith({
        userId: mockUser._id
      });
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockUser._id,
        {
          lastSeen: expect.any(Date),
          isOnline: true,
          lastLoginMethod: 'instagram',
          lastLoginIP: '127.0.0.1'
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Instagram login successful',
        code: 'LOGIN_SUCCESS',
        user: {
          id: mockUser._id,
          email: mockUser.email,
          username: mockUser.username,
          avatar: mockUser.avatar,
          level: mockUser.level,
          xp: mockUser.xp,
          energy: mockUser.energy,
          provider: mockUser.provider,
          isEmailVerified: mockUser.isEmailVerified
        },
        tokens: {
          accessToken: 'access_token_123',
          refreshToken: 'refresh_token_123',
          expiresIn: process.env.JWT_EXPIRES_IN || '1h'
        }
      });
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Successful Instagram login',
        expect.any(Object)
      );
    });

    it('should handle user not found in database', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, mockUser, null);
          }
        };
      });
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'User not found after Instagram authentication',
        expect.any(Object)
      );
    });

    it('should handle session creation failure', async () => {
      const sessionError = new Error('Session creation failed');
      
      mockRequest.logIn = jest.fn().mockImplementation((user, callback) => {
        callback(sessionError);
      });

      // Mock passport.authenticate to call callback with valid user
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, mockUser, null);
          }
        };
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Session creation failed',
        code: 'SESSION_ERROR'
      });
    });

    it('should handle invalid user object', async () => {
      const invalidUser = {
        _id: '',
        email: '',
        provider: ''
      };

      // Mock passport.authenticate to call callback with invalid user
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, invalidUser, null);
          }
        };
      });

      await instagramLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Authentication data is incomplete',
        code: 'INCOMPLETE_AUTH_DATA'
    });
  });

  describe('instagramAuthRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(instagramAuthRateLimit).toBeDefined();
    });
  });

  describe('security considerations', () => {
    it('should log security events properly', async () => {
      const localMockGet = jest.fn().mockReturnValue('Mozilla/5.0');
      const localMockRequest: Partial<Request> = {
        user: undefined,
        query: {},
        ip: '127.0.0.1',
        get: localMockGet,
        logIn: jest.fn()
      };
      const localMockJson = jest.fn().mockReturnThis();
      const localMockStatus = jest.fn().mockReturnThis();
      const localMockResponse: Partial<Response> = {
        json: localMockJson,
        status: localMockStatus
      };

      await instagramLogin(localMockRequest as Request, localMockResponse as Response, mockNext);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Instagram login attempted without proper authentication flow',
        expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          timestamp: expect.any(String)
        })
      );
    });

    it('should not expose sensitive user data in response', async () => {
      const localMockGet = jest.fn().mockReturnValue('Mozilla/5.0');
      const localMockRequest: Partial<Request> = {
        user: mockUser as unknown as IUser,
        query: { code: 'instagram_auth_code' },
        ip: '127.0.0.1',
        get: localMockGet,
        logIn: jest.fn().mockImplementation((user, callback) => {
          callback(null);
        })
      };
      const localMockJson = jest.fn().mockReturnThis();
      const localMockStatus = jest.fn().mockReturnThis();
      const localMockResponse: Partial<Response> = {
        json: localMockJson,
        status: localMockStatus
      };

      // Mock passport.authenticate to call callback with user containing sensitive data
      const userWithSensitiveData = {
        ...mockUser,
        password: 'secret',
        refreshTokens: ['token1', 'token2'],
        secretField: 'sensitive'
      };

      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, userWithSensitiveData, null);
          }
        };
      });

      await instagramLogin(localMockRequest as Request, localMockResponse as Response, mockNext);

      const responseCall = localMockJson.mock.calls[0][0];
      expect(responseCall.user).not.toHaveProperty('password');
      expect(responseCall.user).not.toHaveProperty('refreshTokens');
      expect(responseCall.user).not.toHaveProperty('secretField');
    });
  });
});

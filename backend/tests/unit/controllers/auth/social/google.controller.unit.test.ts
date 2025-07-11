import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { googleLogin, socialAuthRateLimit } from '../../../../../src/modules/auth/controllers/social/google.controller';
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

describe('Google Social Auth Controller', () => {
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
    provider: 'google',
    providerId: 'google123',
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
    lastLoginMethod: 'google',
    lastLoginIP: '127.0.0.1',
    // Dummy values for missing IUser properties
    friends: [],
    friendRequests: [],
    stats: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
    banned: false,
    banReason: '',
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    streak: 0,
    achievements: [],
    notifications: [],
    settings: {},
    emailPreferences: {},
    googleId: 'google123',
    facebookId: '',
    appleId: '',
    deviceTokens: [],
    refreshTokens: [],
    password: '',
    resetPasswordToken: '',
    resetPasswordExpires: new Date(),
    verificationToken: '',
    verifiedAt: new Date(),
    // Add more fields as required by your IUser interface
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockGet = jest.fn();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser as unknown as IUser,
      query: { code: 'google_auth_code' },
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

  describe('googleLogin', () => {
    it('should return error when no user and no auth code provided', async () => {
      mockRequest.user = undefined;
      mockRequest.query = {};

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Invalid authentication request',
        code: 'INVALID_AUTH_REQUEST'
      });
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Google login attempted without proper authentication flow',
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Authentication service temporarily unavailable',
        code: 'AUTH_SERVICE_ERROR'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Google authentication error',
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Google authentication failed',
        code: 'AUTH_FAILED',
        details: 'Authentication failed'
      });
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Google authentication failed',
        expect.any(Object)
      );
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Authentication data is incomplete',
        code: 'INCOMPLETE_AUTH_DATA'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Invalid user object from Google authentication',
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'User not found after Google authentication',
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Session creation failed',
        code: 'SESSION_ERROR'
      });
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Session creation failed for Google login',
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

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

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
          lastLoginMethod: 'google',
          lastLoginIP: '127.0.0.1'
        }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Google login successful',
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
        'Successful Google login',
        expect.any(Object)
      );
    });

    it('should handle errors during session handling', async () => {
      const sessionHandlingError = new Error('Session handling error');
      
      mockRequest.logIn = jest.fn().mockImplementation((user, callback) => {
        callback(null); // Session creation success
      });
      
      mockUserModel.findByIdAndUpdate.mockRejectedValue(sessionHandlingError);

      // Mock passport.authenticate to call callback with valid user
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, mockUser, null);
          }
        };
      });

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Error during Google login session handling',
        expect.objectContaining({
          error: 'Session handling error',
          userId: mockUser._id
        })
      );
    });

    it('should handle authentication callback with no user and undefined info', async () => {
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, false, undefined);
          }
        };
      });

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Google authentication failed',
        code: 'AUTH_FAILED',
        details: 'Authentication was not successful'
      });
    });
    it('should handle partial user object validation', async () => {
      const partialUser = {
        _id: 'user123',
        email: 'test@example.com',
        provider: '', // missing provider
        providerId: 'google123',
        username: 'testuser'
      };
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, partialUser, null);
          }
        };
      });

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Authentication data is incomplete',
        code: 'INCOMPLETE_AUTH_DATA'
      });
    });
  });

  describe('socialAuthRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(socialAuthRateLimit).toBeDefined();
      // Note: Testing rate limit middleware configuration would require more complex setup
      // In a real scenario, you might want to test this with integration tests
    });
  });

  describe('security considerations', () => {
    it('should log security events properly', async () => {
      mockRequest.user = undefined;
      mockRequest.query = {};

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Google login attempted without proper authentication flow',
        expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          timestamp: expect.any(String)
        })
      );
    });

    it('should not expose sensitive user data in response', async () => {
      mockRequest.logIn = jest.fn().mockImplementation((user, callback) => {
        callback(null);
      });

      // Mock passport.authenticate to call callback with user containing sensitive data
      const userWithSensitiveData = {
        ...mockUser,
        password: 'secret',
      };
      mockPassport.authenticate.mockImplementation((strategy, options, callback) => {
        return (req: Request, res: Response, next: NextFunction) => {
          if (typeof callback === 'function') {
            callback(null, userWithSensitiveData, null);
          }
        };
      });

      await googleLogin(mockRequest as Request, mockResponse as Response, mockNext);

      const responseCall = mockJson.mock.calls[0][0];
      expect(responseCall.user).not.toHaveProperty('password');
      expect(responseCall.user).not.toHaveProperty('refreshTokens');
      expect(responseCall.user).not.toHaveProperty('secretField');
    });
  });
});
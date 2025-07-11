import { Request, Response, NextFunction } from 'express';
import { getProfile } from '../../../../src/modules/auth/controllers/getProfile.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { EnergyManager } from '../../../../src/utils/energy.utils';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { Types } from 'mongoose';
const ObjectId = Types.ObjectId;

// Mock dependencies
jest.mock('../../../../src/utils/energy.utils');
jest.mock('../../../../src/utils/auth.utils');

describe('GetProfile Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
        username: 'testuser',
        email: 'test@example.com',
        avatar: 'avatar-url',
        bio: 'Test bio',
        level: 5,
        totalXP: 1250,
        xp: 250,
        maxEnergy: 100,
        energy: 80,
        lastEnergyUpdate: new Date(),
        lastEnergyRegenTime: new Date(),
        stats: {
          gamesPlayed: 10,
          wins: 7,
          losses: 3,
          draws: 0,
          winRate: 70
        },
        isEmailVerified: true,
        createdAt: new Date(),
        lastLogin: new Date(),
        lastRoomJoinTime: new Date(),
        provider: 'manual',
        refreshTokens: [],
        emailVerificationToken: undefined,
        passwordResetToken: undefined,
        password: 'hashedpassword',
        energyUpdatedAt: new Date(),
        isOnline: false,
        lastSeen: new Date(),
        friends: [],
        friendRequests: { sent: [], received: [] },
        deletedAt: undefined,
        updatedAt: new Date(),
        comparePassword: jest.fn().mockResolvedValue(true),
        calculateWinRate: jest.fn().mockReturnValue(70),
        calculateLevel: jest.fn().mockReturnValue(5),
        save: jest.fn(),
        toJSON: jest.fn().mockReturnThis(),
        // Mock all required IUser methods as no-ops or jest.fn()
        addXP: jest.fn(),
        canPlayGame: jest.fn(),
        consumeEnergy: jest.fn(),
        regenerateEnergy: jest.fn(),
        // Removed sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockUser, unblockUser as they are not part of IUser interface
        isBlocked: false,
        // Remove setPasswordResetToken, clearPasswordResetToken, setEmailVerificationToken, clearEmailVerificationToken, and any other properties not in IUser
        // Remove incrementGamesPlayed and similar properties not in IUser interface
        // Add more as required by your IUser interface
      } as any
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock EnergyManager
    (EnergyManager.calculateCurrentEnergy as jest.Mock).mockReturnValue({
      currentEnergy: 85,
      maxEnergy: 100,
      energyRegenRate: 1,
      timeToFullEnergy: 15 * 60 * 1000
    });

    // Mock AuthUtils
    (AuthUtils.getXPProgress as jest.Mock).mockReturnValue({
      currentLevel: 5,
      xpForCurrentLevel: 1000,
      xpForNextLevel: 1500,
      xpProgress: 250,
      xpProgressPercentage: 50
    });
  });

  describe('getProfile function', () => {
    it('should return user profile successfully', async () => {
      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(EnergyManager.calculateCurrentEnergy).toHaveBeenCalledWith(
        mockRequest.user!.energy,
        mockRequest.user!.lastEnergyUpdate,
        mockRequest.user!.lastEnergyRegenTime
      );

      expect(AuthUtils.getXPProgress).toHaveBeenCalledWith(mockRequest.user!.totalXP);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            avatar: 'avatar-url',
            bio: 'Test bio',
            level: 5,
            totalXP: 1250,
            xpProgress: {
              currentLevel: 5,
              xpForCurrentLevel: 1000,
              xpForNextLevel: 1500,
              xpProgress: 250,
              xpProgressPercentage: 50
            },
            energy: 85,
            maxEnergy: 100,
            energyStatus: {
              currentEnergy: 85,
              maxEnergy: 100,
              energyRegenRate: 1,
              timeToFullEnergy: 15 * 60 * 1000
            },
            stats: {
              gamesPlayed: 10,
              gamesWon: 7,
              gamesLost: 3,
              winStreak: 2,
              longestWinStreak: 5
            },
            preferences: {
              theme: 'dark',
              notifications: true
            },
            isEmailVerified: true,
            createdAt: mockRequest.user!.createdAt,
            lastLogin: mockRequest.user!.lastLogin
          }
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    // (Removed invalid/duplicate or incomplete test block here)

    it('should handle different energy states', async () => {
      (EnergyManager.calculateCurrentEnergy as jest.Mock).mockReturnValue({
        currentEnergy: 0,
        maxEnergy: 100,
        energyRegenRate: 1,
        timeToFullEnergy: 100 * 60 * 1000
      });

      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            energy: 0,
            maxEnergy: 100,
            energyStatus: {
              currentEnergy: 0,
              maxEnergy: 100,
              energyRegenRate: 1,
              timeToFullEnergy: 100 * 60 * 1000
            }
          })
        }
      });
    });

    it('should handle different XP levels and progress', async () => {
      mockRequest.user!.level = 1;
      mockRequest.user!.totalXP = 50;

      (AuthUtils.getXPProgress as jest.Mock).mockReturnValue({
        currentLevel: 1,
        xpForCurrentLevel: 0,
        xpForNextLevel: 100,
        xpProgress: 50,
        xpProgressPercentage: 50
      });

      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.getXPProgress).toHaveBeenCalledWith(50);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            level: 1,
            totalXP: 50,
            xpProgress: {
              currentLevel: 1,
              xpForCurrentLevel: 0,
              xpForNextLevel: 100,
              xpProgress: 50,
              xpProgressPercentage: 50
            }
          })
        }
      });
    });

    it('should handle high level user', async () => {
      mockRequest.user!.level = 50;
      mockRequest.user!.totalXP = 125000;

      (AuthUtils.getXPProgress as jest.Mock).mockReturnValue({
        currentLevel: 50,
        xpForCurrentLevel: 120000,
        xpForNextLevel: 130000,
        xpProgress: 5000,
        xpProgressPercentage: 50
      });

      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: expect.objectContaining({
            level: 50,
            totalXP: 125000
          })
        }
      });
    });

    it('should not expose sensitive user information', async () => {
      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const userData = responseCall.data.user;

      // Ensure sensitive fields are not included
      expect(userData).not.toHaveProperty('password');
      expect(userData).not.toHaveProperty('refreshTokens');
      expect(userData).not.toHaveProperty('emailVerificationToken');
      expect(userData).not.toHaveProperty('passwordResetToken');
    });

    it('should include all required profile fields', async () => {
      await getProfile(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      const userData = responseCall.data.user;

      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('username');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('level');
      expect(userData).toHaveProperty('totalXP');
      expect(userData).toHaveProperty('xpProgress');
      expect(userData).toHaveProperty('energy');
      expect(userData).toHaveProperty('maxEnergy');
      expect(userData).toHaveProperty('energyStatus');
      expect(userData).toHaveProperty('isEmailVerified');
      expect(userData).toHaveProperty('createdAt');
    });
  });
});

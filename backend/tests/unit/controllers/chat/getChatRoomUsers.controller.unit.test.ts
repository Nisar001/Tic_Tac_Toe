import { Request, Response } from 'express';
import { getChatRoomUsers, getChatRoomUsersRateLimit } from '../../../../src/modules/chat/controllers/getChatRoomUsers.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { createError } from '../../../../src/middlewares/error.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { socketManager } from '../../../../src/server';

// Mock dependencies
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    unauthorized: jest.fn((message: string) => new Error(message)),
    forbidden: jest.fn((message: string) => new Error(message)),
    badRequest: jest.fn((message: string) => new Error(message)),
    serviceUnavailable: jest.fn((message: string) => new Error(message)),
    notFound: jest.fn((message: string) => new Error(message))
  }
}));

jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/server', () => ({
  socketManager: {
    getChatSocket: jest.fn()
  }
}));

const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('GetChatRoomUsers Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockChatSocket: any;

  const mockUser = {
    _id: { toString: () => 'user123' },
    username: 'testuser',
    email: 'test@example.com',
    isDeleted: false,
    isBlocked: false
  };

  const mockRoomUsers = [
    {
      id: 'user123',
      username: 'testuser',
      isOnline: true,
      lastSeen: new Date(),
      role: 'member'
    },
    {
      id: 'user456',
      username: 'otheruser',
      isOnline: false,
      lastSeen: new Date(Date.now() - 300000),
      role: 'admin'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser,
      params: { roomId: 'room123' },
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup mocks
    mockAuthUtils.validateAndSanitizeInput.mockImplementation((input) => input);
    
    mockChatSocket = {
      getRoomUsers: jest.fn().mockReturnValue(mockRoomUsers),
      isUserInRoom: jest.fn().mockReturnValue(true),
      getRoomInfo: jest.fn().mockReturnValue({
        id: 'room123',
        name: 'Test Room',
        type: 'private',
        participants: ['user123', 'user456']
      })
    };

    mockSocketManager.getChatSocket.mockReturnValue(mockChatSocket);
  });

  describe('getChatRoomUsers', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when room ID is missing', async () => {
      mockRequest.params = {};

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is not a string', async () => {
      mockRequest.params = { roomId: 123 as any };

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is too short after sanitization', async () => {
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('ab');

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid room ID format');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid room ID format');
    });

    it('should throw error when room ID contains invalid characters', async () => {
      mockRequest.params = { roomId: 'room@123' };

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID contains invalid characters');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID contains invalid characters');
    });

    it('should throw error when socket manager is unavailable', async () => {
      // Create a version where socketManager is undefined
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      const { getChatRoomUsers: getChatRoomUsersWithoutSocket } = await import('../../../../src/modules/chat/controllers/getChatRoomUsers.controller');

      await expect(getChatRoomUsersWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Chat service is currently unavailable');
    });

    it('should successfully get chat room users', async () => {
      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.getRoomUsers).toHaveBeenCalledWith('room123');
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: mockRoomUsers,
          roomInfo: expect.any(Object),
          userCount: mockRoomUsers.length,
          onlineCount: 1
        }
      });
    });

    it('should handle room not found', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue(null);

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');
    });

    it('should handle user not in room', async () => {
      mockChatSocket.isUserInRoom.mockReturnValue(false);

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Access denied to this room');
    });

    it('should sanitize room ID input', async () => {
      mockRequest.params = { roomId: '  room123  ' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('room123');

      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  room123  ', 50);
    });

    it('should handle empty room users list', async () => {
      mockChatSocket.getRoomUsers.mockReturnValue([]);

      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          users: [],
          roomInfo: expect.any(Object),
          userCount: 0,
          onlineCount: 0
        }
      });
    });

    it('should count online users correctly', async () => {
      const mixedUsers = [
        { id: 'user1', isOnline: true },
        { id: 'user2', isOnline: false },
        { id: 'user3', isOnline: true },
        { id: 'user4', isOnline: false }
      ];
      
      mockChatSocket.getRoomUsers.mockReturnValue(mixedUsers);

      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userCount: 4,
            onlineCount: 2
          })
        })
      );
    });

    it('should handle socket error gracefully', async () => {
      mockChatSocket.getRoomUsers.mockImplementation(() => {
        throw new Error('Socket error');
      });

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to retrieve room users');
    });

    it('should validate room ID pattern with valid characters', async () => {
      const validRoomIds = ['room123', 'room_test', 'room-123', 'ROOM123'];

      for (const roomId of validRoomIds) {
        mockRequest.params = { roomId };
        
        await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      }
    });
  });

  describe('getChatRoomUsersRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(getChatRoomUsersRateLimit).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null room info', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue(null);

      await expect(getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');
    });

    it('should handle undefined room users', async () => {
      mockChatSocket.getRoomUsers.mockReturnValue(undefined);

      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            users: [],
            userCount: 0,
            onlineCount: 0
          })
        })
      );
    });

    it('should handle room ID at minimum length', async () => {
      mockRequest.params = { roomId: 'abc' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('abc');

      await getChatRoomUsers(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });
  });
});

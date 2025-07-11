import { Request, Response } from 'express';
import { joinChatRoom, joinChatRoomRateLimit } from '../../../../src/modules/chat/controllers/joinChatRoom.controller';
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
    tooManyRequests: jest.fn((message: string) => new Error(message)),
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

describe('JoinChatRoom Controller', () => {
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
    isBlocked: false,
    lastRoomJoinTime: null
  };

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
      joinRoom: jest.fn().mockResolvedValue(true),
      isRoomExists: jest.fn().mockReturnValue(true),
      isUserInRoom: jest.fn().mockReturnValue(false),
      getRoomInfo: jest.fn().mockReturnValue({
        id: 'room123',
        name: 'Test Room',
        type: 'public',
        maxParticipants: 100,
        participants: ['user456']
      })
    };

    mockSocketManager.getChatSocket.mockReturnValue(mockChatSocket);
  });

  describe('joinChatRoom', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when room ID is missing', async () => {
      mockRequest.params = {};

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is not a string', async () => {
      mockRequest.params = { roomId: 123 as any };

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is too short after sanitization', async () => {
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('ab');

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid room ID format');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid room ID format');
    });

    it('should throw error when room ID contains invalid characters', async () => {
      mockRequest.params = { roomId: 'room@123' };

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID contains invalid characters');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID contains invalid characters');
    });

    it('should throw error for rate limiting on frequent room joins', async () => {
      const recentTime = new Date(Date.now() - 10000); // 10 seconds ago
      mockRequest.user = { ...mockUser, lastRoomJoinTime: recentTime };

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Please wait before joining another room');

      expect(createError.tooManyRequests).toHaveBeenCalledWith('Please wait before joining another room. Minimum 30 seconds between joins.');
    });

    it('should throw error when socket manager is unavailable', async () => {
      // Create a version where socketManager is undefined
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      const { joinChatRoom: joinChatRoomWithoutSocket } = await import('../../../../src/modules/chat/controllers/joinChatRoom.controller');

      await expect(joinChatRoomWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Chat service is currently unavailable');
    });

    it('should throw error when room does not exist', async () => {
      mockChatSocket.isRoomExists.mockReturnValue(false);

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');

      expect(createError.notFound).toHaveBeenCalledWith('Room not found');
    });

    it('should throw error when user is already in room', async () => {
      mockChatSocket.isUserInRoom.mockReturnValue(true);

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Already joined this room');

      expect(createError.badRequest).toHaveBeenCalledWith('Already joined this room');
    });

    it('should throw error when room is at capacity', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue({
        id: 'room123',
        name: 'Full Room',
        type: 'private',
        maxParticipants: 2,
        participants: ['user456', 'user789']
      });

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room is at maximum capacity');

      expect(createError.forbidden).toHaveBeenCalledWith('Room is at maximum capacity');
    });

    it('should successfully join a chat room', async () => {
      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.joinRoom).toHaveBeenCalledWith('user123', 'room123');
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully joined room',
        data: {
          roomId: 'room123',
          roomInfo: expect.any(Object),
          joinedAt: expect.any(Date)
        }
      });
    });

    it('should sanitize room ID input', async () => {
      mockRequest.params = { roomId: '  room123  ' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('room123');

      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  room123  ', 50);
    });

    it('should allow joining after cooldown period', async () => {
      const oldTime = new Date(Date.now() - 60000); // 1 minute ago
      mockRequest.user = { ...mockUser, lastRoomJoinTime: oldTime };

      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.joinRoom).toHaveBeenCalledWith('user123', 'room123');
    });

    it('should handle join room failure', async () => {
      mockChatSocket.joinRoom.mockRejectedValue(new Error('Join failed'));

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to join room');
    });

    it('should validate room ID pattern with valid characters', async () => {
      const validRoomIds = ['room123', 'room_test', 'room-123', 'ROOM123'];

      for (const roomId of validRoomIds) {
        mockRequest.params = { roomId };
        
        await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      }
    });

    it('should handle room with unlimited capacity', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue({
        id: 'room123',
        name: 'Unlimited Room',
        type: 'public',
        maxParticipants: null,
        participants: Array(1000).fill('user')
      });

      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.joinRoom).toHaveBeenCalledWith('user123', 'room123');
    });

    it('should handle private room access check', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue({
        id: 'room123',
        name: 'Private Room',
        type: 'private',
        isPrivate: true,
        participants: ['user456']
      });

      // Should still allow joining if user has permission
      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.joinRoom).toHaveBeenCalledWith('user123', 'room123');
    });
  });

  describe('joinChatRoomRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(joinChatRoomRateLimit).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null room info', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue(null);

      await expect(joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');
    });

    it('should handle room ID at minimum length', async () => {
      mockRequest.params = { roomId: 'abc' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('abc');

      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });

    it('should handle user with no previous room join time', async () => {
      mockRequest.user = { ...mockUser, lastRoomJoinTime: undefined };

      await joinChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.joinRoom).toHaveBeenCalledWith('user123', 'room123');
    });
  });
});

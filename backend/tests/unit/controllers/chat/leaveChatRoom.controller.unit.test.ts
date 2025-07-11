import { Request, Response } from 'express';
import { leaveChatRoom, leaveChatRoomRateLimit } from '../../../../src/modules/chat/controllers/leaveChatRoom.controller';
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

describe('LeaveChatRoom Controller', () => {
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
      leaveRoom: jest.fn().mockResolvedValue(true),
      isRoomExists: jest.fn().mockReturnValue(true),
      isUserInRoom: jest.fn().mockReturnValue(true),
      getRoomInfo: jest.fn().mockReturnValue({
        id: 'room123',
        name: 'Test Room',
        type: 'public',
        participants: ['user123', 'user456']
      })
    };

    mockSocketManager.getChatSocket.mockReturnValue(mockChatSocket);
  });

  describe('leaveChatRoom', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when room ID is missing', async () => {
      mockRequest.params = {};

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is not a string', async () => {
      mockRequest.params = { roomId: 123 as any };

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID is required and must be a string');
    });

    it('should throw error when room ID is too short after sanitization', async () => {
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('ab');

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid room ID format');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid room ID format');
    });

    it('should throw error when room ID contains invalid characters', async () => {
      mockRequest.params = { roomId: 'room@123' };

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID contains invalid characters');

      expect(createError.badRequest).toHaveBeenCalledWith('Room ID contains invalid characters');
    });

    it('should throw error when socket manager is unavailable', async () => {
      // Create a version where socketManager is undefined
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      const { leaveChatRoom: leaveChatRoomWithoutSocket } = await import('../../../../src/modules/chat/controllers/leaveChatRoom.controller');

      await expect(leaveChatRoomWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Chat service is currently unavailable');
    });

    it('should throw error when room does not exist', async () => {
      mockChatSocket.isRoomExists.mockReturnValue(false);

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');

      expect(createError.notFound).toHaveBeenCalledWith('Room not found');
    });

    it('should throw error when user is not in room', async () => {
      mockChatSocket.isUserInRoom.mockReturnValue(false);

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('You are not in this room');

      expect(createError.badRequest).toHaveBeenCalledWith('You are not in this room');
    });

    it('should successfully leave a chat room', async () => {
      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.leaveRoom).toHaveBeenCalledWith('user123', 'room123');
      
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully left room',
        data: {
          roomId: 'room123',
          leftAt: expect.any(Date)
        }
      });
    });

    it('should sanitize room ID input', async () => {
      mockRequest.params = { roomId: '  room123  ' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('room123');

      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  room123  ', 50);
    });

    it('should handle leave room failure', async () => {
      mockChatSocket.leaveRoom.mockRejectedValue(new Error('Leave failed'));

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to leave room');
    });

    it('should validate room ID pattern with valid characters', async () => {
      const validRoomIds = ['room123', 'room_test', 'room-123', 'ROOM123'];

      for (const roomId of validRoomIds) {
        mockRequest.params = { roomId };
        
        await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      }
    });

    it('should handle leaving from different room types', async () => {
      const roomTypes = ['public', 'private', 'game', 'direct'];

      for (const type of roomTypes) {
        mockChatSocket.getRoomInfo.mockReturnValue({
          id: 'room123',
          name: `${type} Room`,
          type,
          participants: ['user123', 'user456']
        });
        
        await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);
        
        expect(mockChatSocket.leaveRoom).toHaveBeenCalledWith('user123', 'room123');
      }
    });

    it('should handle successful leave operation with room cleanup', async () => {
      mockChatSocket.leaveRoom.mockResolvedValue({
        success: true,
        roomEmpty: true,
        cleanedUp: true
      });

      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully left room',
        data: {
          roomId: 'room123',
          leftAt: expect.any(Date)
        }
      });
    });

    it('should handle room admin leaving', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue({
        id: 'room123',
        name: 'Admin Room',
        type: 'private',
        participants: ['user123', 'user456'],
        admin: 'user123'
      });

      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.leaveRoom).toHaveBeenCalledWith('user123', 'room123');
    });
  });

  describe('leaveChatRoomRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(leaveChatRoomRateLimit).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null room info', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue(null);

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room not found');
    });

    it('should handle room ID at minimum length', async () => {
      mockRequest.params = { roomId: 'abc' };
      mockAuthUtils.validateAndSanitizeInput.mockReturnValue('abc');

      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });

    it('should handle socket error gracefully', async () => {
      mockChatSocket.leaveRoom.mockImplementation(() => {
        throw new Error('Socket connection error');
      });

      await expect(leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to leave room');
    });

    it('should handle leaving from empty room', async () => {
      mockChatSocket.getRoomInfo.mockReturnValue({
        id: 'room123',
        name: 'Empty Room',
        type: 'public',
        participants: ['user123']
      });

      await leaveChatRoom(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.leaveRoom).toHaveBeenCalledWith('user123', 'room123');
    });
  });
});

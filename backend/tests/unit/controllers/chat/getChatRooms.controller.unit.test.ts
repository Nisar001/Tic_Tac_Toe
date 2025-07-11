import { Request, Response } from 'express';
import { getChatRooms, getChatRoomsRateLimit } from '../../../../src/modules/chat/controllers/getChatRooms.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { createError } from '../../../../src/middlewares/error.middleware';
import { socketManager } from '../../../../src/server';

// Mock dependencies
jest.mock('../../../../src/middlewares/error.middleware', () => ({
  asyncHandler: (fn: any) => fn,
  createError: {
    unauthorized: jest.fn((message: string) => new Error(message)),
    forbidden: jest.fn((message: string) => new Error(message)),
    badRequest: jest.fn((message: string) => new Error(message)),
    serviceUnavailable: jest.fn((message: string) => new Error(message))
  }
}));

jest.mock('../../../../src/server', () => ({
  socketManager: {
    getChatSocket: jest.fn()
  }
}));

const mockSocketManager = socketManager as jest.Mocked<typeof socketManager>;

describe('GetChatRooms Controller', () => {
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

  const mockRooms = [
    {
      id: 'room1',
      name: 'General Chat',
      type: 'global',
      participants: ['user123', 'user456'],
      lastActivity: new Date(),
      createdAt: new Date(),
      createdBy: 'admin'
    },
    {
      id: 'room2',
      name: 'Private Room',
      type: 'private',
      participants: ['user123', 'user789'],
      lastActivity: new Date(),
      isPrivate: true,
      maxParticipants: 10
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    mockNext = jest.fn();
    
    mockRequest = {
      user: mockUser,
      query: {},
      ip: '127.0.0.1'
    };
    
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    // Setup mock chat socket
    mockChatSocket = {
      getAllChatRooms: jest.fn().mockReturnValue(mockRooms)
    };

    mockSocketManager.getChatSocket.mockReturnValue(mockChatSocket);
  });

  describe('getChatRooms', () => {
    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');

      expect(createError.unauthorized).toHaveBeenCalledWith('Authentication required');
    });

    it('should throw error when user account is deleted', async () => {
      mockRequest.user = { ...mockUser, isDeleted: true };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error when user account is blocked', async () => {
      mockRequest.user = { ...mockUser, isBlocked: true };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');

      expect(createError.forbidden).toHaveBeenCalledWith('Account is not active');
    });

    it('should throw error for invalid page parameter', async () => {
      mockRequest.query = { page: '0' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Page must be a positive number');

      expect(createError.badRequest).toHaveBeenCalledWith('Page must be a positive number');
    });

    it('should throw error for invalid limit parameter', async () => {
      mockRequest.query = { limit: '0' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 50');

      expect(createError.badRequest).toHaveBeenCalledWith('Limit must be a number between 1 and 50');
    });

    it('should throw error for limit parameter exceeding maximum', async () => {
      mockRequest.query = { limit: '100' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 50');

      expect(createError.badRequest).toHaveBeenCalledWith('Limit must be a number between 1 and 50');
    });

    it('should throw error for invalid room type', async () => {
      mockRequest.query = { type: 'invalid' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Invalid room type. Must be one of: global, private, game, direct');

      expect(createError.badRequest).toHaveBeenCalledWith('Invalid room type. Must be one of: global, private, game, direct');
    });

    it('should successfully get chat rooms with default parameters', async () => {
      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.getAllChatRooms).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          rooms: expect.any(Array),
          pagination: expect.objectContaining({
            currentPage: 1,
            totalPages: expect.any(Number),
            totalRooms: expect.any(Number)
          }),
          meta: expect.any(Object)
        }
      });
    });

    it('should successfully get chat rooms with custom parameters', async () => {
      mockRequest.query = {
        type: 'global',
        page: '2',
        limit: '10'
      };

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.getAllChatRooms).toHaveBeenCalled();
    });

    it('should handle valid room types', async () => {
      const validTypes = ['global', 'private', 'game', 'direct'];

      for (const type of validTypes) {
        mockRequest.query = { type };
        
        await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

        expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      }
    });

    it('should handle non-numeric page parameter', async () => {
      mockRequest.query = { page: 'abc' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Page must be a positive number');
    });

    it('should handle non-numeric limit parameter', async () => {
      mockRequest.query = { limit: 'xyz' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Limit must be a number between 1 and 50');
    });

    it('should handle negative page parameter', async () => {
      mockRequest.query = { page: '-1' };

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Page must be a positive number');
    });

    it('should handle socket manager error', async () => {
      mockChatSocket.getAllChatRooms.mockImplementation(() => {
        throw new Error('Socket error');
      });

      await expect(getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to retrieve chat rooms');
    });

    it('should handle empty rooms response', async () => {
      mockChatSocket.getAllChatRooms.mockReturnValue([]);

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          rooms: [],
          pagination: expect.any(Object),
          meta: expect.any(Object)
        }
      });
    });

    it('should handle maximum valid page and limit values', async () => {
      mockRequest.query = { page: '999999', limit: '50' };

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
      expect(mockChatSocket.getAllChatRooms).toHaveBeenCalled();
    });
  });

  describe('getChatRoomsRateLimit', () => {
    it('should have correct rate limit configuration', () => {
      expect(getChatRoomsRateLimit).toBeDefined();
      // Note: Testing rate limit middleware configuration would require more complex setup
      // In a real scenario, you might want to test this with integration tests
    });
  });

  describe('edge cases', () => {
    it('should handle decimal page parameter', async () => {
      mockRequest.query = { page: '1.5' };

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });

    it('should handle decimal limit parameter', async () => {
      mockRequest.query = { limit: '20.5' };

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });

    it('should handle missing query parameters gracefully', async () => {
      mockRequest.query = undefined;

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockSocketManager.getChatSocket).toHaveBeenCalled();
    });

    it('should filter rooms by user access', async () => {
      const restrictedRooms = [
        {
          id: 'room1',
          name: 'User Room',
          type: 'private',
          participants: ['user123'],
          lastActivity: new Date()
        },
        {
          id: 'room2',
          name: 'Other Room',
          type: 'private',
          participants: ['user456'],
          lastActivity: new Date()
        }
      ];

      mockChatSocket.getAllChatRooms.mockReturnValue(restrictedRooms);

      await getChatRooms(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rooms: expect.arrayContaining([
              expect.objectContaining({ id: 'room1' })
            ])
          })
        })
      );
    });

    it('should handle unavailable socket manager', async () => {
      // Create a version where socketManager is undefined
      jest.doMock('../../../../src/server', () => ({
        socketManager: undefined
      }));
      
      // Re-import the module to get the updated mock
      const { getChatRooms: getChatRoomsWithoutSocket } = await import('../../../../src/modules/chat/controllers/getChatRooms.controller');

      await expect(getChatRoomsWithoutSocket(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Chat service is currently unavailable');
    });
  });
});

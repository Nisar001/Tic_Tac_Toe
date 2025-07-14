import { Request, Response, NextFunction } from 'express';
import { getChatHistory } from '../../../../src/modules/chat/controllers/getChatHistory.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';

// Mock dependencies
jest.mock('../../../../src/models/chatMessage.model', () => ({
  __esModule: true,
  default: jest.fn()
}));

import ChatMessage from '../../../../src/models/chatMessage.model';

describe('GetChatHistory Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      params: { roomId: 'room123' },
      query: {},
      user: {
        _id: 'user123',
        id: 'user123',
        username: 'testuser',
        isDeleted: false,
        isBlocked: false
      }
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Mock ChatMessage model
    ChatMessage.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockResolvedValue([
              {
                _id: 'msg1',
                message: 'Hello!',
                sender: { _id: 'user1', username: 'player1' },
                roomId: 'room123',
                timestamp: new Date(),
                isEdited: false
              },
              {
                _id: 'msg2',
                message: 'Hi there!',
                sender: { _id: 'user2', username: 'player2' },
                roomId: 'room123',
                timestamp: new Date(),
                isEdited: false
              }
            ])
          })
        })
      })
    });

    ChatMessage.countDocuments = jest.fn().mockResolvedValue(25);
  });

  describe('getChatHistory function', () => {
    it('should return chat history successfully with default parameters', async () => {
      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ChatMessage.find).toHaveBeenCalledWith({
        roomId: 'room123',
        isDeleted: { $ne: true }
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: expect.arrayContaining([
            expect.objectContaining({
              _id: 'msg1',
              message: 'Hello!',
              sender: expect.objectContaining({
                username: 'player1'
              })
            })
          ]),
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalMessages: 25,
            hasNextPage: true,
            hasPreviousPage: false
          },
          roomId: 'room123'
        }
      });
    });

    it('should return error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should return error when room ID is missing', async () => {
      mockRequest.params = {};

      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Room ID is required'
      });
    });

    it('should handle pagination correctly', async () => {
      mockRequest.query = { offset: '10', limit: '5' };

      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      const chainedCalls = ChatMessage.find().populate().sort().limit().skip;
      expect(chainedCalls).toHaveBeenCalledWith(10);
    });

    it('should handle empty chat history', async () => {
      ChatMessage.find().populate().sort().limit().skip.mockResolvedValue([]);
      ChatMessage.countDocuments.mockResolvedValue(0);

      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalMessages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          },
          roomId: 'room123'
        }
      });
    });

    it('should sort messages in descending order by timestamp', async () => {
      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ChatMessage.find().populate().sort).toHaveBeenCalledWith({ timestamp: -1 });
    });

    it('should populate sender information correctly', async () => {
      await getChatHistory(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(ChatMessage.find().populate).toHaveBeenCalledWith('sender', 'username avatar level');
    });
  });
});

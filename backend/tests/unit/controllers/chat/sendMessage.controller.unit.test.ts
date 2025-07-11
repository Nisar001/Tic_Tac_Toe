import { Request, Response, NextFunction } from 'express';
import { sendMessage, sendMessageRateLimit } from '../../../../src/modules/chat/controllers/sendMessage.controller';
import { AuthenticatedRequest } from '../../../../src/middlewares/auth.middleware';
import { AuthUtils } from '../../../../src/utils/auth.utils';
import { socketManager } from '../../../../src/server';

// Mock dependencies
jest.mock('../../../../src/utils/auth.utils');
jest.mock('../../../../src/server');

describe('SendMessage Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockSocketManager: any;
  let mockAuthManager: any;
  let mockChatSocket: any;
  let mockUserSocket: any;

  beforeEach(() => {
    mockRequest = {
      params: { roomId: 'room123' },
      body: { message: 'Hello world!' },
      user: {
        _id: 'user123',
        username: 'testuser',
        isDeleted: false,
        isBlocked: false,
        lastMessageTime: null,
        save: jest.fn().mockResolvedValue(true)
      }
    };
    mockResponse = {
      json: jest.fn()
    };
    mockNext = jest.fn();

    // Mock socket components
    mockUserSocket = { id: 'socket123' };
    mockAuthManager = {
      getSocketByUserId: jest.fn().mockReturnValue(mockUserSocket)
    };
    mockChatSocket = {
      handleChatMessage: jest.fn()
    };
    mockSocketManager = {
      getAuthManager: jest.fn().mockReturnValue(mockAuthManager),
      getChatSocket: jest.fn().mockReturnValue(mockChatSocket)
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Mock AuthUtils methods
    (AuthUtils.validateAndSanitizeInput as jest.Mock).mockImplementation((input: string) => input.trim());
    (AuthUtils.isActionAllowed as jest.Mock).mockReturnValue(true);

    // Mock socketManager
    (socketManager as any) = mockSocketManager;
  });

  describe('sendMessage function', () => {
    it('should send message successfully with valid data', async () => {
      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('room123', 50);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('Hello world!', 500);
      expect(mockAuthManager.getSocketByUserId).toHaveBeenCalledWith('user123');
      expect(mockChatSocket.handleChatMessage).toHaveBeenCalledWith(mockUserSocket, {
        roomId: 'room123',
        message: 'Hello world!'
      });
      expect(mockRequest.user!.save).toHaveBeenCalled();
      expect(mockRequest.user!.lastMessageTime).toBeInstanceOf(Date);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully',
        data: {
          messageLength: 12,
          timestamp: expect.any(Date)
        }
      });
    });

    it('should throw error when user is not authenticated', async () => {
      mockRequest.user = undefined;

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error when account is deleted', async () => {
      mockRequest.user!.isDeleted = true;

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when account is blocked', async () => {
      mockRequest.user!.isBlocked = true;

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Account is not active');
    });

    it('should throw error when room ID is missing', async () => {
      mockRequest.params = {};

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');
    });

    it('should throw error when room ID is not a string', async () => {
      mockRequest.params = { roomId: 123 as any };

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Room ID is required and must be a string');
    });

    it('should throw error when message is missing', async () => {
      mockRequest.body = {};

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message is required and must be a string');
    });

    it('should throw error when message is not a string', async () => {
      mockRequest.body = { message: 123 };

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message is required and must be a string');
    });

    it('should throw error when message is empty after trimming', async () => {
      mockRequest.body = { message: '   ' };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue('');

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message cannot be empty');
    });

    it('should throw error when message is too long', async () => {
      const longMessage = 'a'.repeat(501);
      mockRequest.body = { message: longMessage };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue(longMessage);

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message too long (max 500 characters)');
    });

    it('should detect and reject spam patterns - repeated characters', async () => {
      mockRequest.body = { message: 'aaaaa spam' };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue('aaaaa spam');

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message appears to be spam');
    });

    it('should detect and reject spam patterns - repeated words', async () => {
      mockRequest.body = { message: 'spam spam spam' };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue('spam spam spam');

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message appears to be spam');
    });

    it('should detect and reject spam patterns - multiple URLs', async () => {
      mockRequest.body = { message: 'http://spam1.com http://spam2.com http://spam3.com' };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue('http://spam1.com http://spam2.com http://spam3.com');

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Message appears to be spam');
    });

    it('should throw error when user is rate limited', async () => {
      mockRequest.user!.lastMessageTime = new Date();
      (AuthUtils.isActionAllowed as jest.Mock).mockReturnValue(false);

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Please wait before sending another message');
    });

    it('should throw error when socket manager is unavailable', async () => {
      (socketManager as any) = null;

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Chat service is currently unavailable');
    });

    it('should throw error when user socket is not found', async () => {
      mockAuthManager.getSocketByUserId.mockReturnValue(null);

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('You must be connected via WebSocket to send messages');
    });

    it('should handle socket errors gracefully', async () => {
      mockChatSocket.handleChatMessage.mockImplementation(() => {
        throw new Error('Socket connection failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext))
        .rejects.toThrow('Failed to send message through chat service');

      expect(consoleSpy).toHaveBeenCalledWith('Socket error while sending message:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should sanitize room ID and message correctly', async () => {
      mockRequest.params = { roomId: '  room123  ' };
      mockRequest.body = { message: '  Hello world!  ' };

      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  room123  ', 50);
      expect(AuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('  Hello world!  ', 500);
    });

    it('should update user last message time', async () => {
      const beforeTime = new Date();
      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user!.lastMessageTime).toBeInstanceOf(Date);
      expect(mockRequest.user!.lastMessageTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });

    it('should check rate limiting correctly', async () => {
      const pastTime = new Date(Date.now() - 500); // 500ms ago
      mockRequest.user!.lastMessageTime = pastTime;

      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(AuthUtils.isActionAllowed).toHaveBeenCalledWith(pastTime, 1000);
    });

    it('should pass correct parameters to chat socket', async () => {
      mockRequest.params = { roomId: 'testRoom' };
      mockRequest.body = { message: 'Test message' };

      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockChatSocket.handleChatMessage).toHaveBeenCalledWith(mockUserSocket, {
        roomId: 'testRoom',
        message: 'Test message'
      });
    });

    it('should return correct message length in response', async () => {
      mockRequest.body = { message: 'Hello!' };
      (AuthUtils.validateAndSanitizeInput as jest.Mock).mockReturnValue('Hello!');

      await sendMessage(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Message sent successfully',
        data: {
          messageLength: 6,
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('sendMessageRateLimit', () => {
    it('should be configured with correct settings', () => {
      expect(sendMessageRateLimit).toBeDefined();
      // Rate limit configuration is tested functionally in integration tests
    });
  });
});

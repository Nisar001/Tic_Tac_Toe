// Unit tests for chat.socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { ChatSocket, ChatMessage, ChatRoom } from '../../../src/socket/chat.socket';
import { AuthenticatedSocket, SocketAuthManager } from '../../../src/socket/auth.socket';

jest.mock('socket.io');

const mockSocket = {
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  user: { id: 'user1', username: 'TestUser' },
} as unknown as AuthenticatedSocket;

const mockAuthManager = {
  isSocketAuthenticated: jest.fn().mockReturnValue(true),
  getSocketByUserId: jest.fn().mockReturnValue(mockSocket),
} as unknown as SocketAuthManager;

describe('ChatSocket', () => {
  let chatSocket: ChatSocket;
  let io: SocketIOServer;

  beforeEach(() => {
    io = new SocketIOServer();
    chatSocket = new ChatSocket(io, mockAuthManager);
  });

  it('should initialize with a global chat room', () => {
    const globalRoom = chatSocket.getChatRoomInfo('global');
    expect(globalRoom).toBeDefined();
    expect(globalRoom?.name).toBe('Global Chat');
  });

  it('should handle chat messages correctly', () => {
    const roomId = 'global';
    const message = 'Hello World';

    chatSocket.handleChatMessage(mockSocket, { roomId, message });

    expect(mockSocket.emit).not.toHaveBeenCalledWith('chat_error', expect.anything());
    expect(io.to(roomId).emit).toHaveBeenCalledWith('chat_message', expect.objectContaining({
      message,
      userId: mockSocket.user.id,
    }));
  });

  it('should handle joining chat rooms', () => {
    const roomId = 'game_123';

    chatSocket.handleJoinChat(mockSocket, { roomId });

    const chatRoom = chatSocket.getChatRoomInfo(roomId);
    expect(chatRoom).toBeDefined();
    expect(chatRoom?.participants).toContain(mockSocket.user.id);
    expect(mockSocket.emit).toHaveBeenCalledWith('chat_joined', expect.objectContaining({
      roomId,
    }));
  });

  it('should handle leaving chat rooms', () => {
    const roomId = 'global';

    chatSocket.handleJoinChat(mockSocket, { roomId });
    chatSocket.handleLeaveChat(mockSocket, { roomId });

    const chatRoom = chatSocket.getChatRoomInfo(roomId);
    expect(chatRoom?.participants).not.toContain(mockSocket.user.id);
    expect(mockSocket.to(roomId).emit).toHaveBeenCalledWith('user_left_chat', expect.objectContaining({
      userId: mockSocket.user.id,
    }));
  });

  it('should retrieve chat history', () => {
    const roomId = 'global';

    chatSocket.handleGetChatHistory(mockSocket, { roomId, limit: 10 });

    expect(mockSocket.emit).toHaveBeenCalledWith('chat_history', expect.objectContaining({
      roomId,
      messages: expect.any(Array),
    }));
  });

  it('should handle typing indicators', () => {
    const roomId = 'global';

    chatSocket.handleTypingStart(mockSocket, { roomId });
    expect(mockSocket.to(roomId).emit).toHaveBeenCalledWith('user_typing', expect.objectContaining({
      userId: mockSocket.user.id,
    }));

    chatSocket.handleTypingStop(mockSocket, { roomId });
    expect(mockSocket.to(roomId).emit).toHaveBeenCalledWith('user_stopped_typing', expect.objectContaining({
      userId: mockSocket.user.id,
    }));
  });

  it('should handle private messages', () => {
    const targetUserId = 'user2';
    const message = 'Private message';

    chatSocket.handlePrivateMessage(mockSocket, { targetUserId, message });

    expect(mockSocket.emit).toHaveBeenCalledWith('private_message', expect.objectContaining({
      message,
      targetUserId,
    }));
  });

  it('should clean up old messages', () => {
    const roomId = 'global';
    const chatRoom = chatSocket.getChatRoomInfo(roomId);

    if (chatRoom) {
      chatRoom.messages.push({
        id: 'msg1',
        userId: 'user1',
        username: 'TestUser',
        message: 'Old message',
        roomId,
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000),
        type: 'message',
      });
    }

    const cleaned = chatSocket.cleanupOldMessages();
    expect(cleaned).toBeGreaterThan(0);
  });
});

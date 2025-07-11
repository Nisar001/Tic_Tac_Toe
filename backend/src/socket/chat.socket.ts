import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket, SocketAuthManager } from './auth.socket';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  roomId: string;
  timestamp: Date;
  type: 'message' | 'system' | 'private';
  targetUserId?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'game' | 'global' | 'private';
  participants: string[];
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

export class ChatSocket {
  private authManager: SocketAuthManager;
  private io: SocketIOServer;
  private chatRooms: Map<string, ChatRoom> = new Map();
  private userTyping: Map<string, { roomId: string; timeout: NodeJS.Timeout }> = new Map();

  constructor(io: SocketIOServer, authManager: SocketAuthManager) {
    this.io = io;
    this.authManager = authManager;
    this.createGlobalChatRoom();
  }

  private createGlobalChatRoom(): void {
    this.chatRooms.set('global', {
      id: 'global',
      name: 'Global Chat',
      type: 'global',
      participants: [],
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    });
  }

  handleChatMessage(socket: AuthenticatedSocket, data: { roomId: string; message: string }) {
    try {
      if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

      const { roomId, message } = data;
      if (!roomId || !message?.trim()) {
        return socket.emit('chat_error', { message: 'Room ID and message required' });
      }

      if (message.length > 500) {
        return socket.emit('chat_error', { message: 'Message too long (max 500 characters)' });
      }

      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) return socket.emit('chat_error', { message: 'Chat room not found' });

      if (chatRoom.type !== 'global' && !chatRoom.participants.includes(socket.user.id)) {
        return socket.emit('chat_error', { message: 'Not a participant in this room' });
      }

      const chatMessage: ChatMessage = {
        id: this.generateMessageId(),
        userId: socket.user.id,
        username: socket.user.username ?? 'Anonymous',
        message: message.trim(),
        roomId,
        timestamp: new Date(),
        type: 'message',
      };

      chatRoom.messages.push(chatMessage);
      chatRoom.lastActivity = new Date();
      chatRoom.messages = chatRoom.messages.slice(-100);

      this.io.to(roomId).emit('chat_message', chatMessage);
      this.handleTypingStop(socket, { roomId });

    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  }

  handleJoinChat(socket: AuthenticatedSocket, data: { roomId: string }) {
    try {
      if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

      const { roomId } = data;
      if (!roomId) return socket.emit('chat_error', { message: 'Room ID is required' });

      let chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom && roomId.startsWith('game_')) {
        chatRoom = {
          id: roomId,
          name: `Game Room ${roomId}`,
          type: 'game',
          participants: [],
          messages: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        };
        this.chatRooms.set(roomId, chatRoom);
      }

      if (!chatRoom) return socket.emit('chat_error', { message: 'Chat room not found' });

      socket.join(roomId);
      if (!chatRoom.participants.includes(socket.user.id)) {
        chatRoom.participants.push(socket.user.id);
      }

      socket.emit('chat_joined', {
        roomId,
        roomName: chatRoom.name,
        messages: chatRoom.messages.slice(-50),
        participants: chatRoom.participants.length,
      });

      socket.to(roomId).emit('user_joined_chat', {
        userId: socket.user.id,
        username: socket.user.username,
        participantCount: chatRoom.participants.length,
      });

    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to join chat room' });
    }
  }

  handleLeaveChat(socket: AuthenticatedSocket, data: { roomId: string }) {
    try {
      if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;
      const { roomId } = data;
      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) return;

      socket.leave(roomId);
      chatRoom.participants = chatRoom.participants.filter(uid => uid !== socket.user!.id);
      this.handleTypingStop(socket, { roomId });

      socket.to(roomId).emit('user_left_chat', {
        userId: socket.user.id,
        username: socket.user.username,
        participantCount: chatRoom.participants.length,
      });

      if (chatRoom.type === 'game' && chatRoom.participants.length === 0) {
        this.chatRooms.delete(roomId);
      }

    } catch (err) {
      console.error('Leave chat error:', err);
    }
  }

  handleGetChatHistory(socket: AuthenticatedSocket, data: { roomId: string; limit?: number; offset?: number }) {
    try {
      if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

      const { roomId, limit = 50, offset = 0 } = data;
      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) return socket.emit('chat_error', { message: 'Chat room not found' });

      if (chatRoom.type !== 'global' && !chatRoom.participants.includes(socket.user.id)) {
        return socket.emit('chat_error', { message: 'Access denied to this room' });
      }

      const messages = chatRoom.messages.slice(-limit - offset, chatRoom.messages.length - offset);
      socket.emit('chat_history', { roomId, messages, hasMore: chatRoom.messages.length > limit + offset });

    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to get chat history' });
    }
  }

  handleTypingStart(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

    const { roomId } = data;
    const existing = this.userTyping.get(socket.user.id);
    if (existing) clearTimeout(existing.timeout);

    const timeout = setTimeout(() => this.handleTypingStop(socket, { roomId }), 3000);
    this.userTyping.set(socket.user.id, { roomId, timeout });

    socket.to(roomId).emit('user_typing', {
      userId: socket.user.id,
      username: socket.user.username,
    });
  }

  handleTypingStop(socket: AuthenticatedSocket, data: { roomId: string }) {
    if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

    const existing = this.userTyping.get(socket.user.id);
    if (existing) {
      clearTimeout(existing.timeout);
      this.userTyping.delete(socket.user.id);

      socket.to(data.roomId).emit('user_stopped_typing', {
        userId: socket.user.id,
        username: socket.user.username,
      });
    }
  }

  handlePrivateMessage(socket: AuthenticatedSocket, data: { targetUserId: string; message: string }) {
    try {
      if (!this.authManager.isSocketAuthenticated(socket) || !socket.user) return;

      const { targetUserId, message } = data;
      if (!targetUserId || !message?.trim()) return;

      const targetSocket = this.authManager.getSocketByUserId(targetUserId);
      if (!targetSocket) return socket.emit('chat_error', { message: 'User is not online' });

      const privateMsg: ChatMessage = {
        id: this.generateMessageId(),
        userId: socket.user.id,
        username: socket.user.username ?? 'Anonymous',
        message: message.trim(),
        roomId: 'private',
        timestamp: new Date(),
        type: 'private',
        targetUserId,
      };

      socket.emit('private_message', privateMsg);
      targetSocket.emit('private_message', privateMsg);

    } catch (err) {
      socket.emit('chat_error', { message: 'Failed to send private message' });
    }
  }

  handlePlayerDisconnect(userId: string) {
    const typing = this.userTyping.get(userId);
    if (typing) {
      clearTimeout(typing.timeout);
      this.userTyping.delete(userId);
    }

    for (const [roomId, room] of this.chatRooms) {
      const index = room.participants.indexOf(userId);
      if (index !== -1) {
        room.participants.splice(index, 1);
        this.io.to(roomId).emit('user_left_chat', {
          userId,
          username: 'User',
          participantCount: room.participants.length,
        });
      }
    }
  }

  sendSystemMessage(roomId: string, message: string) {
    const chatRoom = this.chatRooms.get(roomId);
    if (!chatRoom) return;

    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      userId: 'system',
      username: 'System',
      message,
      roomId,
      timestamp: new Date(),
      type: 'system',
    };

    chatRoom.messages.push(systemMessage);
    this.io.to(roomId).emit('chat_message', systemMessage);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  getChatRoomInfo(roomId: string): ChatRoom | undefined {
    return this.chatRooms.get(roomId);
  }

  getAllChatRooms(): ChatRoom[] {
    return [...this.chatRooms.values()];
  }

  cleanupOldMessages(): number {
    let cleaned = 0;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const room of this.chatRooms.values()) {
      const before = room.messages.length;
      room.messages = room.messages.filter(msg => msg.timestamp.getTime() > cutoff);
      cleaned += before - room.messages.length;
    }

    return cleaned;
  }
}

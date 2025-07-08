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
  targetUserId?: string; // For private messages
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'game' | 'global' | 'private';
  participants: string[]; // user IDs
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
    
    // Initialize global chat room
    this.createGlobalChatRoom();
  }

  /**
   * Create global chat room
   */
  private createGlobalChatRoom(): void {
    const globalRoom: ChatRoom = {
      id: 'global',
      name: 'Global Chat',
      type: 'global',
      participants: [],
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    this.chatRooms.set('global', globalRoom);
  }

  /**
   * Handle chat message
   */
  handleChatMessage(socket: AuthenticatedSocket, data: { roomId: string; message: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId, message } = data;

      if (!roomId || !message || message.trim().length === 0) {
        socket.emit('chat_error', { message: 'Room ID and message are required' });
        return;
      }

      if (message.length > 500) {
        socket.emit('chat_error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) {
        socket.emit('chat_error', { message: 'Chat room not found' });
        return;
      }

      // Check if user is participant
      if (!chatRoom.participants.includes(socket.user.id) && chatRoom.type !== 'global') {
        socket.emit('chat_error', { message: 'You are not a participant in this chat room' });
        return;
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        id: this.generateMessageId(),
        userId: socket.user.id,
        username: socket.user.username || 'Anonymous',
        message: message.trim(),
        roomId,
        timestamp: new Date(),
        type: 'message'
      };

      // Add to room messages
      chatRoom.messages.push(chatMessage);
      chatRoom.lastActivity = new Date();

      // Keep only last 100 messages per room
      if (chatRoom.messages.length > 100) {
        chatRoom.messages = chatRoom.messages.slice(-100);
      }

      // Broadcast message to room
      this.io.to(roomId).emit('chat_message', chatMessage);

      // Stop typing indicator for this user
      this.handleTypingStop(socket, { roomId });

      console.log(`💬 Chat message in ${roomId} from ${socket.user.username}: ${message}`);

    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('chat_error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle joining chat room
   */
  handleJoinChat(socket: AuthenticatedSocket, data: { roomId: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId } = data;

      if (!roomId) {
        socket.emit('chat_error', { message: 'Room ID is required' });
        return;
      }

      let chatRoom = this.chatRooms.get(roomId);
      
      // Create room if it doesn't exist (for game rooms)
      if (!chatRoom && roomId.startsWith('game_')) {
        chatRoom = {
          id: roomId,
          name: `Game ${roomId.replace('game_', '')}`,
          type: 'game',
          participants: [],
          messages: [],
          createdAt: new Date(),
          lastActivity: new Date()
        };
        this.chatRooms.set(roomId, chatRoom);
      }

      if (!chatRoom) {
        socket.emit('chat_error', { message: 'Chat room not found' });
        return;
      }

      // Join socket room
      socket.join(roomId);

      // Add user to participants if not already there
      if (!chatRoom.participants.includes(socket.user.id)) {
        chatRoom.participants.push(socket.user.id);
      }

      // Send recent messages
      const recentMessages = chatRoom.messages.slice(-50); // Last 50 messages
      
      socket.emit('chat_joined', {
        roomId,
        roomName: chatRoom.name,
        messages: recentMessages,
        participants: chatRoom.participants.length
      });

      // Notify others
      socket.to(roomId).emit('user_joined_chat', {
        userId: socket.user.id,
        username: socket.user.username,
        participantCount: chatRoom.participants.length
      });

      console.log(`👥 User ${socket.user.username} joined chat room: ${roomId}`);

    } catch (error) {
      console.error('Join chat error:', error);
      socket.emit('chat_error', { message: 'Failed to join chat room' });
    }
  }

  /**
   * Handle leaving chat room
   */
  handleLeaveChat(socket: AuthenticatedSocket, data: { roomId: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      return;
    }

    try {
      const { roomId } = data;

      if (!roomId) {
        return;
      }

      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) {
        return;
      }

      // Leave socket room
      socket.leave(roomId);

      // Remove from participants
      const index = chatRoom.participants.indexOf(socket.user.id);
      if (index > -1) {
        chatRoom.participants.splice(index, 1);
      }

      // Stop typing if user was typing
      this.handleTypingStop(socket, { roomId });

      // Notify others
      socket.to(roomId).emit('user_left_chat', {
        userId: socket.user.id,
        username: socket.user.username,
        participantCount: chatRoom.participants.length
      });

      // Clean up empty game rooms
      if (chatRoom.type === 'game' && chatRoom.participants.length === 0) {
        this.chatRooms.delete(roomId);
      }

      console.log(`👋 User ${socket.user.username} left chat room: ${roomId}`);

    } catch (error) {
      console.error('Leave chat error:', error);
    }
  }

  /**
   * Handle get chat history
   */
  handleGetChatHistory(socket: AuthenticatedSocket, data: { roomId: string; limit?: number; offset?: number }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { roomId, limit = 50, offset = 0 } = data;

      const chatRoom = this.chatRooms.get(roomId);
      if (!chatRoom) {
        socket.emit('chat_error', { message: 'Chat room not found' });
        return;
      }

      // Check if user is participant (except for global chat)
      if (chatRoom.type !== 'global' && !chatRoom.participants.includes(socket.user.id)) {
        socket.emit('chat_error', { message: 'Access denied to this chat room' });
        return;
      }

      const messages = chatRoom.messages.slice(Math.max(0, chatRoom.messages.length - limit - offset), chatRoom.messages.length - offset);

      socket.emit('chat_history', {
        roomId,
        messages,
        hasMore: chatRoom.messages.length > limit + offset
      });

    } catch (error) {
      console.error('Get chat history error:', error);
      socket.emit('chat_error', { message: 'Failed to get chat history' });
    }
  }

  /**
   * Handle typing start
   */
  handleTypingStart(socket: AuthenticatedSocket, data: { roomId: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      return;
    }

    try {
      const { roomId } = data;

      // Clear existing timeout
      const existing = this.userTyping.get(socket.user.id);
      if (existing) {
        clearTimeout(existing.timeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        this.handleTypingStop(socket, { roomId });
      }, 3000); // Auto-stop typing after 3 seconds

      this.userTyping.set(socket.user.id, { roomId, timeout });

      // Broadcast typing indicator
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        username: socket.user.username
      });

    } catch (error) {
      console.error('Typing start error:', error);
    }
  }

  /**
   * Handle typing stop
   */
  handleTypingStop(socket: AuthenticatedSocket, data: { roomId: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      return;
    }

    try {
      const { roomId } = data;

      const existing = this.userTyping.get(socket.user.id);
      if (existing) {
        clearTimeout(existing.timeout);
        this.userTyping.delete(socket.user.id);

        // Broadcast stop typing
        socket.to(roomId).emit('user_stopped_typing', {
          userId: socket.user.id,
          username: socket.user.username
        });
      }

    } catch (error) {
      console.error('Typing stop error:', error);
    }
  }

  /**
   * Handle private message
   */
  handlePrivateMessage(socket: AuthenticatedSocket, data: { targetUserId: string; message: string }): void {
    if (!this.authManager.isSocketAuthenticated(socket)) {
      socket.emit('auth_required', { message: 'Authentication required for this action' });
      return;
    }

    try {
      const { targetUserId, message } = data;

      if (!targetUserId || !message || message.trim().length === 0) {
        socket.emit('chat_error', { message: 'Target user ID and message are required' });
        return;
      }

      if (message.length > 500) {
        socket.emit('chat_error', { message: 'Message too long (max 500 characters)' });
        return;
      }

      const targetSocket = this.authManager.getSocketByUserId(targetUserId);
      if (!targetSocket) {
        socket.emit('chat_error', { message: 'Target user is not online' });
        return;
      }

      // Create private message
      const privateMessage: ChatMessage = {
        id: this.generateMessageId(),
        userId: socket.user.id,
        username: socket.user.username || 'Anonymous',
        message: message.trim(),
        roomId: 'private',
        timestamp: new Date(),
        type: 'private',
        targetUserId
      };

      // Send to both sender and receiver
      socket.emit('private_message', privateMessage);
      targetSocket.emit('private_message', privateMessage);

      console.log(`📩 Private message from ${socket.user.username} to ${targetUserId}: ${message}`);

    } catch (error) {
      console.error('Private message error:', error);
      socket.emit('chat_error', { message: 'Failed to send private message' });
    }
  }

  /**
   * Handle player disconnect
   */
  handlePlayerDisconnect(userId: string): void {
    try {
      // Stop typing indicators
      const typingEntry = this.userTyping.get(userId);
      if (typingEntry) {
        clearTimeout(typingEntry.timeout);
        this.userTyping.delete(userId);
      }

      // Remove from all chat rooms
      this.chatRooms.forEach((room, roomId) => {
        const index = room.participants.indexOf(userId);
        if (index > -1) {
          room.participants.splice(index, 1);
          
          // Notify others in the room
          this.io.to(roomId).emit('user_left_chat', {
            userId,
            username: 'User', // We don't have username here
            participantCount: room.participants.length
          });
        }
      });

      console.log(`🚪 User ${userId} disconnected from all chat rooms`);

    } catch (error) {
      console.error('Handle chat disconnect error:', error);
    }
  }

  /**
   * Send system message to room
   */
  sendSystemMessage(roomId: string, message: string): void {
    const chatRoom = this.chatRooms.get(roomId);
    if (!chatRoom) {
      return;
    }

    const systemMessage: ChatMessage = {
      id: this.generateMessageId(),
      userId: 'system',
      username: 'System',
      message,
      roomId,
      timestamp: new Date(),
      type: 'system'
    };

    chatRoom.messages.push(systemMessage);
    this.io.to(roomId).emit('chat_message', systemMessage);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get chat room info
   */
  getChatRoomInfo(roomId: string): ChatRoom | undefined {
    return this.chatRooms.get(roomId);
  }

  /**
   * Get all chat rooms for admin
   */
  getAllChatRooms(): ChatRoom[] {
    return Array.from(this.chatRooms.values());
  }

  /**
   * Clean up old messages
   */
  cleanupOldMessages(): number {
    let cleaned = 0;
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    this.chatRooms.forEach((room) => {
      const originalLength = room.messages.length;
      room.messages = room.messages.filter(msg => msg.timestamp > cutoffTime);
      cleaned += originalLength - room.messages.length;
    });

    console.log(`🧹 Cleaned up ${cleaned} old chat messages`);
    return cleaned;
  }
}

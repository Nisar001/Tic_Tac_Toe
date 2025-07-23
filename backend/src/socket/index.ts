import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketAuthManager, AuthenticatedSocket } from './auth.socket';
import { MatchmakingSocket } from './matchmaking.socket';
import GameSocket from './game.socket';
import { ChatSocket } from './chat.socket';

export class SocketManager {
  private io: SocketIOServer;
  private authManager: SocketAuthManager;
  private matchmakingSocket: MatchmakingSocket;
  private gameSocket: GameSocket;
  private chatSocket: ChatSocket;
  private connectionAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private static readonly MAX_CONNECTIONS_PER_IP = 10;
  private static readonly CONNECTION_WINDOW = 60 * 1000; // 1 minute

  constructor(io: SocketIOServer) {
    this.io = io;
    this.authManager = new SocketAuthManager();
    this.matchmakingSocket = new MatchmakingSocket(io, this.authManager);
    this.gameSocket = new GameSocket(io, this.authManager);
    this.chatSocket = new ChatSocket(io, this.authManager);

    this.initializeSocketHandlers();
    
    // Make Socket.io available globally for controllers
    (global as any).socketIO = io;
    
    // Clean up connection attempts every 5 minutes
    setInterval(() => this.cleanupConnectionAttempts(), 5 * 60 * 1000);
  }

  /**
   * Clean up old connection attempts
   */
  private cleanupConnectionAttempts(): void {
    const now = new Date();
    for (const [ip, attempts] of this.connectionAttempts.entries()) {
      if (now.getTime() - attempts.lastAttempt.getTime() > SocketManager.CONNECTION_WINDOW) {
        this.connectionAttempts.delete(ip);
      }
    }
  }

  /**
   * Initialize all socket event handlers
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      const clientIp = socket.handshake.address || 'unknown';
      
      // Check connection rate limiting
      if (!this.checkConnectionRateLimit(clientIp)) {
        socket.disconnect(true);
        return;
      }
      
      // Only log successful connections after authentication
      let hasLoggedConnection = false;

      // Authentication handlers
      this.setupAuthHandlers(authSocket);

      // Setup authenticated event listeners
      authSocket.on('authenticated', () => {
        // Only setup handlers after authentication
        this.setupMatchmakingHandlers(authSocket);
        this.setupGameHandlers(authSocket);
        this.setupChatHandlers(authSocket);
      });

      // Connection management
      this.setupConnectionHandlers(authSocket);
    });
  }

  /**
   * Check connection rate limiting
   */
  private checkConnectionRateLimit(clientIp: string): boolean {
    const now = new Date();
    const attempts = this.connectionAttempts.get(clientIp);
    
    if (attempts) {
      // Clean old attempts
      if (now.getTime() - attempts.lastAttempt.getTime() > SocketManager.CONNECTION_WINDOW) {
        attempts.count = 1;
        attempts.lastAttempt = now;
      } else {
        attempts.count++;
        attempts.lastAttempt = now;
        
        if (attempts.count > SocketManager.MAX_CONNECTIONS_PER_IP) {
          return false;
        }
      }
    } else {
      this.connectionAttempts.set(clientIp, { count: 1, lastAttempt: now });
    }
    
    return true;
  }

  /**
   * Set up authentication event handlers
   */
  private setupAuthHandlers(socket: AuthenticatedSocket): void {
    // Authentication
    socket.on('authenticate', async (token: string) => {
      await this.authManager.authenticateSocket(socket, token);
    });

    // Get online users
    socket.on('get_online_users', () => {
      if (this.authManager.isSocketAuthenticated(socket)) {
        const onlineUsers = this.authManager.getOnlineUsers();
        socket.emit('online_users', onlineUsers);
      } else {
        socket.emit('auth_required', { message: 'Authentication required' });
      }
    });

    // Heartbeat for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  /**
   * Set up matchmaking event handlers
   */
  private setupMatchmakingHandlers(socket: AuthenticatedSocket): void {
    // Find match
    socket.on('find_match', (data) => {
      this.matchmakingSocket.handleFindMatch(socket, data);
    });

    // Cancel matchmaking
    socket.on('cancel_matchmaking', () => {
      this.matchmakingSocket.handleCancelMatchmaking(socket);
    });

    // Get matchmaking status
    socket.on('get_matchmaking_status', () => {
      this.matchmakingSocket.handleGetMatchmakingStatus(socket);
    });

    // Quick match (optional - for faster matching with relaxed criteria)
    socket.on('quick_match', (data) => {
      this.matchmakingSocket.handleFindMatch(socket, { ...data, quickMatch: true });
    });
  }

  /**
   * Set up game event handlers
   */
  private setupGameHandlers(socket: AuthenticatedSocket): void {
    this.gameSocket.setupGameHandlers(socket);
  }

  /**
   * Set up chat event handlers
   */
  private setupChatHandlers(socket: AuthenticatedSocket): void {
    // Legacy chat events
    socket.on('chat_message', (data) => {
      this.chatSocket.handleChatMessage(socket, data);
    });

    socket.on('join_chat', (data) => {
      this.chatSocket.handleJoinChat(socket, data);
    });

    socket.on('leave_chat', (data) => {
      this.chatSocket.handleLeaveChat(socket, data);
    });

    socket.on('get_chat_history', (data) => {
      this.chatSocket.handleGetChatHistory(socket, data);
    });

    socket.on('typing_start', (data) => {
      this.chatSocket.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.chatSocket.handleTypingStop(socket, data);
    });

    socket.on('private_message', (data) => {
      this.chatSocket.handlePrivateMessage(socket, data);
    });
  }

  /**
   * Set up connection management handlers
   */
  private setupConnectionHandlers(socket: AuthenticatedSocket): void {
    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      // Only log disconnects for authenticated users to reduce spam
      if (this.authManager.isSocketAuthenticated(socket) && socket.user?.id) {
        // Handle game disconnect
        this.gameSocket.handlePlayerDisconnect(socket.user.id);
        // Handle matchmaking disconnect
        this.matchmakingSocket.handlePlayerDisconnect(socket.user.id);
        // Handle chat disconnect
        this.chatSocket.handlePlayerDisconnect(socket.user.id);
        // Broadcast user offline status
        this.io.emit('user_offline', {
          userId: socket.user.id,
          onlineCount: this.authManager.getOnlineUsersCount() - 1
        });
      }
      
      // Remove from authenticated sockets
      this.authManager.removeSocket(socket.id);
    });

    // Handle connection errors
    socket.on('error', (error: Error) => {
      // Emit error to client
      socket.emit('socket_error', {
        message: 'Connection error occurred',
        code: 'CONNECTION_ERROR'
      });
    });

    // Handle reconnection
    socket.on('reconnect_attempt', (attemptNumber: number) => {
      // Reconnection attempt handled silently
    });
  }

  /**
   * Get socket manager instances for external use
   */
  getAuthManager(): SocketAuthManager {
    return this.authManager;
  }

  getMatchmakingSocket(): MatchmakingSocket {
    return this.matchmakingSocket;
  }

  getGameSocket(): GameSocket {
    return this.gameSocket;
  }

  getChatSocket(): ChatSocket {
    return this.chatSocket;
  }

  /**
   * Broadcast system message to all connected users
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system_message', {
      message,
      type,
      timestamp: new Date()
    });
  }

  /**
   * Get server statistics
   */
  getServerStats() {
    return {
      connectedSockets: this.io.sockets.sockets.size,
      authenticatedUsers: this.authManager.getOnlineUsersCount(),
      activeGames: this.gameSocket.getActiveGames().length,
      queueStats: this.matchmakingSocket.getQueueStats()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Notify all connected clients
    this.broadcastSystemMessage('Server is shutting down for maintenance', 'warning');
    
    // Give clients time to process the message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Close all socket connections
    this.io.close();
  }
}

// Export types for external use
export { AuthenticatedSocket, SocketAuthManager } from './auth.socket';
export { MatchmakingSocket } from './matchmaking.socket';
export { GameSocket, GameRoom } from './game.socket';
export { ChatSocket } from './chat.socket';

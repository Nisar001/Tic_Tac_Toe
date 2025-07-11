import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketAuthManager, AuthenticatedSocket } from './auth.socket';
import { MatchmakingSocket } from './matchmaking.socket';
import { GameSocket } from './game.socket';
import { ChatSocket } from './chat.socket';

export class SocketManager {
  private io: SocketIOServer;
  private authManager: SocketAuthManager;
  private matchmakingSocket: MatchmakingSocket;
  private gameSocket: GameSocket;
  private chatSocket: ChatSocket;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.authManager = new SocketAuthManager();
    this.matchmakingSocket = new MatchmakingSocket(io, this.authManager);
    this.gameSocket = new GameSocket(io, this.authManager);
    this.chatSocket = new ChatSocket(io, this.authManager);

    this.initializeSocketHandlers();
  }

  /**
   * Initialize all socket event handlers
   */
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      console.log(`👤 User connected: ${socket.id}`);

      // Authentication handlers
      this.setupAuthHandlers(authSocket);

      // Matchmaking handlers
      this.setupMatchmakingHandlers(authSocket);

      // Game handlers
      this.setupGameHandlers(authSocket);

      // Chat handlers
      this.setupChatHandlers(authSocket);

      // Connection management
      this.setupConnectionHandlers(authSocket);
    });
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
    // Join game room
    socket.on('join_room', (data) => {
      this.gameSocket.handleJoinRoom(socket, data);
    });

    // Leave game room
    socket.on('leave_room', (data) => {
      this.gameSocket.handleLeaveRoom(socket, data);
    });

    // Player move
    socket.on('player_move', (data) => {
      this.gameSocket.handlePlayerMove(socket, data);
    });

    // Game surrender
    socket.on('surrender', (data) => {
      this.gameSocket.handleSurrender(socket, data);
    });

    // Request rematch
    socket.on('request_rematch', (data) => {
      this.gameSocket.handleRematchRequest(socket, data);
    });

    // Accept/decline rematch
    socket.on('rematch_response', (data) => {
      this.gameSocket.handleRematchResponse(socket, data);
    });

    // Get game state
    socket.on('get_game_state', (data) => {
      this.gameSocket.handleGetGameState(socket, data);
    });

    // Spectate game
    socket.on('spectate_game', (data) => {
      this.gameSocket.handleSpectateGame(socket, data);
    });

    // Stop spectating
    socket.on('stop_spectating', (data) => {
      this.gameSocket.handleStopSpectating(socket, data);
    });
  }

  /**
   * Set up chat event handlers
   */
  private setupChatHandlers(socket: AuthenticatedSocket): void {
    // Send chat message
    socket.on('chat_message', (data) => {
      this.chatSocket.handleChatMessage(socket, data);
    });

    // Join chat room
    socket.on('join_chat', (data) => {
      this.chatSocket.handleJoinChat(socket, data);
    });

    // Leave chat room
    socket.on('leave_chat', (data) => {
      this.chatSocket.handleLeaveChat(socket, data);
    });

    // Get chat history
    socket.on('get_chat_history', (data) => {
      this.chatSocket.handleGetChatHistory(socket, data);
    });

    // Typing indicators
    socket.on('typing_start', (data) => {
      this.chatSocket.handleTypingStart(socket, data);
    });

    socket.on('typing_stop', (data) => {
      this.chatSocket.handleTypingStop(socket, data);
    });

    // Private messages
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
      console.log(`👋 User disconnected: ${socket.id}, reason: ${reason}`);
      
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
      console.error(`🚨 Socket error for ${socket.id}:`, error);
      
      // Emit error to client
      socket.emit('socket_error', {
        message: 'Connection error occurred',
        code: 'CONNECTION_ERROR'
      });
    });

    // Handle reconnection
    socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber} for socket ${socket.id}`);
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
      activeGames: this.gameSocket.getActiveGamesCount(),
      queueStats: this.matchmakingSocket.getQueueStats()
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down socket manager...');
    
    // Notify all connected clients
    this.broadcastSystemMessage('Server is shutting down for maintenance', 'warning');
    
    // Give clients time to process the message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Close all socket connections
    this.io.close();
    
    console.log('🔴 Socket manager shutdown complete');
  }
}

// Export types for external use
export { AuthenticatedSocket, SocketAuthManager } from './auth.socket';
export { MatchmakingSocket } from './matchmaking.socket';
export { GameSocket, GameRoom } from './game.socket';
export { ChatSocket } from './chat.socket';

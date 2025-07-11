import { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketManager } from '../../../src/socket/index';
import { SocketAuthManager, AuthenticatedSocket } from '../../../src/socket/auth.socket';
import { MatchmakingSocket } from '../../../src/socket/matchmaking.socket';
import { GameSocket } from '../../../src/socket/game.socket';
import { ChatSocket } from '../../../src/socket/chat.socket';

// Mock dependencies
jest.mock('../../../src/socket/auth.socket');
jest.mock('../../../src/socket/matchmaking.socket');
jest.mock('../../../src/socket/game.socket');
jest.mock('../../../src/socket/chat.socket');

describe('SocketManager Unit Tests', () => {
  let io: jest.Mocked<SocketIOServer>;
  let socketManager: SocketManager;
  let mockSocket: jest.Mocked<AuthenticatedSocket>;
  let mockAuthManager: jest.Mocked<SocketAuthManager>;
  let mockMatchmakingSocket: jest.Mocked<MatchmakingSocket>;
  let mockGameSocket: jest.Mocked<GameSocket>;
  let mockChatSocket: jest.Mocked<ChatSocket>;

  beforeEach(() => {
    // Mock SocketIO server
    io = {
      on: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
      sockets: {
        sockets: new Map()
      }
    } as any;

    // Mock socket
    mockSocket = {
      id: 'socket123',
      on: jest.fn(),
      emit: jest.fn(),
      user: {
        id: 'user123',
        username: 'testuser'
      }
    } as any;

    // Mock auth manager
    mockAuthManager = {
      authenticateSocket: jest.fn(),
      isSocketAuthenticated: jest.fn(),
      getOnlineUsers: jest.fn(),
      getOnlineUsersCount: jest.fn(),
      removeSocket: jest.fn()
    } as any;

    // Mock matchmaking socket
    mockMatchmakingSocket = {
      handleFindMatch: jest.fn(),
      handleCancelMatchmaking: jest.fn(),
      handleGetMatchmakingStatus: jest.fn(),
      handlePlayerDisconnect: jest.fn(),
      getQueueStats: jest.fn()
    } as any;

    // Mock game socket
    mockGameSocket = {
      handleJoinRoom: jest.fn(),
      handleLeaveRoom: jest.fn(),
      handlePlayerMove: jest.fn(),
      handleSurrender: jest.fn(),
      handleRematchRequest: jest.fn(),
      handleRematchResponse: jest.fn(),
      handleGetGameState: jest.fn(),
      handleSpectateGame: jest.fn(),
      handleStopSpectating: jest.fn(),
      handlePlayerDisconnect: jest.fn(),
      getActiveGamesCount: jest.fn(),
      createCustomGame: jest.fn()
    } as any;

    // Mock chat socket
    mockChatSocket = {
      handleChatMessage: jest.fn(),
      handleJoinChat: jest.fn(),
      handleLeaveChat: jest.fn(),
      handleGetChatHistory: jest.fn(),
      handleTypingStart: jest.fn(),
      handleTypingStop: jest.fn(),
      handlePrivateMessage: jest.fn(),
      handlePlayerDisconnect: jest.fn()
    } as any;

    // Setup mocks
    (SocketAuthManager as unknown as jest.Mock).mockImplementation(() => mockAuthManager);
    (MatchmakingSocket as jest.Mock).mockImplementation(() => mockMatchmakingSocket);
    (GameSocket as jest.Mock).mockImplementation(() => mockGameSocket);
    (ChatSocket as jest.Mock).mockImplementation(() => mockChatSocket);

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    socketManager = new SocketManager(io);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with all socket managers', () => {
      expect(SocketAuthManager).toHaveBeenCalled();
      expect(MatchmakingSocket).toHaveBeenCalledWith(io, mockAuthManager);
      expect(GameSocket).toHaveBeenCalledWith(io, mockAuthManager);
      expect(ChatSocket).toHaveBeenCalledWith(io, mockAuthManager);
      expect(io.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should return socket manager instances', () => {
      expect(socketManager.getAuthManager()).toBe(mockAuthManager);
      expect(socketManager.getMatchmakingSocket()).toBe(mockMatchmakingSocket);
      expect(socketManager.getGameSocket()).toBe(mockGameSocket);
      expect(socketManager.getChatSocket()).toBe(mockChatSocket);
    });
  });

  describe('Socket Connection Handling', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
    });

    it('should set up handlers when socket connects', () => {
      connectionHandler(mockSocket);

      expect(console.log).toHaveBeenCalledWith(`👤 User connected: ${mockSocket.id}`);
      expect(mockSocket.on).toHaveBeenCalledTimes(21); // All event handlers
    });

    it('should set up authentication handlers', () => {
      connectionHandler(mockSocket);

      const authenticateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'authenticate');
      const getOnlineUsersHandler = mockSocket.on.mock.calls.find(call => call[0] === 'get_online_users');
      const pingHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ping');

      expect(authenticateHandler).toBeDefined();
      expect(getOnlineUsersHandler).toBeDefined();
      expect(pingHandler).toBeDefined();
    });

    it('should set up matchmaking handlers', () => {
      connectionHandler(mockSocket);

      const findMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'find_match');
      const cancelMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'cancel_matchmaking');
      const getStatusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'get_matchmaking_status');
      const quickMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'quick_match');

      expect(findMatchHandler).toBeDefined();
      expect(cancelMatchHandler).toBeDefined();
      expect(getStatusHandler).toBeDefined();
      expect(quickMatchHandler).toBeDefined();
    });

    it('should set up game handlers', () => {
      connectionHandler(mockSocket);

      const gameHandlers = [
        'join_room', 'leave_room', 'player_move', 'surrender',
        'request_rematch', 'rematch_response', 'get_game_state',
        'spectate_game', 'stop_spectating'
      ];

      gameHandlers.forEach(event => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === event);
        expect(handler).toBeDefined();
      });
    });

    it('should set up chat handlers', () => {
      connectionHandler(mockSocket);

      const chatHandlers = [
        'chat_message', 'join_chat', 'leave_chat', 'get_chat_history',
        'typing_start', 'typing_stop', 'private_message'
      ];

      chatHandlers.forEach(event => {
        const handler = mockSocket.on.mock.calls.find(call => call[0] === event);
        expect(handler).toBeDefined();
      });
    });

    it('should set up connection management handlers', () => {
      connectionHandler(mockSocket);

      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect');
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error');
      const reconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'reconnect_attempt');

      expect(disconnectHandler).toBeDefined();
      expect(errorHandler).toBeDefined();
      expect(reconnectHandler).toBeDefined();
    });
  });

  describe('Authentication Event Handlers', () => {
    let connectionHandler: Function;
    let authenticateHandler: Function;
    let getOnlineUsersHandler: Function;
    let pingHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      authenticateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'authenticate')?.[1] ?? (() => {});
      getOnlineUsersHandler = mockSocket.on.mock.calls.find(call => call[0] === 'get_online_users')?.[1] ?? (() => {});
      pingHandler = mockSocket.on.mock.calls.find(call => call[0] === 'ping')?.[1] ?? (() => {});
    });

    it('should handle authenticate event', async () => {
      const token = 'jwt.token.here';
      
      await authenticateHandler(token);

      expect(mockAuthManager.authenticateSocket).toHaveBeenCalledWith(mockSocket, token);
    });

    it('should handle get_online_users when authenticated', () => {
      const onlineUsers = [
        { id: 'user1', email: 'user1@example.com', socketId: 'socket1' },
        { id: 'user2', email: 'user2@example.com', socketId: 'socket2' }
      ];
      mockAuthManager.isSocketAuthenticated.mockReturnValue(true);
      mockAuthManager.getOnlineUsers.mockReturnValue(onlineUsers);

      getOnlineUsersHandler();

      expect(mockAuthManager.isSocketAuthenticated).toHaveBeenCalledWith(mockSocket);
      expect(mockAuthManager.getOnlineUsers).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('online_users', onlineUsers);
    });

    it('should require authentication for get_online_users when not authenticated', () => {
      mockAuthManager.isSocketAuthenticated.mockReturnValue(false);

      getOnlineUsersHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('auth_required', { message: 'Authentication required' });
    });

    it('should handle ping event', () => {
      pingHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('pong');
    });
  });

  describe('Matchmaking Event Handlers', () => {
    let connectionHandler: Function;
    let findMatchHandler: Function;
    let cancelMatchHandler: Function;
    let quickMatchHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      findMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'find_match')?.[1] ?? (() => {});
      cancelMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'cancel_matchmaking')?.[1] ?? (() => {});
      quickMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'quick_match')?.[1] ?? (() => {});
    });

    it('should handle find_match event', () => {
      const matchData = { gameMode: 'classic' };
      
      findMatchHandler(matchData);

      expect(mockMatchmakingSocket.handleFindMatch).toHaveBeenCalledWith(mockSocket, matchData);
    });

    it('should handle cancel_matchmaking event', () => {
      cancelMatchHandler();

      expect(mockMatchmakingSocket.handleCancelMatchmaking).toHaveBeenCalledWith(mockSocket);
    });

    it('should handle quick_match event', () => {
      const matchData = { gameMode: 'blitz' };
      
      quickMatchHandler(matchData);

      expect(mockMatchmakingSocket.handleFindMatch).toHaveBeenCalledWith(mockSocket, { ...matchData, quickMatch: true });
    });
  });

  describe('Game Event Handlers', () => {
    let connectionHandler: Function;
    let playerMoveHandler: Function;
    let surrenderHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      playerMoveHandler = mockSocket.on.mock.calls.find(call => call[0] === 'player_move')?.[1] ?? (() => {});
      surrenderHandler = mockSocket.on.mock.calls.find(call => call[0] === 'surrender')?.[1] ?? (() => {});
    });

    it('should handle player_move event', () => {
      const moveData = { gameId: 'game123', position: { row: 1, col: 1 } };
      
      playerMoveHandler(moveData);

      expect(mockGameSocket.handlePlayerMove).toHaveBeenCalledWith(mockSocket, moveData);
    });

    it('should handle surrender event', () => {
      const surrenderData = { gameId: 'game123' };
      
      surrenderHandler(surrenderData);

      expect(mockGameSocket.handleSurrender).toHaveBeenCalledWith(mockSocket, surrenderData);
    });
  });

  describe('Chat Event Handlers', () => {
    let connectionHandler: Function;
    let chatMessageHandler: Function;
    let typingStartHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      chatMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat_message')?.[1] ?? (() => {});
      typingStartHandler = mockSocket.on.mock.calls.find(call => call[0] === 'typing_start')?.[1] ?? (() => {});
    });

    it('should handle chat_message event', () => {
      const messageData = { gameId: 'game123', message: 'Hello!' };
      
      chatMessageHandler(messageData);

      expect(mockChatSocket.handleChatMessage).toHaveBeenCalledWith(mockSocket, messageData);
    });

    it('should handle typing_start event', () => {
      const typingData = { gameId: 'game123' };
      
      typingStartHandler(typingData);

      expect(mockChatSocket.handleTypingStart).toHaveBeenCalledWith(mockSocket, typingData);
    });
  });

  describe('Connection Management', () => {
    let connectionHandler: Function;
    let disconnectHandler: Function;
    let errorHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);

      disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1] ?? (() => {});
      errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'error')?.[1] ?? (() => {});
    });

    it('should handle authenticated user disconnect', () => {
      mockAuthManager.isSocketAuthenticated.mockReturnValue(true);
      mockAuthManager.getOnlineUsersCount.mockReturnValue(5);

      disconnectHandler('client disconnect');

      expect(console.log).toHaveBeenCalledWith(`👋 User disconnected: ${mockSocket.id}, reason: client disconnect`);
      expect(mockGameSocket.handlePlayerDisconnect).toHaveBeenCalledWith(mockSocket.user?.id);
      expect(mockMatchmakingSocket.handlePlayerDisconnect).toHaveBeenCalledWith(mockSocket.user?.id);
      expect(mockChatSocket.handlePlayerDisconnect).toHaveBeenCalledWith(mockSocket.user?.id);
      expect(io.emit).toHaveBeenCalledWith('user_offline', {
        userId: mockSocket.user?.id,
        onlineCount: 4
      });
      expect(mockAuthManager.removeSocket).toHaveBeenCalledWith(mockSocket.id);
    });

    it('should handle unauthenticated user disconnect', () => {
      mockAuthManager.isSocketAuthenticated.mockReturnValue(false);

     if(disconnectHandler){
      disconnectHandler('Transport close');
     }

      expect(mockGameSocket.handlePlayerDisconnect).not.toHaveBeenCalled();
      expect(io.emit).not.toHaveBeenCalledWith('user_offline', expect.any(Object));
      expect(mockAuthManager.removeSocket).toHaveBeenCalledWith(mockSocket.id);
    });

    it('should handle socket errors', () => {
      const error = new Error('Socket error');

      errorHandler(error);

      expect(console.error).toHaveBeenCalledWith(`🚨 Socket error for ${mockSocket.id}:`, error);
      expect(mockSocket.emit).toHaveBeenCalledWith('socket_error', {
        message: 'Connection error occurred',
        code: 'CONNECTION_ERROR'
      });
    });
  });

  describe('Utility Methods', () => {
    it('should broadcast system message', () => {
      const message = 'Server maintenance scheduled';
      const type = 'warning';

      socketManager.broadcastSystemMessage(message, type);

      expect(io.emit).toHaveBeenCalledWith('system_message', {
        message,
        type,
        timestamp: expect.any(Date)
      });
    });

    it('should broadcast system message with default type', () => {
      const message = 'Welcome message';

      socketManager.broadcastSystemMessage(message);

      expect(io.emit).toHaveBeenCalledWith('system_message', {
        message,
        type: 'info',
        timestamp: expect.any(Date)
      });
    });

    it('should get server statistics', () => {
      io.sockets.sockets.set('socket1', mockSocket);
      io.sockets.sockets.set('socket2', mockSocket);
      mockAuthManager.getOnlineUsersCount.mockReturnValue(2);
      mockGameSocket.getActiveGamesCount.mockReturnValue(3);
      mockMatchmakingSocket.getQueueStats.mockReturnValue({ totalPlayers: 5, averageWaitTime: 0, levelDistribution: {} });

      const stats = socketManager.getServerStats();

      expect(stats).toEqual({
        connectedSockets: 2,
        authenticatedUsers: 2,
        activeGames: 3,
        queueStats: { waiting: 5 }
      });
    });

    it('should perform graceful shutdown', async () => {
      jest.useFakeTimers();
      
      const shutdownPromise = socketManager.shutdown();
      
      expect(io.emit).toHaveBeenCalledWith('system_message', {
        message: 'Server is shutting down for maintenance',
        type: 'warning',
        timestamp: expect.any(Date)
      });

      // Fast-forward time
      jest.advanceTimersByTime(2000);
      await shutdownPromise;

      expect(io.close).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('🛑 Shutting down socket manager...');
      expect(console.log).toHaveBeenCalledWith('🔴 Socket manager shutdown complete');
      
      jest.useRealTimers();
    });
  });

  describe('Event Handler Edge Cases', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
    });

    it('should handle missing socket user in disconnect', () => {
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1] ?? (() => {});
      mockSocket.user = undefined;
      mockAuthManager.isSocketAuthenticated.mockReturnValue(true);

      expect(() => disconnectHandler('client disconnect')).not.toThrow();
    });

    it('should handle authentication errors', async () => {
      const authenticateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'authenticate')?.[1] ?? (() => Promise.reject(new Error('No handler')));
      mockAuthManager.authenticateSocket.mockRejectedValue(new Error('Auth failed'));

      await expect(authenticateHandler('invalid-token')).rejects.toThrow('Auth failed');
    });

    it('should handle undefined event data gracefully', () => {
      const findMatchHandler = mockSocket.on.mock.calls.find(call => call[0] === 'find_match')?.[1] ?? (() => {});
      
      expect(() => findMatchHandler(undefined)).not.toThrow();
      expect(mockMatchmakingSocket.handleFindMatch).toHaveBeenCalledWith(mockSocket, undefined);
    });

    it('should handle null event data gracefully', () => {
      const chatMessageHandler = mockSocket.on.mock.calls.find(call => call[0] === 'chat_message')?.[1] ?? (() => {});
      
      expect(() => chatMessageHandler(null)).not.toThrow();
      expect(mockChatSocket.handleChatMessage).toHaveBeenCalledWith(mockSocket, null);
    });
  });

  describe('Error Handling', () => {
    it('should handle socket manager initialization errors', () => {
      (SocketAuthManager as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('Auth manager init failed');
      });

      expect(() => new SocketManager(io)).toThrow('Auth manager init failed');
    });

    it('should handle IO server errors during setup', () => {
      const errorIO = {
        on: jest.fn().mockImplementation(() => {
          throw new Error('IO setup failed');
        }),
        emit: jest.fn(),
        close: jest.fn(),
        sockets: { sockets: new Map() }
      } as any;

      expect(() => new SocketManager(errorIO)).toThrow('IO setup failed');
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up on socket disconnect', () => {
      const connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      connectionHandler(mockSocket);
      
      const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      mockAuthManager.isSocketAuthenticated.mockReturnValue(true);

      if(disconnectHandler){
        disconnectHandler('transport close');
      }

      expect(mockAuthManager.removeSocket).toHaveBeenCalledWith(mockSocket.id);
    });

    it('should handle multiple rapid disconnections', () => {
      const connectionHandler = (io.on as jest.Mock).mock.calls[0][1];
      
      // Simulate multiple socket connections
      const sockets = Array.from({ length: 10 }, (_, i) => ({
        ...mockSocket,
        id: `socket${i}`,
        user: { id: `user${i}`, username: `user${i}` }
      }));

      sockets.forEach(socket => {
        connectionHandler(socket);
        const disconnectHandler = (socket.on as jest.Mock).mock.calls.find(call => call[0] === 'disconnect')[1];
        mockAuthManager.isSocketAuthenticated.mockReturnValue(true);
        disconnectHandler('client disconnect');
      });

      expect(mockAuthManager.removeSocket).toHaveBeenCalledTimes(10);
    });
  });
});

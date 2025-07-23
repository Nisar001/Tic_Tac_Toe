import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS, STORAGE_KEYS } from '../constants';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(): Socket {
    // Prevent multiple simultaneous connections
    if (this.socket?.connected || this.isConnecting) {
      return this.socket!;
    }

    this.isConnecting = true;
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    // Don't force new connections unless necessary
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false, // Allow connection reuse
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      
      // Clear any pending reconnection attempts
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      this.isConnecting = false;
      
      // Only attempt reconnection for connection issues, not manual disconnects
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server initiated disconnect - try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error);
      this.isConnecting = false;
      this.handleReconnect();
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error: any) => {
      console.error('Socket error:', error);
    });

    // Add authentication error handling
    this.socket.on('unauthorized', () => {
      console.error('Socket authentication failed');
      this.disconnect();
    });
  }

  private handleReconnect(): void {
    // Don't reconnect if already attempting or if max attempts reached
    if (this.isConnecting || this.reconnectTimer || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.socket?.connected && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      }
    }, delay);
  }

  disconnect(): void {
    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
    // Silently ignore if socket not connected
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  once(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Game-specific methods
  joinGameRoom(roomId: string): void {
    this.emit('joinRoom', { roomId });
  }

  leaveGameRoom(roomId: string): void {
    this.emit('leaveRoom', { roomId });
  }

  makeMove(roomId: string, position: { row: number; col: number }): void {
    this.emit('makeMove', { roomId, position });
  }

  // Chat-specific methods
  joinChatRoom(roomId: string): void {
    this.emit('joinChatRoom', { roomId });
  }

  leaveChatRoom(roomId: string): void {
    this.emit('leaveChatRoom', { roomId });
  }

  sendMessage(roomId: string, message: string): void {
    this.emit('sendMessage', { roomId, message });
  }

  // Matchmaking-specific methods
  joinMatchmakingQueue(preferences: any): void {
    this.emit('joinQueue', preferences);
  }

  leaveMatchmakingQueue(): void {
    this.emit('leaveQueue');
  }

  // Typing indicators
  startTyping(roomId: string): void {
    this.emit('startTyping', { roomId });
  }

  stopTyping(roomId: string): void {
    this.emit('stopTyping', { roomId });
  }
}

export const socketService = new SocketService();
export default socketService;



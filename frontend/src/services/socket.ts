import { io, Socket } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS, STORAGE_KEYS } from '../constants';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason: string) => {
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      this.handleReconnect();
    });

    this.socket.on(SOCKET_EVENTS.ERROR, (error: any) => {
      // Socket errors handled silently
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
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

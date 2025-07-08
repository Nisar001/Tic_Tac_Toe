import { Server as SocketIOServer, Socket } from 'socket.io';
import { AuthUtils } from '../utils/auth.utils';
import { EnergyManager } from '../utils/energy.utils';

export interface AuthenticatedSocket extends Socket {
  user?: any;
  isAuthenticated?: boolean;
}

export class SocketAuthManager {
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();

  /**
   * Authenticate socket connection
   */
  async authenticateSocket(socket: AuthenticatedSocket, token: string): Promise<boolean> {
    try {
      if (!token) {
        socket.emit('auth_error', { message: 'Token required' });
        return false;
      }

      // Verify token
      const decoded = AuthUtils.verifyToken(token, 'access');
      
      // Get user from database (temporary user object for now)
      const user = {
        id: decoded.userId,
        email: decoded.email,
        // Additional user data would be fetched from database
      };

      if (!user) {
        socket.emit('auth_error', { message: 'User not found' });
        return false;
      }

      // Store authenticated user in socket
      socket.user = user;
      socket.isAuthenticated = true;

      // Add to authenticated sockets map
      this.authenticatedSockets.set(socket.id, socket);

      socket.emit('auth_success', { 
        message: 'Authentication successful',
        user: {
          id: user.id,
          email: user.email
        }
      });

      console.log(`🔐 Socket ${socket.id} authenticated for user ${user.id}`);
      return true;

    } catch (error) {
      console.error('Socket authentication error:', error);
      socket.emit('auth_error', { message: 'Invalid token' });
      return false;
    }
  }

  /**
   * Check if socket is authenticated
   */
  isSocketAuthenticated(socket: AuthenticatedSocket): boolean {
    return socket.isAuthenticated === true && socket.user != null;
  }

  /**
   * Get authenticated socket by user ID
   */
  getSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    for (const [socketId, socket] of this.authenticatedSockets) {
      if (socket.user?.id === userId) {
        return socket;
      }
    }
    return undefined;
  }

  /**
   * Get all authenticated sockets
   */
  getAuthenticatedSockets(): AuthenticatedSocket[] {
    return Array.from(this.authenticatedSockets.values());
  }

  /**
   * Remove socket from authenticated list
   */
  removeSocket(socketId: string): void {
    this.authenticatedSockets.delete(socketId);
  }

  /**
   * Middleware to require authentication
   */
  requireAuth = (handler: (socket: AuthenticatedSocket, ...args: any[]) => void) => {
    return (socket: AuthenticatedSocket, ...args: any[]) => {
      if (!this.isSocketAuthenticated(socket)) {
        socket.emit('auth_required', { message: 'Authentication required for this action' });
        return;
      }
      handler(socket, ...args);
    };
  };

  /**
   * Broadcast to all authenticated sockets
   */
  broadcastToAuthenticated(event: string, data: any): void {
    this.authenticatedSockets.forEach(socket => {
      socket.emit(event, data);
    });
  }

  /**
   * Broadcast to specific users
   */
  broadcastToUsers(userIds: string[], event: string, data: any): void {
    userIds.forEach(userId => {
      const socket = this.getSocketByUserId(userId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.authenticatedSockets.size;
  }

  /**
   * Get online users list
   */
  getOnlineUsers(): Array<{ id: string; email: string; socketId: string }> {
    return Array.from(this.authenticatedSockets.values()).map(socket => ({
      id: socket.user.id,
      email: socket.user.email,
      socketId: socket.id
    }));
  }
}

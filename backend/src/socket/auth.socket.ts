import { Socket } from 'socket.io';
import { AuthUtils } from '../utils/auth.utils';
import { logError, logInfo, logWarn } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  mockSocket: { id: string; };
  user?: { id: string; email: string; username?: string };
  isAuthenticated?: boolean;
  lastActivity?: Date;
  isRateLimited?: boolean;
}

export interface SocketAuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

export class SocketAuthManager {
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map();
  private authAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private ipAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  // Limits
  private static readonly MAX_AUTH_ATTEMPTS_PER_IP = 10;
  private static readonly MAX_AUTH_ATTEMPTS_PER_SOCKET = 5;
  private static readonly AUTH_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 min

  /**
   * Validate token input
   */
  private validateAuthInput(token: string, socket: Socket): { isValid: boolean; error?: string } {
    if (!token || typeof token !== 'string') return { isValid: false, error: 'Token must be a string' };
    if (token.length > 2000) return { isValid: false, error: 'Token too long' };
    if (/javascript:|<script>/i.test(token)) {
      logWarn(`⚠️ Suspicious token from socket ${socket.id}`);
      return { isValid: false, error: 'Invalid token format' };
    }
    return { isValid: true };
  }

  /**
   * Check auth rate limiting
   */
  private checkRateLimit(socket: AuthenticatedSocket): { allowed: boolean; reason?: string } {
    const now = new Date();
    const socketId = socket.id;
    const clientIp = socket.handshake.address || 'unknown';

    const socketAttempts = this.authAttempts.get(socketId);
    if (socketAttempts && now.getTime() - socketAttempts.lastAttempt.getTime() < SocketAuthManager.AUTH_ATTEMPT_WINDOW &&
      socketAttempts.count >= SocketAuthManager.MAX_AUTH_ATTEMPTS_PER_SOCKET) {
      return { allowed: false, reason: 'Too many attempts from this socket' };
    }

    const ipAttempts = this.ipAttempts.get(clientIp);
    if (ipAttempts && now.getTime() - ipAttempts.lastAttempt.getTime() < SocketAuthManager.AUTH_ATTEMPT_WINDOW &&
      ipAttempts.count >= SocketAuthManager.MAX_AUTH_ATTEMPTS_PER_IP) {
      return { allowed: false, reason: 'Too many attempts from this IP' };
    }

    return { allowed: true };
  }

  /**
   * Record auth attempt
   */
  private recordAuthAttempt(socket: AuthenticatedSocket, success: boolean): void {
    const now = new Date();
    const socketId = socket.id;
    const clientIp = socket.handshake.address || 'unknown';

    const socketRecord = this.authAttempts.get(socketId) || { count: 0, lastAttempt: now };
    socketRecord.count = now.getTime() - socketRecord.lastAttempt.getTime() > SocketAuthManager.AUTH_ATTEMPT_WINDOW ? 1 : socketRecord.count + 1;
    socketRecord.lastAttempt = now;
    this.authAttempts.set(socketId, socketRecord);

    if (!success) {
      const ipRecord = this.ipAttempts.get(clientIp) || { count: 0, lastAttempt: now };
      ipRecord.count = now.getTime() - ipRecord.lastAttempt.getTime() > SocketAuthManager.AUTH_ATTEMPT_WINDOW ? 1 : ipRecord.count + 1;
      ipRecord.lastAttempt = now;
      this.ipAttempts.set(clientIp, ipRecord);
    }
  }

  /**
   * Authenticate socket
   */
  async authenticateSocket(socket: AuthenticatedSocket, token: string): Promise<SocketAuthResult> {
    const rateLimit = this.checkRateLimit(socket);
    if (!rateLimit.allowed) {
      this.recordAuthAttempt(socket, false);
      socket.isRateLimited = true;
      socket.emit('auth_error', { message: rateLimit.reason });
      return { success: false, error: rateLimit.reason };
    }

    const inputValid = this.validateAuthInput(token, socket);
    if (!inputValid.isValid) {
      this.recordAuthAttempt(socket, false);
      socket.emit('auth_error', { message: inputValid.error });
      return { success: false, error: inputValid.error };
    }

    try {
      const decoded = AuthUtils.verifyToken(token, 'access');
      if (!decoded?.userId) throw new Error('Invalid token');

      const user = {
        id: decoded.userId,
        email: decoded.email,
        username: (decoded as any).username || 'Unknown'
      };

      const existing = this.getSocketByUserId(user.id);
      if (existing && existing.id !== socket.id) {
        existing.emit('auth_error', { message: 'Logged in elsewhere' });
        existing.disconnect(true);
        this.removeSocket(existing.id);
      }

      socket.user = user;
      socket.isAuthenticated = true;
      socket.lastActivity = new Date();
      socket.isRateLimited = false;

      this.authenticatedSockets.set(socket.id, socket);
      this.recordAuthAttempt(socket, true);

      socket.emit('auth_success', { message: 'Authenticated', user });
      logInfo(`✅ Socket ${socket.id} authenticated user ${user.id}`);
      return { success: true, user };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.recordAuthAttempt(socket, false);
      socket.emit('auth_error', { message: 'Authentication failed' });
      logError(`❌ Auth error on socket ${socket.id}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  isSocketAuthenticated(socket: AuthenticatedSocket): boolean {
    return !!socket.isAuthenticated && !!socket.user;
  }

  getSocketByUserId(userId: string): AuthenticatedSocket | undefined {
    return Array.from(this.authenticatedSockets.values()).find(s => s.user?.id === userId);
  }

  getAuthenticatedSockets(): AuthenticatedSocket[] {
    return [...this.authenticatedSockets.values()];
  }

  removeSocket(socketId: string): void {
    this.authenticatedSockets.delete(socketId);
  }

  requireAuth(handler: (socket: AuthenticatedSocket, ...args: any[]) => void) {
    return (socket: AuthenticatedSocket, ...args: any[]) => {
      if (!this.isSocketAuthenticated(socket)) {
        socket.emit('auth_required', { message: 'Authentication required' });
        return;
      }
      handler(socket, ...args);
    };
  }

  broadcastToAuthenticated(event: string, data: any): void {
    this.authenticatedSockets.forEach(socket => socket.emit(event, data));
  }

  broadcastToUsers(userIds: string[], event: string, data: any): void {
    for (const id of userIds) {
      const socket = this.getSocketByUserId(id);
      if (socket) socket.emit(event, data);
    }
  }

  getOnlineUsersCount(): number {
    return this.authenticatedSockets.size;
  }

  getOnlineUsers(): Array<{ id: string; email: string; socketId: string }> {
    return Array.from(this.authenticatedSockets.values()).map(s => ({
      id: s.user!.id,
      email: s.user!.email,
      socketId: s.id
    }));
  }
}

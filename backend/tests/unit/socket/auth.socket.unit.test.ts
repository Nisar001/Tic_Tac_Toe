import { Socket } from 'socket.io';
import { SocketAuthManager, AuthenticatedSocket, SocketAuthResult } from '../../../src/socket/auth.socket';
import { AuthUtils } from '../../../src/utils/auth.utils';
import { logError, logInfo, logWarn } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/auth.utils');
jest.mock('../../../src/utils/energy.utils');
jest.mock('../../../src/utils/logger');

const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;
const mockLogError = logError as jest.MockedFunction<typeof logError>;
const mockLogInfo = logInfo as jest.MockedFunction<typeof logInfo>;
const mockLogWarn = logWarn as jest.MockedFunction<typeof logWarn>;

describe('SocketAuthManager', () => {
  let authManager: SocketAuthManager;
  let mockSocket: AuthenticatedSocket;

  beforeEach(() => {
    authManager = new SocketAuthManager();
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        address: '127.0.0.1'
      },
      user: undefined,
      isAuthenticated: false,
      lastActivity: undefined,
      authAttempts: 0,
      isRateLimited: false
    } as any;

    jest.clearAllMocks();
  });

  describe('authenticateSocket', () => {
    it('should successfully authenticate with valid token', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      };

      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      const result = await authManager.authenticateSocket(mockSocket, validToken);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(mockSocket.isAuthenticated).toBe(true);
      expect(mockSocket.user?.id).toBe('user-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_success', expect.objectContaining({
        message: 'Authentication successful',
        user: expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com'
        })
      }));
      expect(mockLogInfo).toHaveBeenCalled();
    });

    it('should reject authentication with invalid token', async () => {
      const invalidToken = 'invalid-token';
      mockAuthUtils.verifyToken.mockReturnValue({});

      const result = await authManager.authenticateSocket(mockSocket, invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token verification failed');
      expect(mockSocket.isAuthenticated).toBe(false);
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Invalid or expired token'
      });
    });

    it('should reject authentication with missing token', async () => {
      const result = await authManager.authenticateSocket(mockSocket, '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token is required and must be a string');
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Invalid authentication data'
      });
    });

    it('should reject authentication with token too long', async () => {
      const longToken = 'a'.repeat(2001);

      const result = await authManager.authenticateSocket(mockSocket, longToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token too long');
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Invalid authentication data'
      });
    });

    it('should detect and reject suspicious tokens', async () => {
      const suspiciousToken = 'token<script>alert("xss")</script>';

      const result = await authManager.authenticateSocket(mockSocket, suspiciousToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token format');
      expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('Suspicious token detected'));
    });

    it('should handle authentication errors gracefully', async () => {
      const validToken = 'valid-token';
      mockAuthUtils.verifyToken.mockImplementation(() => {
        throw new Error('Token verification error');
      });

      const result = await authManager.authenticateSocket(mockSocket, validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token verification error');
      expect(mockLogError).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Authentication failed'
      });
    });

    it('should disconnect existing socket when user logs in from another location', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      };

      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      // First authentication
      await authManager.authenticateSocket(mockSocket, validToken);

      // Second socket with same user
      const secondSocket = {
        id: 'socket-456',
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { address: '127.0.0.1' }
      } as any;

      await authManager.authenticateSocket(secondSocket, validToken);

      expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Logged in from another location'
      });
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should enforce rate limiting per socket', async () => {
      const invalidToken = 'invalid-token';
      mockAuthUtils.verifyToken.mockReturnValue({});

      // Make 5 failed attempts (should be allowed)
      for (let i = 0; i < 5; i++) {
        await authManager.authenticateSocket(mockSocket, invalidToken);
      }

      // 6th attempt should be rate limited
      const result = await authManager.authenticateSocket(mockSocket, invalidToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limited');
      expect(mockSocket.isRateLimited).toBe(true);
    });

    it('should enforce rate limiting per IP', async () => {
      const invalidToken = 'invalid-token';
      mockAuthUtils.verifyToken.mockReturnValue({});

      // Create multiple sockets from same IP
      const sockets = Array.from({ length: 11 }, (_, i) => ({
        id: `socket-${i}`,
        emit: jest.fn(),
        disconnect: jest.fn(),
        handshake: { address: '127.0.0.1' },
        isRateLimited: false
      } as any));

      // Make failed attempts from multiple sockets
      for (const socket of sockets) {
        await authManager.authenticateSocket(socket, invalidToken);
      }

      // Last socket should be rate limited by IP
      const lastSocket = sockets[sockets.length - 1];
      expect(lastSocket.isRateLimited).toBe(true);
    });
  });

  describe('isSocketAuthenticated', () => {
    it('should return true for authenticated socket', () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = { id: 'user-123', email: 'test@example.com' };

      expect(authManager.isSocketAuthenticated(mockSocket)).toBe(true);
    });

    it('should return false for unauthenticated socket', () => {
      mockSocket.isAuthenticated = false;
      mockSocket.user = undefined;

      expect(authManager.isSocketAuthenticated(mockSocket)).toBe(false);
    });

    it('should return false for socket without user', () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = undefined;

      expect(authManager.isSocketAuthenticated(mockSocket)).toBe(false);
    });
  });

  describe('getSocketByUserId', () => {
    it('should return socket for existing user', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      const foundSocket = authManager.getSocketByUserId('user-123');
      expect(foundSocket).toBe(mockSocket);
    });

    it('should return undefined for non-existing user', () => {
      const foundSocket = authManager.getSocketByUserId('non-existing');
      expect(foundSocket).toBeUndefined();
    });
  });

  describe('getAuthenticatedSockets', () => {
    it('should return all authenticated sockets', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      const sockets = authManager.getAuthenticatedSockets();
      expect(sockets).toHaveLength(1);
      expect(sockets[0]).toBe(mockSocket);
    });

    it('should return empty array when no sockets authenticated', () => {
      const sockets = authManager.getAuthenticatedSockets();
      expect(sockets).toHaveLength(0);
    });
  });

  describe('removeSocket', () => {
    it('should remove socket from authenticated list', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);
      expect(authManager.getAuthenticatedSockets()).toHaveLength(1);

      authManager.removeSocket(mockSocket.id);
      expect(authManager.getAuthenticatedSockets()).toHaveLength(0);
    });
  });

  describe('requireAuth middleware', () => {
    it('should call handler for authenticated socket', () => {
      mockSocket.isAuthenticated = true;
      mockSocket.user = { id: 'user-123', email: 'test@example.com' };

      const mockHandler = jest.fn();
      const middleware = authManager.requireAuth(mockHandler);

      middleware(mockSocket, 'arg1', 'arg2');

      expect(mockHandler).toHaveBeenCalledWith(mockSocket, 'arg1', 'arg2');
    });

    it('should emit auth_required for unauthenticated socket', () => {
      mockSocket.isAuthenticated = false;

      const mockHandler = jest.fn();
      const middleware = authManager.requireAuth(mockHandler);

      middleware(mockSocket, 'arg1', 'arg2');

      expect(mockHandler).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('auth_required', {
        message: 'Authentication required for this action'
      });
    });
  });

  describe('broadcastToAuthenticated', () => {
    it('should broadcast to all authenticated sockets', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      authManager.broadcastToAuthenticated('test_event', { message: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { message: 'test' });
    });
  });

  describe('broadcastToUsers', () => {
    it('should broadcast to specific users', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      authManager.broadcastToUsers(['user-123'], 'test_event', { message: 'test' });

      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { message: 'test' });
    });

    it('should not broadcast to non-existing users', () => {
      authManager.broadcastToUsers(['non-existing'], 'test_event', { message: 'test' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('getOnlineUsersCount', () => {
    it('should return correct count of online users', async () => {
      expect(authManager.getOnlineUsersCount()).toBe(0);

      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      expect(authManager.getOnlineUsersCount()).toBe(1);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return list of online users', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: 'user-123', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      await authManager.authenticateSocket(mockSocket, validToken);

      const onlineUsers = authManager.getOnlineUsers();

      expect(onlineUsers).toHaveLength(1);
      expect(onlineUsers[0]).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        socketId: 'socket-123'
      });
    });

    it('should return empty array when no users online', () => {
      const onlineUsers = authManager.getOnlineUsers();
      expect(onlineUsers).toHaveLength(0);
    });
  });

  describe('Security Features', () => {
    it('should reset rate limit counts after window expires', async () => {
      const invalidToken = 'invalid-token';
      mockAuthUtils.verifyToken.mockReturnValue({});

      // Mock Date.now to simulate time passage
      const originalDateNow = Date.now;
      let currentTime = originalDateNow();
      Date.now = jest.fn(() => currentTime);

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authManager.authenticateSocket(mockSocket, invalidToken);
      }

      // Advance time beyond window (15 minutes + 1ms)
      currentTime += 15 * 60 * 1000 + 1;

      // Next attempt should be allowed
      const result = await authManager.authenticateSocket(mockSocket, invalidToken);
      expect(result.error).not.toContain('rate limited');

      // Restore original Date.now
      Date.now = originalDateNow;
    });

    it('should validate token type', async () => {
      const result = await authManager.authenticateSocket(mockSocket, 123 as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token is required and must be a string');
    });

    it('should handle null/undefined user ID', async () => {
      const validToken = 'valid-jwt-token';
      const mockUser = { userId: '', email: 'test@example.com' };
      mockAuthUtils.verifyToken.mockReturnValue(mockUser);

      const result = await authManager.authenticateSocket(mockSocket, validToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid user data');
    });
  });
});

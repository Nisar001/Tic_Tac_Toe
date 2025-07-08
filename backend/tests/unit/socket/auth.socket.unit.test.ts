// Unit tests for auth.socket.ts
import { SocketAuthManager, AuthenticatedSocket } from '../../../src/socket/auth.socket';
import { AuthUtils } from '../../../src/utils/auth.utils';

jest.mock('../../../src/utils/auth.utils');

const mockVerifyToken = jest.fn();
AuthUtils.verifyToken = mockVerifyToken;

describe('Auth Socket', () => {
  it('should handle authentication events', () => {
    // Add test logic here
  });
});

describe('SocketAuthManager', () => {
  let socketAuthManager: SocketAuthManager;
  let mockSocket: AuthenticatedSocket;

  beforeEach(() => {
    socketAuthManager = new SocketAuthManager();
    mockSocket = {
      id: 'socket123',
      emit: jest.fn(),
    } as unknown as AuthenticatedSocket;

    jest.clearAllMocks();
  });

  it('should authenticate socket successfully', async () => {
    const token = 'validToken';
    const decodedToken = { userId: 'user123', email: 'test@example.com' };

    mockVerifyToken.mockReturnValue(decodedToken);

    const result = await socketAuthManager.authenticateSocket(mockSocket, token);

    expect(result).toBe(true);
    expect(mockSocket.user).toEqual({ id: decodedToken.userId, email: decodedToken.email });
    expect(mockSocket.isAuthenticated).toBe(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('auth_success', expect.objectContaining({
      user: { id: decodedToken.userId, email: decodedToken.email },
    }));
  });

  it('should fail authentication if token is invalid', async () => {
    const token = 'invalidToken';

    mockVerifyToken.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const result = await socketAuthManager.authenticateSocket(mockSocket, token);

    expect(result).toBe(false);
    expect(mockSocket.emit).toHaveBeenCalledWith('auth_error', { message: 'Invalid token' });
  });

  it('should check if socket is authenticated', () => {
    mockSocket.isAuthenticated = true;
    mockSocket.user = { id: 'user123', email: 'test@example.com' };

    const result = socketAuthManager.isSocketAuthenticated(mockSocket);

    expect(result).toBe(true);
  });

  it('should get socket by user ID', () => {
    mockSocket.user = { id: 'user123', email: 'test@example.com' };
    socketAuthManager['authenticatedSockets'].set(mockSocket.id, mockSocket);

    const result = socketAuthManager.getSocketByUserId('user123');

    expect(result).toBe(mockSocket);
  });

  it('should remove socket from authenticated list', () => {
    socketAuthManager['authenticatedSockets'].set(mockSocket.id, mockSocket);

    socketAuthManager.removeSocket(mockSocket.id);

    expect(socketAuthManager['authenticatedSockets'].has(mockSocket.id)).toBe(false);
  });

  it('should broadcast to authenticated sockets', () => {
    const event = 'testEvent';
    const data = { message: 'testMessage' };

    socketAuthManager['authenticatedSockets'].set(mockSocket.id, mockSocket);

    socketAuthManager.broadcastToAuthenticated(event, data);

    expect(mockSocket.emit).toHaveBeenCalledWith(event, data);
  });

  it('should get online users count', () => {
    socketAuthManager['authenticatedSockets'].set(mockSocket.id, mockSocket);

    const result = socketAuthManager.getOnlineUsersCount();

    expect(result).toBe(1);
  });

  it('should get online users list', () => {
    mockSocket.user = { id: 'user123', email: 'test@example.com' };
    socketAuthManager['authenticatedSockets'].set(mockSocket.id, mockSocket);

    const result = socketAuthManager.getOnlineUsers();

    expect(result).toEqual([
      { id: 'user123', email: 'test@example.com', socketId: mockSocket.id },
    ]);
  });
});

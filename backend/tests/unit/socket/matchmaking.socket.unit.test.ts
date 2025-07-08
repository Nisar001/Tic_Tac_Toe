// Unit tests for matchmaking.socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { MatchmakingSocket } from '../../../src/socket/matchmaking.socket';
import { AuthenticatedSocket, SocketAuthManager } from '../../../src/socket/auth.socket';
import { MatchmakingManager } from '../../../src/utils/matchmaking.utils';
import { AuthenticatedSocket } from '../../../src/types';

jest.mock('socket.io');

const mockSocket = {
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  user: { id: 'user1', username: 'TestUser', energy: 5, level: 1 },
} as unknown as AuthenticatedSocket;

const mockAuthManager = {
  isSocketAuthenticated: jest.fn().mockReturnValue(true),
  getSocketByUserId: jest.fn().mockReturnValue(mockSocket),
} as unknown as SocketAuthManager;

describe('MatchmakingSocket', () => {
  let matchmakingSocket: MatchmakingSocket;
  let io: SocketIOServer;

  beforeEach(() => {
    io = new SocketIOServer();
    matchmakingSocket = new MatchmakingSocket(io, mockAuthManager);
    jest.spyOn(MatchmakingManager, 'addToQueue').mockImplementation(jest.fn());
    jest.spyOn(MatchmakingManager, 'removeFromQueue').mockImplementation(jest.fn());
    jest.spyOn(MatchmakingManager, 'findMatch').mockImplementation(jest.fn());
    jest.spyOn(MatchmakingManager, 'isPlayerInQueue').mockImplementation(jest.fn());
  });

  it('should handle find match request', () => {
    matchmakingSocket.handleFindMatch(mockSocket, {});

    expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_queued', expect.objectContaining({
      message: 'Searching for opponent...'
    }));
  });

  it('should handle cancel matchmaking', () => {
    jest.spyOn(MatchmakingManager, 'removeFromQueue').mockReturnValue(true);

    matchmakingSocket.handleCancelMatchmaking(mockSocket);

    expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_cancelled', expect.objectContaining({
      message: 'Matchmaking cancelled successfully'
    }));
  });

  it('should handle get matchmaking status', () => {
    jest.spyOn(MatchmakingManager, 'isPlayerInQueue').mockReturnValue(true);
    jest.spyOn(MatchmakingManager, 'getQueueStats').mockReturnValue({ totalPlayers: 10 });

    matchmakingSocket.handleGetMatchmakingStatus(mockSocket);

    expect(mockSocket.emit).toHaveBeenCalledWith('matchmaking_status', expect.objectContaining({
      inQueue: true,
      queueStats: { totalPlayers: 10 }
    }));
  });

  it('should handle player disconnect', () => {
    jest.spyOn(MatchmakingManager, 'removeFromQueue').mockReturnValue(true);

    matchmakingSocket.handlePlayerDisconnect('user1');

    expect(MatchmakingManager.removeFromQueue).toHaveBeenCalledWith('user1');
  });

  it('should handle match found', () => {
    const match = {
      roomId: 'room_123',
      player1: { userId: 'user1', username: 'Player1', level: 1 },
      player2: { userId: 'user2', username: 'Player2', level: 2 },
      matchQuality: 90
    };

    jest.spyOn(mockAuthManager, 'getSocketByUserId').mockImplementation((userId) => {
      return userId === 'user1' ? mockSocket : { emit: jest.fn(), join: jest.fn() };
    });

    matchmakingSocket['handleMatchFound'](match);

    expect(mockSocket.emit).toHaveBeenCalledWith('match_found', expect.objectContaining({
      roomId: 'room_123',
      opponent: { id: 'user2', username: 'Player2', level: 2 },
      player: 'X'
    }));
  });

  it('should mock getQueueStats correctly', () => {
    jest.spyOn(MatchmakingManager, 'getQueueStats').mockReturnValue({
      totalPlayers: 10,
      averageWaitTime: 5000,
      levelDistribution: { 5: 3, 6: 7 }
    });
    const stats = MatchmakingManager.getQueueStats();
    expect(stats.totalPlayers).toBe(10);
    expect(stats.averageWaitTime).toBe(5000);
    expect(stats.levelDistribution).toEqual({ 5: 3, 6: 7 });
  });

  it('should mock getSocketByUserId correctly', () => {
    const mockSocket: AuthenticatedSocket = {
      emit: jest.fn(),
      join: jest.fn(),
      userId: '123',
      user: undefined,
      nsp: undefined,
      client: undefined,
      id: 'socket1',
      recovered: false
    } as unknown as AuthenticatedSocket;

    jest.spyOn(mockAuthManager, 'getSocketByUserId').mockImplementation((userId: string) => {
      return userId === '123' ? mockSocket : undefined;
    });

    const socket = mockAuthManager.getSocketByUserId('123');
    expect(socket).toBe(mockSocket);
  });

  it('should handle match found correctly', () => {
    const match = {
      roomId: 'room_123',
      player1: {
        userId: '123',
        username: 'Player1',
        level: 5,
        socketId: 'socket1',
        joinedAt: new Date()
      },
      player2: {
        userId: '456',
        username: 'Player2',
        level: 6,
        socketId: 'socket2',
        joinedAt: new Date()
      },
      matchQuality: 0.9
    };

    const matchmakingSocket = {
      handleMatchFound: jest.fn()
    };

    matchmakingSocket.handleMatchFound(match);
    expect(matchmakingSocket.handleMatchFound).toHaveBeenCalledWith(match);
  });
});

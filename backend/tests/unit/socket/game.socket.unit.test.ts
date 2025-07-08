// Unit tests for game.socket.ts
import { Server as SocketIOServer } from 'socket.io';
import { GameSocket, GameRoom } from '../../../src/socket/game.socket';
import { AuthenticatedSocket, SocketAuthManager } from '../../../src/socket/auth.socket';
import { GameLogic } from '../../../src/utils/game.utils';

jest.mock('socket.io');

const mockSocket = {
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  user: { id: 'user1', username: 'TestUser' },
} as unknown as AuthenticatedSocket;

const mockAuthManager = {
  isSocketAuthenticated: jest.fn().mockReturnValue(true),
} as unknown as SocketAuthManager;

describe('GameSocket', () => {
  let gameSocket: GameSocket;
  let io: SocketIOServer;

  beforeEach(() => {
    io = new SocketIOServer();
    gameSocket = new GameSocket(io, mockAuthManager);
  });

  it('should handle joining a game room', () => {
    const roomId = 'game_123';
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: { userId: 'user1', username: 'PlayerX', socketId: 'socket1' },
        O: { userId: 'user2', username: 'PlayerO', socketId: 'socket2' },
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'active',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: [],
    };

    gameSocket['activeGames'].set(roomId, gameRoom);

    gameSocket.handleJoinRoom(mockSocket, { roomId });

    expect(mockSocket.emit).toHaveBeenCalledWith('room_joined', expect.objectContaining({
      roomId,
      playerSymbol: 'X',
    }));
  });

  it('should handle leaving a game room', () => {
    const roomId = 'game_123';
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: { userId: 'user1', username: 'PlayerX', socketId: 'socket1' },
        O: { userId: 'user2', username: 'PlayerO', socketId: 'socket2' },
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'active',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: ['socket3'],
    };

    gameSocket['activeGames'].set(roomId, gameRoom);

    gameSocket.handleLeaveRoom(mockSocket, { roomId });

    expect(mockSocket.to(roomId).emit).toHaveBeenCalledWith('player_left', expect.objectContaining({
      playerId: mockSocket.user.id,
    }));
  });

  it('should handle player moves', () => {
    const roomId = 'game_123';
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: { userId: 'user1', username: 'PlayerX', socketId: 'socket1' },
        O: { userId: 'user2', username: 'PlayerO', socketId: 'socket2' },
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'active',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: [],
    };

    gameSocket['activeGames'].set(roomId, gameRoom);

    gameSocket.handlePlayerMove(mockSocket, { roomId, position: 0 });

    expect(mockSocket.emit).not.toHaveBeenCalledWith('game_error', expect.anything());
    expect(io.to(roomId).emit).toHaveBeenCalledWith('move_made', expect.objectContaining({
      position: 0,
      player: 'X',
    }));
  });

  it('should handle game surrender', () => {
    const roomId = 'game_123';
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: { userId: 'user1', username: 'PlayerX', socketId: 'socket1' },
        O: { userId: 'user2', username: 'PlayerO', socketId: 'socket2' },
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'active',
      winner: null,
      createdAt: new Date(),
      moveCount: 0,
      spectators: [],
    };

    gameSocket['activeGames'].set(roomId, gameRoom);

    gameSocket.handleSurrender(mockSocket, { roomId });

    expect(io.to(roomId).emit).toHaveBeenCalledWith('game_surrendered', expect.objectContaining({
      surrenderingPlayer: 'X',
      winner: 'O',
    }));
  });

  it('should handle rematch requests', () => {
    const roomId = 'game_123';
    const gameRoom: GameRoom = {
      id: roomId,
      players: {
        X: { userId: 'user1', username: 'PlayerX', socketId: 'socket1' },
        O: { userId: 'user2', username: 'PlayerO', socketId: 'socket2' },
      },
      board: GameLogic.createEmptyBoard(),
      currentPlayer: 'X',
      status: 'finished',
      winner: 'X',
      createdAt: new Date(),
      moveCount: 9,
      spectators: [],
    };

    gameSocket['activeGames'].set(roomId, gameRoom);

    gameSocket.handleRematchRequest(mockSocket, { roomId });

    expect(mockSocket.emit).toHaveBeenCalledWith('rematch_request_sent', expect.objectContaining({
      message: 'Rematch request sent to opponent',
    }));
  });
});

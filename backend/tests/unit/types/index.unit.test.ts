// Unit tests for types/index.ts
import * as Types from '../../../src/types';
import mongoose from 'mongoose';
import { IUser, IGame, IChatMessage, IFriendRequest, IGameRoom, IMatchmakingQueue, JWTPayload, AuthenticatedSocket, GameMoveData, ChatMessageData, EmailVerificationData, PasswordResetData, TwilioSMSData, EnergySystemConfig, LevelingConfig } from '../../../src/types';

describe('Types Module', () => {
  it('should define all required types', () => {
    // Add test logic here
  });
});

describe('Type Definitions', () => {
  it('should define IUser correctly', () => {
    const user: IUser = {
      email: 'test@example.com',
      username: 'TestUser',
      level: 1,
      xp: 100,
      energy: 5,
      maxEnergy: 10,
      energyUpdatedAt: new Date(),
      isOnline: true,
      lastSeen: new Date(),
      friends: [],
      friendRequests: { sent: [], received: [] },
      stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 },
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: 'manual',
      _id: new mongoose.Types.ObjectId(),
    } as unknown as IUser;

    expect(user.email).toBe('test@example.com');
    expect(user.username).toBe('TestUser');
  });

  it('should define IGame correctly', () => {
    const game: IGame = {
      gameId: 'game123',
      players: { player1: new mongoose.Types.ObjectId(), player2: new mongoose.Types.ObjectId() },
      board: [[null, null, null], [null, null, null], [null, null, null]],
      currentPlayer: 'X',
      status: 'active',
      result: null,
      moves: [],
      startedAt: new Date(),
      room: 'room123',
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new mongoose.Types.ObjectId(),
    } as unknown as IGame;

    expect(game.gameId).toBe('game123');
    expect(game.status).toBe('active');
  });

  it('should define IChatMessage correctly', () => {
    const chatMessage: IChatMessage = {
      gameId: new mongoose.Types.ObjectId(),
      sender: new mongoose.Types.ObjectId(),
      message: 'Hello World',
      timestamp: new Date(),
      messageType: 'text',
      _id: new mongoose.Types.ObjectId(),
    } as unknown as IChatMessage;

    expect(chatMessage.message).toBe('Hello World');
    expect(chatMessage.messageType).toBe('text');
  });

  it('should define IFriendRequest correctly', () => {
    const friendRequest: IFriendRequest = {
      sender: new mongoose.Types.ObjectId(),
      receiver: new mongoose.Types.ObjectId(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: new mongoose.Types.ObjectId(),
    } as unknown as IFriendRequest;

    expect(friendRequest.status).toBe('pending');
  });

  it('should define JWTPayload correctly', () => {
    const jwtPayload: JWTPayload = {
      userId: 'user123',
      email: 'test@example.com',
    };

    expect(jwtPayload.userId).toBe('user123');
    expect(jwtPayload.email).toBe('test@example.com');
  });

  it('should define AuthenticatedSocket correctly', () => {
    const socket: AuthenticatedSocket = {
      userId: 'user123',
      user: { email: 'test@example.com', username: 'TestUser' } as IUser,
    } as AuthenticatedSocket;

    expect(socket.userId).toBe('user123');
    expect(socket.user?.email).toBe('test@example.com');
  });
});

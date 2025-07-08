import { Document } from 'mongoose';
import { Socket } from 'socket.io';
import mongoose from 'mongoose';

export interface IUser extends Document {
  email: string;
  password?: string;
  username: string;
  avatar?: string;
  provider: 'manual' | 'google' | 'facebook' | 'instagram' | 'twitter';
  providerId?: string;
  level: number;
  xp: number;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: Date;
  isOnline: boolean;
  lastSeen: Date;
  friends: mongoose.Types.ObjectId[];
  friendRequests: {
    sent: mongoose.Types.ObjectId[];
    received: mongoose.Types.ObjectId[];
  };
  stats: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    winRate: number;
  };
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGame extends Document {
  gameId: string;
  players: {
    player1: mongoose.Types.ObjectId;
    player2: mongoose.Types.ObjectId;
  };
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner?: mongoose.Types.ObjectId;
  result: 'win' | 'draw' | 'abandoned' | null;
  moves: {
    player: mongoose.Types.ObjectId;
    position: { row: number; col: number };
    symbol: 'X' | 'O';
    timestamp: Date;
  }[];
  startedAt: Date;
  endedAt?: Date;
  room: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage extends Document {
  gameId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
  messageType: 'text' | 'emoji' | 'system';
}

export interface IFriendRequest extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

export interface IGameRoom {
  roomId: string;
  players: string[];
  gameState: {
    board: (string | null)[][];
    currentPlayer: 'X' | 'O';
    status: 'waiting' | 'active' | 'completed';
    winner?: string;
  };
  createdAt: Date;
}

export interface IMatchmakingQueue {
  userId: string;
  socketId: string;
  level: number;
  joinedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: IUser;
}

export interface GameMoveData {
  gameId: string;
  position: { row: number; col: number };
  symbol: 'X' | 'O';
}

export interface ChatMessageData {
  gameId: string;
  message: string;
  messageType?: 'text' | 'emoji';
}

export interface EmailVerificationData {
  email: string;
  token: string;
  username: string;
}

export interface PasswordResetData {
  email: string;
  token: string;
  username: string;
}

export interface TwilioSMSData {
  to: string;
  body: string;
}

export interface EnergySystemConfig {
  maxEnergy: number;
  energyRegenTime: number; // in minutes
  energyPerGame: number;
}

export interface LevelingConfig {
  baseXP: number;
  xpPerWin: number;
  xpPerDraw: number;
  xpPerLoss: number;
  levelMultiplier: number;
}

declare global {
  namespace Express {
    interface User extends IUser {}
    interface Request {
      user?: IUser;
    }
  }
}
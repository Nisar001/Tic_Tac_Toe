// Test utilities and helpers
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EnergyStatus } from '../../src/utils/energy.utils';

export interface MockUser {
  _id: string;
  email: string;
  username: string;
  password?: string;
  isEmailVerified: boolean;
  stats: {
    wins: number;
    losses: number;
    draws: number;
    gamesPlayed: number;
    winRate: number;
  };
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: Date;
  refreshTokens?: Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
}

export interface MockGame {
  _id: string;
  gameId: string;
  players: {
    player1: string;
    player2: string;
  };
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner?: string;
  result: 'win' | 'draw' | 'abandoned' | null;
  moves: Array<{
    player: string;
    position: { row: number; col: number };
    symbol: 'X' | 'O';
    timestamp: Date;
  }>;
  room: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mock Express Request/Response helpers
export const createMockRequest = (options: any = {}): Partial<Request> => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: undefined,
  ip: '127.0.0.1',
  ...options
});

export const createMockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();

/**
 * Creates a proper mock EnergyStatus object with all required properties
 */
export const createMockEnergyStatus = (overrides: Partial<EnergyStatus> = {}): EnergyStatus => {
  return {
    currentEnergy: 5,
    maxEnergy: 5,
    nextRegenTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    timeUntilNextRegen: 60 * 60 * 1000, // 1 hour in milliseconds
    canPlay: true,
    ...overrides
  };
};

/**
 * Creates a proper mock user object with all required properties for tests
 */
export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  _id: new mongoose.Types.ObjectId().toString(),
  email: 'test@example.com',
  username: 'testuser',
  password: 'hashedpassword',
  isEmailVerified: true,
  stats: {
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    winRate: 0
  },
  energy: 5,
  maxEnergy: 5,
  energyUpdatedAt: new Date(),
  refreshTokens: [],
  ...overrides
});

// Mock game factory
export const createMockGame = (overrides: Partial<MockGame> = {}): MockGame => {
  const gameId = new mongoose.Types.ObjectId().toString();
  return {
    _id: gameId,
    gameId: `game_${Date.now()}`,
    players: {
      player1: new mongoose.Types.ObjectId().toString(),
      player2: new mongoose.Types.ObjectId().toString()
    },
    board: Array(3).fill(null).map(() => Array(3).fill(null)),
    currentPlayer: 'X',
    status: 'waiting',
    winner: undefined,
    result: null,
    moves: [],
    room: `room_${gameId}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
};

// JWT token generators for testing
export const generateTestTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign(
    { userId, email, type: 'access' },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Database test helpers
let mongoServer: MongoMemoryServer;

export const setupTestDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
};

export const teardownTestDatabase = async () => {
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
};

export const clearTestDatabase = async () => {
  if (mongoose.connection.db) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

// Mock socket.io
export const createMockSocket = () => ({
  id: 'mock-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  broadcast: {
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({
      emit: jest.fn()
    })
  },
  to: jest.fn().mockReturnValue({
    emit: jest.fn()
  }),
  disconnect: jest.fn()
});

// Error assertion helpers
export const expectError = (error: any, status: number, message?: string) => {
  expect(error.status || error.statusCode).toBe(status);
  if (message) {
    expect(error.message).toContain(message);
  }
};

// Validation helpers
export const expectValidationError = (error: any, field?: string) => {
  expect(error.status || error.statusCode).toBe(400);
  if (field) {
    expect(error.message).toContain(field);
  }
};

// Time helpers
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock implementations for external services
export const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
};

export const mockSMSService = {
  sendVerificationSMS: jest.fn().mockResolvedValue(true),
  sendPasswordResetSMS: jest.fn().mockResolvedValue(true)
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockEmailService.sendVerificationEmail.mockClear();
  mockEmailService.sendPasswordResetEmail.mockClear();
  mockEmailService.sendWelcomeEmail.mockClear();
  mockSMSService.sendVerificationSMS.mockClear();
  mockSMSService.sendPasswordResetSMS.mockClear();
};

// Test data generators
export const generateTestEmail = () => `test${Date.now()}@example.com`;
export const generateTestUsername = () => `testuser${Date.now()}`;
export const generateTestPassword = () => 'TestPassword123!';

export const TEST_CONSTANTS = {
  VALID_EMAIL: 'test@example.com',
  VALID_PASSWORD: 'TestPassword123!',
  VALID_USERNAME: 'testuser',
  INVALID_EMAIL: 'invalid-email',
  WEAK_PASSWORD: '123',
  SHORT_USERNAME: 'ab'
};

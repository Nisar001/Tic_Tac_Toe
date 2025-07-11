export interface User {
  id: string;
  username: string;
  email: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  energy: number;
  maxEnergy: number;
  energyRegenRate: number;
  lastEnergyUpdate: string;
  stats: UserStats;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDraw: number;
  winRate: number;
  currentStreak: number;
  longestStreak: number;
  totalScore: number;
  averageGameDuration: number;
  rank?: string;
  ranking?: number;
}

export interface UserPreferences {
  soundEnabled: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoJoinQueue: boolean;
}

export interface Game {
  id: string;
  roomId: string;
  status: GameStatus;
  board: CellValue[][];
  currentPlayer: string;
  players: GamePlayer[];
  winner?: string;
  winCondition?: WinCondition;
  moves: GameMove[];
  gameType: GameType;
  difficulty?: Difficulty;
  timeLimit?: number;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface GamePlayer {
  id: string;
  username: string;
  symbol: 'X' | 'O';
  isConnected: boolean;
  energy: number;
  joinedAt: string;
  lastMove?: string;
}

export interface GameMove {
  id: string;
  playerId: string;
  position: Position;
  symbol: 'X' | 'O';
  timestamp: string;
  moveNumber: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface WinCondition {
  type: 'row' | 'column' | 'diagonal';
  positions: Position[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'game';
  metadata?: Record<string, any>;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'game' | 'global' | 'private';
  participants: ChatParticipant[];
  lastMessage?: ChatMessage;
  createdAt: string;
  isActive: boolean;
}

export interface ChatParticipant {
  id: string;
  username: string;
  isOnline: boolean;
  joinedAt: string;
  role: 'member' | 'moderator' | 'admin';
}

export interface MatchmakingQueue {
  id: string;
  userId: string;
  username: string;
  skill: number;
  preferences: MatchmakingPreferences;
  joinedAt: string;
  estimatedWaitTime: number;
}

export interface MatchmakingPreferences {
  gameType: GameType;
  difficulty?: Difficulty;
  timeLimit?: number;
  skillRange: {
    min: number;
    max: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  stats: UserStats;
  profilePicture?: string;
  badge?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordCredentials {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  username?: string;
  email?: string;
  profilePicture?: string;
  preferences?: Partial<UserPreferences>;
}

export interface SocketError {
  message: string;
  code?: string;
  details?: any;
}

export interface GameCreateRequest {
  gameType: GameType;
  isPrivate?: boolean;
  timeLimit?: number;
  difficulty?: Difficulty;
  inviteCode?: string;
}

export interface GameMoveRequest {
  roomId: string;
  position: Position;
}

export interface SendMessageRequest {
  roomId: string;
  message: string;
  type?: 'text' | 'system';
}

// Type Unions
export type GameStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameType = 'classic' | 'timed' | 'ranked' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type CellValue = '' | 'X' | 'O';

// Context Types
export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (credentials: ChangePasswordCredentials) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<void>;
}

export interface GameContextType {
  currentGame: Game | null;
  games: Game[];
  isLoading: boolean;
  createGame: (request: GameCreateRequest) => Promise<Game>;
  joinGame: (roomId: string) => Promise<void>;
  makeMove: (request: GameMoveRequest) => Promise<void>;
  forfeitGame: (roomId: string) => Promise<void>;
  getGameState: (roomId: string) => Promise<Game>;
  getActiveGames: () => Promise<Game[]>;
  getUserStats: () => Promise<UserStats>;
  getLeaderboard: (page?: number, limit?: number) => Promise<LeaderboardEntry[]>;
}

export interface SocketContextType {
  socket: any | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback: (...args: any[]) => void) => void;
}

export interface ChatContextType {
  messages: ChatMessage[];
  rooms: ChatRoom[];
  currentRoom: ChatRoom | null;
  isLoading: boolean;
  sendMessage: (request: SendMessageRequest) => Promise<void>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: (roomId: string) => Promise<void>;
  getChatHistory: (roomId: string, page?: number) => Promise<ChatMessage[]>;
  getRooms: () => Promise<ChatRoom[]>;
  getRoomUsers: (roomId: string) => Promise<ChatParticipant[]>;
}

export interface MatchmakingContextType {
  isInQueue: boolean;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  isLoading: boolean;
  joinQueue: (preferences: MatchmakingPreferences) => Promise<void>;
  leaveQueue: () => Promise<void>;
  getQueueStatus: () => Promise<any>;
  getQueueStats: () => Promise<any>;
}

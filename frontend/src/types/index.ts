// Basic type definitions
export type GameStatus = 'waiting' | 'active' | 'completed' | 'abandoned';
export type GameType = 'classic' | 'blitz' | 'ranked' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type CellValue = '' | 'X' | 'O' | null;
export type WinCondition = 'row' | 'column' | 'diagonal' | 'none';

export interface User {
  id?: string;
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  isEmailVerified: boolean;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt?: string;
  lastEnergyUpdate?: string;
  lastEnergyRegenTime?: string;
  level: number;
  xp?: number;
  totalXP: number;
  stats: UserStats;
  preferences?: UserPreferences;
  provider: 'manual' | 'google' | 'facebook' | 'instagram' | 'twitter';
  isOnline?: boolean;
  lastSeen?: string;
  bio?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  isDeleted?: boolean;
  isBlocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak?: number;
  longestStreak?: number;
  totalScore?: number;
  averageGameDuration?: number;
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
  id?: string;
  _id: string;
  gameId?: string;
  room: string;
  roomId?: string; // Alias for room
  status: GameStatus;
  board: CellValue[][];
  currentPlayer: 'X' | 'O';
  players: {
    player1: string | GamePlayer;
    player2?: string | GamePlayer | null;
  };
  winner?: string;
  winCondition?: WinCondition;
  result?: 'win' | 'draw' | 'abandoned' | null;
  moves: GameMove[];
  gameMode: 'classic' | 'blitz' | 'ranked' | 'custom';
  gameType?: GameType; // Alias for gameMode
  isPrivate?: boolean;
  maxPlayers?: number;
  timeLimit?: number;
  gameName?: string;
  password?: string;
  creatorId?: string;
  startedAt?: string;
  endedAt?: string;
  xpAwarded?: boolean;
  canJoin?: boolean;
  moveCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayer {
  id: string;
  _id?: string;
  username: string;
  avatar?: string;
  symbol?: 'X' | 'O';
  isConnected?: boolean;
  energy?: number;
  joinedAt?: string;
  lastMove?: string;
}

export interface GameMove {
  id?: string;
  player: string;
  position: Position;
  symbol: 'X' | 'O';
  timestamp: string;
  moveNumber?: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface WinConditionInfo {
  type: 'row' | 'column' | 'diagonal';
  positions: Position[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  senderId?: string;
  username: string;
  senderUsername?: string;
  message: string;
  timestamp: string;
  type: 'text' | 'system' | 'game';
  metadata?: Record<string, any>;
  edited?: boolean;
  editedAt?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'game' | 'global' | 'private' | 'direct';
  participants: ChatParticipant[];
  participantCount?: number;
  maxParticipants?: number | null;
  lastMessage?: ChatMessage;
  lastActivity?: string | null;
  description?: string;
  isPrivate?: boolean;
  hasUnreadMessages?: boolean;
  createdAt: string;
  createdBy?: string | null;
  isActive: boolean;
}

export interface ChatParticipant {
  id: string;
  username: string;
  avatar?: string;
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
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
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
  message: string;
  type?: 'text' | 'system';
  roomId?: string;
  gameId?: string;
}

// API Response type
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: any;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: {
      _id: string;
      userId: string;
      email: string;
      username: string;
      isEmailVerified: boolean;
      level: number;
      energy: number;
    };
    verificationRequired: boolean;
    verificationSent: boolean;
  };
}

export interface VerifyEmailRequest {
  email: string;
  verificationCode: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  profilePicture?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
}

// Game API Types
export interface CreateGameRequest {
  gameConfig: {
    gameMode?: 'classic' | 'blitz' | 'ranked' | 'custom';
    isPrivate?: boolean;
    maxPlayers?: number;
    timeLimit?: number;
    gameName?: string;
    password?: string;
  };
}

export interface MakeMoveRequest {
  row: number;
  col: number;
}

export interface JoinGameRequest {
  roomId: string;
  password?: string;
}

// Matchmaking Types
export interface MatchmakingRequest {
  gameMode: 'classic' | 'blitz' | 'ranked' | 'custom';
  gameType?: GameType;
  difficulty?: Difficulty;
  preferredOpponent?: string;
}

export interface MatchmakingStatus {
  inQueue: boolean;
  queueTime?: number;
  estimatedWaitTime?: number;
  position?: number;
  gameType?: GameType;
}

export interface QueueStats {
  totalInQueue: number;
  averageWaitTime: number;
  activeMatches: number;
  byGameType: {
    [key in GameType]: number;
  };
}

// Friend Types
export interface Friend {
  id: string;
  user: User;
  friendSince: string;
  status: 'online' | 'offline' | 'in_game';
  lastSeen?: string;
  isBlocked?: boolean;
}

// Friend Request Types
export interface FriendRequest {
  id: string;
  sender: User;
  recipient: User;
  status: 'pending' | 'accepted' | 'rejected';
  sentAt: string;
  respondedAt?: string;
}

export interface SendFriendRequestRequest {
  username: string;
}

// Leaderboard Types
export interface LeaderboardEntry {
  rank: number;
  user: User;
  score: number;
  gamesPlayed: number;
  winRate: number;
  currentStreak: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalPages: number;
  currentPage: number;
  totalUsers: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'game_invite' | 'friend_request' | 'game_result' | 'system' | 'achievement';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalGames: number;
  activeGames: number;
  serverUptime: number;
  systemHealth: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface AdminUser extends User {
  lastLogin: string;
  ipAddress: string;
  isBlocked: boolean;
  blockReason?: string;
}

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
  refreshUser: () => Promise<void>;
  updateProfile: (data: UpdateProfileData) => Promise<void>;
  changePassword: (credentials: ChangePasswordCredentials) => Promise<void>;
  verifyEmail: (email: string, verificationCode: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (credentials: ResetPasswordCredentials) => Promise<void>;
}

export interface GameContextType {
  currentGame: Game | null;
  games: Game[];
  isLoading: boolean;
  createGame: (request: CreateGameRequest) => Promise<Game>;
  joinGame: (roomId: string) => Promise<any>;
  makeMove: (request: GameMoveRequest) => Promise<Game>;
  forfeitGame: (roomId: string) => Promise<Game | undefined>;
  getGameState: (roomId: string) => Promise<Game>;
  getActiveGames: () => Promise<any>;
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

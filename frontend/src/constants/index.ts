// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// App Configuration
export const APP_NAME = process.env.REACT_APP_APP_NAME || 'Tic Tac Toe';
export const APP_VERSION = process.env.REACT_APP_APP_VERSION || '1.0.0';

// Social Auth Configuration
export const SOCIAL_AUTH = {
  GOOGLE_REDIRECT_URL: process.env.REACT_APP_GOOGLE_REDIRECT_URL || `https://tictactoenisar.netlify.app/auth/callback`,
  FACEBOOK_REDIRECT_URL: process.env.REACT_APP_FACEBOOK_REDIRECT_URL || `https://tictactoenisar.netlify.app/auth/callback`,
  PROVIDERS: {
    GOOGLE: 'google',
    FACEBOOK: 'facebook',
  }
};

// Socket Events - Updated to match API documentation
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Game Events - Emit
  JOIN_GAME: 'joinGame',
  MAKE_MOVE: 'makeMove',
  
  // Game Events - Listen
  GAME_UPDATE: 'gameUpdate',
  MOVE_RESULT: 'moveResult',
  GAME_OVER: 'gameOver',
  PLAYER_JOINED: 'playerJoined',
  PLAYER_LEFT: 'playerLeft',
  
  // Chat Events - Emit
  JOIN_CHAT_ROOM: 'joinChatRoom',
  SEND_MESSAGE: 'sendMessage',
  
  // Chat Events - Listen
  NEW_MESSAGE: 'newMessage',
  USER_JOINED_ROOM: 'userJoinedRoom',
  USER_LEFT_ROOM: 'userLeftRoom',
  
  // Matchmaking Events - Emit
  FIND_MATCH: 'findMatch',
  
  // Matchmaking Events - Listen
  MATCH_FOUND: 'matchFound',
  MATCHMAKING_UPDATE: 'matchmakingUpdate',
  
  // Friend Events - Listen
  FRIEND_REQUEST: 'friendRequest',
  FRIEND_ONLINE: 'friendOnline',
  FRIEND_OFFLINE: 'friendOffline',
  GAME_INVITE: 'gameInvite',
  
  // Notification Events - Listen
  NOTIFICATION: 'notification',
  
  // Error Events
  ERROR: 'error',
  GAME_ERROR: 'gameError',
  CHAT_ERROR: 'chatError',
};

// Game Constants
export const GAME_STATUS = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const;

export const CELL_VALUES = {
  EMPTY: '',
  X: 'X',
  O: 'O',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  GAME_PREFERENCES: 'gamePreferences',
  SOUND_ENABLED: 'soundEnabled',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  LOGOUT_ALL: '/auth/logout-all',
  REFRESH_TOKEN: '/auth/refresh-token',
  PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  FORGOT_PASSWORD: '/auth/request-password-reset',
  RESET_PASSWORD: '/auth/reset-password',
  VERIFY_EMAIL: '/auth/verify-email',
  RESEND_VERIFICATION: '/auth/resend-verification',
  DELETE_ACCOUNT: '/auth/account',
  
  // Social Auth
  GOOGLE_AUTH: '/auth/social/google',
  GITHUB_AUTH: '/auth/social/github',
  
  // Game
  CREATE_GAME: '/game/create',
  GET_GAME_STATE: '/game/state',
  GET_ACTIVE_GAMES: '/game/active',
  FORFEIT_GAME: '/game/forfeit',
  GET_GAME_STATS: '/game/stats',
  GET_LEADERBOARD: '/game/leaderboard',
  
  // Matchmaking
  JOIN_QUEUE: '/game/matchmaking/join',
  LEAVE_QUEUE: '/game/matchmaking/leave',
  QUEUE_STATUS: '/game/matchmaking/status',
  QUEUE_STATS: '/game/matchmaking/stats',
  
  // Chat
  GET_CHAT_HISTORY: '/chat/history',
  SEND_MESSAGE: '/chat/send',
  GET_CHAT_ROOMS: '/chat/rooms',
  JOIN_CHAT_ROOM: '/chat/rooms/:roomId/join',
  LEAVE_CHAT_ROOM: '/chat/rooms/:roomId/leave',
  GET_CHAT_ROOM_USERS: '/chat/rooms/:roomId/users',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GAME_FULL: 'This game is already full.',
  GAME_NOT_FOUND: 'Game not found.',
  INVALID_MOVE: 'Invalid move. Please try again.',
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  REGISTER_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
  EMAIL_VERIFIED: 'Email verified successfully!',
  GAME_CREATED: 'Game created successfully!',
  MOVE_MADE: 'Move made successfully!',
  MESSAGE_SENT: 'Message sent!',
} as const;

// Game Settings
export const GAME_SETTINGS = {
  BOARD_SIZE: 3,
  WIN_CONDITION: 3,
  MAX_PLAYERS: 2,
  MOVE_TIMEOUT: 30000, // 30 seconds
  RECONNECT_TIMEOUT: 5000, // 5 seconds
} as const;

// Theme Configuration
export const THEME = {
  PRIMARY_COLOR: '#3b82f6',
  SECONDARY_COLOR: '#64748b',
  SUCCESS_COLOR: '#22c55e',
  WARNING_COLOR: '#f59e0b',
  ERROR_COLOR: '#ef4444',
} as const;



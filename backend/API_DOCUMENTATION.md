# Tic Tac Toe + Chat Application - Complete API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication System](#authentication-system)
3. [Game System](#game-system)
4. [Chat System](#chat-system)
5. [Friends & Social System](#friends--social-system)
6. [Socket.io Real-time Features](#socketio-real-time-features)
7. [Admin System](#admin-system)
8. [Data Models](#data-models)
9. [Frontend Integration Guide](#frontend-integration-guide)
10. [Error Handling](#error-handling)
11. [Security & Middleware](#security--middleware)

---

## Overview

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Response Format
All API responses follow this structure:
```json
{
  "success": true|false,
  "message": "Description of the result",
  "data": {}, // Response data (when applicable)
  "error": {} // Error details (when applicable)
}
```

---

## Authentication System

### Base Route: `/api/auth`

#### 1. User Registration
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "id": "userId",
      "username": "john_doe",
      "email": "john@example.com",
      "isVerified": false
    },
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### 2. User Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "john_doe", // or email
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "userId",
      "username": "john_doe",
      "email": "john@example.com",
      "avatar": "avatar_url",
      "level": 1,
      "xp": 100,
      "isVerified": true
    },
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### 3. Get User Profile
```http
GET /api/auth/profile
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "userId",
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "avatar_url",
      "level": 1,
      "xp": 100,
      "gamesPlayed": 10,
      "gamesWon": 7,
      "isVerified": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4. Update Profile
```http
PUT /api/auth/profile
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John Updated",
  "lastName": "Doe Updated",
  "avatar": "new_avatar_url"
}
```

#### 5. Change Password
```http
PUT /api/auth/change-password
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

#### 6. Request Password Reset
```http
POST /api/auth/request-password-reset
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### 7. Reset Password
```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newSecurePassword123"
}
```

#### 8. Verify Email
```http
POST /api/auth/verify-email
```

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

#### 9. Resend Verification Email
```http
POST /api/auth/resend-verification
```

**Headers:** `Authorization: Bearer <token>`

#### 10. Refresh Token
```http
POST /api/auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "your_refresh_token"
}
```

#### 11. Logout
```http
POST /api/auth/logout
```

**Headers:** `Authorization: Bearer <token>`

#### 12. Logout All Sessions
```http
POST /api/auth/logout-all
```

**Headers:** `Authorization: Bearer <token>`

#### 13. Delete Account
```http
DELETE /api/auth/delete-account
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "password": "currentPassword123"
}
```

---

## Game System

### Base Route: `/api/game`

#### 1. Create Game Room
```http
POST /api/game/room
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameMode": "classic", // classic, blitz, ranked, custom
  "isPrivate": false,
  "maxPlayers": 2,
  "timeLimit": 300, // seconds (for timed games)
  "gameName": "My Game Room",
  "password": "optional_password"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Game room created successfully",
  "data": {
    "game": {
      "gameId": "game_123456789",
      "gameMode": "classic",
      "isPrivate": false,
      "room": "room_123456789",
      "status": "waiting",
      "players": {
        "player1": "userId",
        "player2": null
      },
      "board": [[null,null,null],[null,null,null],[null,null,null]],
      "currentPlayer": "X",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 2. Join Game Room
```http
POST /api/game/join/:gameId
```

**Headers:** `Authorization: Bearer <token>`

**Request Body (for private games):**
```json
{
  "password": "room_password"
}
```

#### 3. Make Game Move
```http
POST /api/game/move
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameId": "game_123456789",
  "row": 0,
  "col": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Move made successfully",
  "data": {
    "game": {
      "gameId": "game_123456789",
      "board": [["X",null,null],[null,null,null],[null,null,null]],
      "currentPlayer": "O",
      "status": "active",
      "winner": null,
      "result": null
    },
    "move": {
      "player": "userId",
      "position": {"row": 0, "col": 1},
      "symbol": "X",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4. Get Game State
```http
GET /api/game/state/:gameId
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Game state retrieved successfully",
  "data": {
    "game": {
      "gameId": "game_123456789",
      "board": [["X","O",null],[null,"X",null],[null,null,"O"]],
      "currentPlayer": "X",
      "status": "active",
      "winner": null,
      "result": null,
      "moves": [],
      "players": {
        "player1": {
          "id": "userId1",
          "username": "player1",
          "avatar": "avatar_url",
          "symbol": "X"
        },
        "player2": {
          "id": "userId2",
          "username": "player2",
          "avatar": "avatar_url",
          "symbol": "O"
        }
      }
    },
    "userInfo": {
      "symbol": "X",
      "isCurrentPlayer": true,
      "canMove": true
    },
    "gameInfo": {
      "duration": 125, // seconds
      "moveCount": 5,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "startedAt": "2024-01-01T00:01:00.000Z"
    }
  }
}
```

#### 5. Get User Active Games
```http
GET /api/game/active-games
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Active games retrieved successfully",
  "data": {
    "activeGames": [
      {
        "gameId": "game_123456789",
        "gameMode": "classic",
        "status": "active",
        "currentPlayer": "X",
        "userSymbol": "O",
        "opponent": {
          "id": "opponentId",
          "username": "opponent",
          "avatar": "avatar_url",
          "level": 5
        },
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalActiveGames": 1
  }
}
```

#### 6. Get Game History
```http
GET /api/game/history
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by game status

#### 7. Forfeit Game
```http
POST /api/game/forfeit/:gameId
```

**Headers:** `Authorization: Bearer <token>`

#### 8. Get Leaderboard
```http
GET /api/game/leaderboard
```

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `timeframe` (optional): daily, weekly, monthly, allTime

**Response:**
```json
{
  "success": true,
  "message": "Leaderboard retrieved successfully",
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "id": "userId",
          "username": "topPlayer",
          "avatar": "avatar_url",
          "level": 10
        },
        "stats": {
          "gamesPlayed": 100,
          "gamesWon": 85,
          "winRate": 85.0,
          "xp": 5000
        }
      }
    ],
    "totalPlayers": 1000,
    "userRank": 15
  }
}
```

#### 9. Get User Game Statistics
```http
GET /api/game/stats/:userId?
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "User statistics retrieved successfully",
  "data": {
    "stats": {
      "gamesPlayed": 50,
      "gamesWon": 30,
      "gamesLost": 15,
      "gamesDraw": 5,
      "winRate": 60.0,
      "currentStreak": 3,
      "longestStreak": 8,
      "xp": 2500,
      "level": 5,
      "rank": 42,
      "gamesByMode": {
        "classic": 30,
        "blitz": 15,
        "ranked": 5
      },
      "recentGames": []
    }
  }
}
```

#### 10. Find Random Match
```http
POST /api/game/matchmaking/find
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameMode": "classic",
  "skillLevel": "intermediate" // beginner, intermediate, advanced
}
```

#### 11. Cancel Matchmaking
```http
DELETE /api/game/matchmaking/cancel
```

**Headers:** `Authorization: Bearer <token>`

#### 12. Create Custom Game
```http
POST /api/game/custom
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "gameName": "Tournament Game",
  "gameMode": "custom",
  "isPrivate": true,
  "maxPlayers": 2,
  "timeLimit": 600,
  "password": "tournament123",
  "customRules": {
    "allowSpectators": true,
    "enableChat": true,
    "moveTimeLimit": 30
  }
}
```

---

## Chat System

### Base Route: `/api/chat`

#### 1. Get Chat Rooms
```http
GET /api/chat/rooms
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Chat rooms retrieved successfully",
  "data": {
    "rooms": [
      {
        "id": "general",
        "name": "General Chat",
        "type": "public",
        "userCount": 25,
        "lastMessage": {
          "content": "Hello everyone!",
          "sender": "username",
          "timestamp": "2024-01-01T00:00:00.000Z"
        }
      },
      {
        "id": "game_123456789",
        "name": "Game Room Chat",
        "type": "game",
        "userCount": 2,
        "gameId": "game_123456789"
      }
    ]
  }
}
```

#### 2. Join Chat Room
```http
POST /api/chat/join/:roomId
```

**Headers:** `Authorization: Bearer <token>`

#### 3. Leave Chat Room
```http
POST /api/chat/leave/:roomId
```

**Headers:** `Authorization: Bearer <token>`

#### 4. Send Message
```http
POST /api/chat/message
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "roomId": "general",
  "content": "Hello everyone!",
  "type": "text" // text, emoji, system
}
```

#### 5. Get Chat History
```http
GET /api/chat/history/:roomId
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Messages per page
- `before` (optional): Get messages before this timestamp

**Response:**
```json
{
  "success": true,
  "message": "Chat history retrieved successfully",
  "data": {
    "messages": [
      {
        "id": "messageId",
        "content": "Hello everyone!",
        "sender": {
          "id": "userId",
          "username": "john_doe",
          "avatar": "avatar_url"
        },
        "roomId": "general",
        "type": "text",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "edited": false,
        "reactions": []
      }
    ],
    "hasMore": true,
    "totalMessages": 150
  }
}
```

#### 6. Get Chat Room Users
```http
GET /api/chat/rooms/:roomId/users
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Room users retrieved successfully",
  "data": {
    "users": [
      {
        "id": "userId",
        "username": "john_doe",
        "avatar": "avatar_url",
        "status": "online",
        "joinedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalUsers": 25
  }
}
```

---

## Friends & Social System

### Base Route: `/api/friends`

#### 1. Send Friend Request
```http
POST /api/friends/request
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipientId": "targetUserId"
}
```

#### 2. Respond to Friend Request
```http
POST /api/friends/respond
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "requestId": "friendRequestId",
  "action": "accept" // accept or decline
}
```

#### 3. Get Friend Requests
```http
GET /api/friends/requests
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: `sent` or `received`

**Response:**
```json
{
  "success": true,
  "message": "Friend requests retrieved successfully",
  "data": {
    "requests": [
      {
        "id": "requestId",
        "sender": {
          "id": "userId",
          "username": "friend_user",
          "avatar": "avatar_url",
          "level": 3
        },
        "recipient": {
          "id": "currentUserId",
          "username": "current_user"
        },
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "totalRequests": 5
  }
}
```

#### 4. Get Friends List
```http
GET /api/friends/list
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Friends list retrieved successfully",
  "data": {
    "friends": [
      {
        "id": "friendId",
        "username": "friend_user",
        "avatar": "avatar_url",
        "level": 5,
        "status": "online", // online, offline, in-game
        "lastSeen": "2024-01-01T00:00:00.000Z",
        "currentGame": "game_123456789", // if in-game
        "stats": {
          "gamesPlayed": 30,
          "gamesWon": 20,
          "winRate": 66.7
        }
      }
    ],
    "totalFriends": 10,
    "onlineFriends": 3
  }
}
```

#### 5. Remove Friend
```http
DELETE /api/friends/remove/:friendId
```

**Headers:** `Authorization: Bearer <token>`

#### 6. Search Users
```http
GET /api/friends/search
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `query`: Search term (username or email)
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response:**
```json
{
  "success": true,
  "message": "Users found successfully",
  "data": {
    "users": [
      {
        "id": "userId",
        "username": "search_result",
        "avatar": "avatar_url",
        "level": 4,
        "status": "offline",
        "friendshipStatus": "none", // none, pending, friends, blocked
        "stats": {
          "gamesPlayed": 25,
          "winRate": 70.0
        }
      }
    ],
    "totalResults": 15
  }
}
```

#### 7. Block/Unblock User
```http
POST /api/friends/block
```

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "userId": "targetUserId",
  "action": "block" // block or unblock
}
```

#### 8. Get Blocked Users
```http
GET /api/friends/blocked
```

**Headers:** `Authorization: Bearer <token>`

---

## Socket.io Real-time Features

### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});
```

### Game Events

#### Join Game Room
```javascript
socket.emit('joinGame', {
  gameId: 'game_123456789'
});
```

#### Make Move
```javascript
socket.emit('makeMove', {
  gameId: 'game_123456789',
  row: 0,
  col: 1
});
```

#### Listen for Game Updates
```javascript
socket.on('gameUpdate', (data) => {
  // data contains updated game state
  console.log('Game updated:', data);
});

socket.on('moveResult', (data) => {
  // data contains move result and updated board
  console.log('Move result:', data);
});

socket.on('gameOver', (data) => {
  // data contains game result and winner
  console.log('Game finished:', data);
});

socket.on('playerJoined', (data) => {
  console.log('Player joined:', data.player);
});

socket.on('playerLeft', (data) => {
  console.log('Player left:', data.player);
});
```

### Chat Events

#### Join Chat Room
```javascript
socket.emit('joinChatRoom', {
  roomId: 'general'
});
```

#### Send Message
```javascript
socket.emit('sendMessage', {
  roomId: 'general',
  content: 'Hello everyone!',
  type: 'text'
});
```

#### Listen for Messages
```javascript
socket.on('newMessage', (message) => {
  console.log('New message:', message);
});

socket.on('userJoinedRoom', (data) => {
  console.log('User joined room:', data.user);
});

socket.on('userLeftRoom', (data) => {
  console.log('User left room:', data.user);
});
```

### Matchmaking Events

#### Start Matchmaking
```javascript
socket.emit('findMatch', {
  gameMode: 'classic',
  skillLevel: 'intermediate'
});
```

#### Listen for Match Events
```javascript
socket.on('matchFound', (data) => {
  console.log('Match found:', data.gameId);
});

socket.on('matchmakingUpdate', (data) => {
  console.log('Matchmaking status:', data.status);
});
```

### Friend Events

#### Listen for Friend Updates
```javascript
socket.on('friendRequest', (request) => {
  console.log('New friend request:', request);
});

socket.on('friendOnline', (friend) => {
  console.log('Friend came online:', friend);
});

socket.on('friendOffline', (friend) => {
  console.log('Friend went offline:', friend);
});

socket.on('gameInvite', (invite) => {
  console.log('Game invite received:', invite);
});
```

### Notification Events
```javascript
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});
```

---

## Admin System

### Base Route: `/api/admin`

#### 1. Get All Users (Admin Only)
```http
GET /api/admin/users
```

**Headers:** 
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Users per page
- `search` (optional): Search term
- `status` (optional): Filter by user status

#### 2. Ban/Unban User
```http
POST /api/admin/users/:userId/ban
```

**Headers:** `Authorization: Bearer <admin_token>`

**Request Body:**
```json
{
  "action": "ban", // ban or unban
  "reason": "Inappropriate behavior",
  "duration": 7 // days (optional)
}
```

#### 3. Get System Statistics
```http
GET /api/admin/stats
```

**Headers:** `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 10000,
      "active": 2500,
      "newToday": 50
    },
    "games": {
      "total": 50000,
      "activeNow": 150,
      "todayGames": 1200
    },
    "performance": {
      "avgResponseTime": 120,
      "errorRate": 0.01,
      "uptime": 99.9
    }
  }
}
```

---

## Data Models

### User Model
```typescript
interface IUser {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  password: string; // hashed
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
  isVerified: boolean;
  isActive: boolean;
  role: 'user' | 'admin';
  tokens: string[]; // refresh tokens
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Game Model
```typescript
interface IGame {
  _id: string;
  gameId: string;
  gameMode: 'classic' | 'blitz' | 'ranked' | 'custom';
  isPrivate: boolean;
  maxPlayers: number;
  timeLimit?: number;
  gameName?: string;
  password?: string;
  creatorId?: string;
  players: {
    player1: string;
    player2: string;
  };
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  winner?: string;
  result: 'win' | 'draw' | 'abandoned' | null;
  moves: {
    player: string;
    position: { row: number; col: number };
    symbol: 'X' | 'O';
    timestamp: Date;
  }[];
  startedAt: Date;
  endedAt?: Date;
  room: string;
  xpAwarded: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Chat Message Model
```typescript
interface IChatMessage {
  _id: string;
  content: string;
  sender: string;
  roomId: string;
  type: 'text' | 'emoji' | 'system';
  edited: boolean;
  editedAt?: Date;
  reactions: {
    emoji: string;
    users: string[];
  }[];
  replyTo?: string;
  timestamp: Date;
}
```

### Friend Request Model
```typescript
interface IFriendRequest {
  _id: string;
  sender: string;
  recipient: string;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Frontend Integration Guide

### 1. Authentication Flow

#### Login Process
```javascript
// 1. Login user
const loginUser = async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('accessToken', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      return data.data.user;
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// 2. Setup axios interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      
      try {
        const response = await axios.post('/api/auth/refresh-token', {
          refreshToken
        });
        
        const newToken = response.data.data.token;
        localStorage.setItem('accessToken', newToken);
        
        // Retry original request
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return axios.request(error.config);
      } catch (refreshError) {
        // Redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
```

### 2. Socket.io Setup

#### Socket Service
```javascript
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }
  
  connect() {
    const token = localStorage.getItem('accessToken');
    
    this.socket = io('http://localhost:3000', {
      auth: { token }
    });
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from server');
    });
    
    this.setupGameListeners();
    this.setupChatListeners();
  }
  
  setupGameListeners() {
    this.socket.on('gameUpdate', (data) => {
      // Update game state in your app
      this.onGameUpdate(data);
    });
    
    this.socket.on('moveResult', (data) => {
      // Handle move result
      this.onMoveResult(data);
    });
    
    this.socket.on('gameOver', (data) => {
      // Handle game completion
      this.onGameOver(data);
    });
  }
  
  setupChatListeners() {
    this.socket.on('newMessage', (message) => {
      // Add message to chat
      this.onNewMessage(message);
    });
  }
  
  joinGame(gameId) {
    this.socket.emit('joinGame', { gameId });
  }
  
  makeMove(gameId, row, col) {
    this.socket.emit('makeMove', { gameId, row, col });
  }
  
  sendMessage(roomId, content) {
    this.socket.emit('sendMessage', { roomId, content, type: 'text' });
  }
}

// Usage
const socketService = new SocketService();
socketService.connect();
```

### 3. Game Component Example (React)

```jsx
import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

const GameBoard = ({ gameId }) => {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch initial game state
    fetchGameState();
    
    // Join game room
    socketService.joinGame(gameId);
    
    // Setup listeners
    socketService.onGameUpdate = (data) => {
      setGame(data.game);
    };
    
    socketService.onMoveResult = (data) => {
      if (data.success) {
        setGame(data.game);
      } else {
        alert(data.message);
      }
    };
    
    socketService.onGameOver = (data) => {
      setGame(data.game);
      alert(`Game Over! Winner: ${data.winner}`);
    };
    
    return () => {
      // Cleanup listeners
    };
  }, [gameId]);
  
  const fetchGameState = async () => {
    try {
      const response = await fetch(`/api/game/state/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setGame(data.data.game);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCellClick = (row, col) => {
    if (game?.board[row][col] || game?.status !== 'active') {
      return;
    }
    
    socketService.makeMove(gameId, row, col);
  };
  
  if (loading) return <div>Loading...</div>;
  if (!game) return <div>Game not found</div>;
  
  return (
    <div className="game-board">
      <div className="game-info">
        <h2>Game: {game.gameId}</h2>
        <p>Current Player: {game.currentPlayer}</p>
        <p>Status: {game.status}</p>
      </div>
      
      <div className="board">
        {game.board.map((row, rowIndex) => (
          <div key={rowIndex} className="board-row">
            {row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className="board-cell"
                onClick={() => handleCellClick(rowIndex, colIndex)}
                disabled={cell !== null || game.status !== 'active'}
              >
                {cell}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      <div className="players">
        <div>Player 1 (X): {game.players.player1?.username}</div>
        <div>Player 2 (O): {game.players.player2?.username}</div>
      </div>
    </div>
  );
};
```

### 4. Chat Component Example (React)

```jsx
import React, { useState, useEffect } from 'react';
import { socketService } from '../services/socket';

const ChatRoom = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    // Fetch chat history
    fetchChatHistory();
    
    // Join chat room
    socketService.socket.emit('joinChatRoom', { roomId });
    
    // Setup listeners
    socketService.onNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
    };
    
    socketService.socket.on('userJoinedRoom', (data) => {
      setUsers(prev => [...prev, data.user]);
    });
    
    socketService.socket.on('userLeftRoom', (data) => {
      setUsers(prev => prev.filter(user => user.id !== data.user.id));
    });
    
    return () => {
      socketService.socket.emit('leaveChatRoom', { roomId });
    };
  }, [roomId]);
  
  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`/api/chat/history/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages.reverse());
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };
  
  const sendMessage = () => {
    if (newMessage.trim()) {
      socketService.sendMessage(roomId, newMessage);
      setNewMessage('');
    }
  };
  
  return (
    <div className="chat-room">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className="message">
            <span className="sender">{message.sender.username}:</span>
            <span className="content">{message.content}</span>
            <span className="timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
      
      <div className="chat-input">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      
      <div className="chat-users">
        <h4>Online Users ({users.length})</h4>
        {users.map((user) => (
          <div key={user.id} className="user">
            {user.username}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 5. State Management (Redux Example)

```javascript
// actions/gameActions.js
export const GAME_ACTIONS = {
  SET_GAME_STATE: 'SET_GAME_STATE',
  UPDATE_BOARD: 'UPDATE_BOARD',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR'
};

export const setGameState = (game) => ({
  type: GAME_ACTIONS.SET_GAME_STATE,
  payload: game
});

export const updateBoard = (board) => ({
  type: GAME_ACTIONS.UPDATE_BOARD,
  payload: board
});

// reducers/gameReducer.js
const initialState = {
  currentGame: null,
  gameHistory: [],
  loading: false,
  error: null
};

export const gameReducer = (state = initialState, action) => {
  switch (action.type) {
    case GAME_ACTIONS.SET_GAME_STATE:
      return {
        ...state,
        currentGame: action.payload,
        loading: false,
        error: null
      };
    
    case GAME_ACTIONS.UPDATE_BOARD:
      return {
        ...state,
        currentGame: {
          ...state.currentGame,
          board: action.payload
        }
      };
    
    case GAME_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    
    case GAME_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    
    default:
      return state;
  }
};
```

---

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate data)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error information",
    "field": "fieldName" // for validation errors
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `USER_NOT_FOUND`: User doesn't exist
- `INVALID_CREDENTIALS`: Wrong username/password
- `TOKEN_EXPIRED`: JWT token expired
- `GAME_NOT_FOUND`: Game doesn't exist
- `INVALID_MOVE`: Move is not allowed
- `ROOM_FULL`: Chat room/game room is full
- `PERMISSION_DENIED`: User lacks required permissions

---

## Security & Middleware

### Rate Limiting
- Login attempts: 5 per 15 minutes per IP
- API requests: 100 per 15 minutes per user
- Password reset: 3 per hour per IP
- Registration: 5 per hour per IP

### Input Validation
All inputs are validated using Joi schemas. Common validations:
- Username: 3-20 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Minimum 8 characters, must contain uppercase, lowercase, number
- Game moves: Valid row/column coordinates (0-2)

### Security Headers
- Helmet.js for security headers
- CORS configuration
- XSS protection
- SQL injection prevention
- Request sanitization

### Authentication Middleware
```javascript
// Usage in routes
app.get('/api/auth/profile', authenticateToken, getProfile);
app.post('/api/game/move', authenticateToken, validateGameMove, makeMove);
```

---

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/tictactoe

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Redis (for caching - optional)
REDIS_URL=redis://localhost:6379

# Social Authentication (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

---

## Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Make sure MongoDB is running
mongod
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Build for Production
```bash
npm run build
npm start
```

---

## Testing

### Run Tests
```bash
npm test
```

### API Testing with Postman
Import the Postman collection (available in `/docs/postman/`) for easy API testing.

### Socket.io Testing
Use the Socket.io test client in `/public/test.html` for testing real-time features.

---

This documentation provides everything needed to integrate with your Tic Tac Toe + Chat backend. For any questions or issues, refer to the source code or contact the development team.

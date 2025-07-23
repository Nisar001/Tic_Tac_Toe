# Enhanced Socket.io Chat System

This document describes the comprehensive Socket.io integrated chat system for the Tic Tac Toe backend.

## Overview

The enhanced chat system provides real-time messaging capabilities with room management, game integration, and comprehensive user features.

## Key Features

### 🚀 Real-Time Messaging
- **Socket.io Integration**: Instant message delivery
- **Typing Indicators**: Real-time typing status
- **Online Presence**: Track user online/offline status
- **Message History**: Persistent chat history with pagination

### 🏠 Room Management
- **Private Rooms**: Maximum 2 users per room
- **Auto-Discovery**: Available rooms shown to all users
- **Auto-Closure**: Rooms close when full (2 users)
- **Game Integration**: Automatic chat rooms for games

### 🎮 Game Integration
- **In-Game Chat**: Chat during active games
- **Game Rooms**: Automatic chat rooms for game sessions
- **Player Communication**: Direct communication between players

### 👥 User Features
- **Friend System**: Enhanced friend management
- **User Search**: Find other users to chat with
- **Room History**: View past conversations
- **Message Management**: Delete/edit messages

## Architecture

### Files Structure

```
src/
├── modules/chat/
│   ├── controllers/
│   │   ├── chatRoom.controller.ts      # Room management
│   │   ├── chatMessage.controller.ts   # Message handling
│   │   ├── chat.controller.fixed.ts    # Legacy compatibility
│   │   └── index.enhanced.ts           # Exports
│   └── routes/
│       ├── chat.socketio.routes.ts     # Main chat routes
│       ├── chat.routes.fixed.ts        # Fixed legacy routes
│       └── chat.routes.ts              # Original routes
├── socket/
│   ├── enhancedChat.socket.ts          # Enhanced Socket.io handler
│   ├── index.enhanced.ts               # Enhanced socket manager
│   ├── chat.socket.ts                  # Legacy chat socket
│   └── index.ts                        # Original socket manager
└── app.routes.socketio.ts              # Main routes with Socket.io
```

### Core Components

#### 1. Room Manager (`chatRoom.controller.ts`)
- Singleton pattern for room management
- In-memory room storage (use Redis in production)
- Room lifecycle management
- Participant tracking

#### 2. Message Controller (`chatMessage.controller.ts`)
- Database persistence via MongoDB
- Message validation and sanitization
- Real-time broadcasting via Socket.io
- Message history with pagination

#### 3. Enhanced Socket Handler (`enhancedChat.socket.ts`)
- Comprehensive event handling
- Authentication integration
- Real-time room updates
- Typing indicators

#### 4. Enhanced Socket Manager (`index.enhanced.ts`)
- Central socket management
- Connection limiting
- Event routing
- Statistics tracking

## API Endpoints

### Room Management

#### Create Room
```http
POST /api/chat/rooms
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "My Chat Room",
  "type": "private"
}
```

#### Get Available Rooms
```http
GET /api/chat/rooms/available
Authorization: Bearer <token>
```

#### Join Room
```http
POST /api/chat/rooms/:roomId/join
Authorization: Bearer <token>
```

#### Leave Room
```http
POST /api/chat/rooms/:roomId/leave
Authorization: Bearer <token>
```

### Messaging

#### Send Message
```http
POST /api/chat/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "roomId": "room_123",
  "message": "Hello world!"
}
```

#### Send Game Message
```http
POST /api/chat/game/:gameId/send
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Good game!"
}
```

#### Get Message History
```http
GET /api/chat/rooms/:roomId/messages?page=1&limit=50
Authorization: Bearer <token>
```

## Socket.io Events

### Connection Events

#### Client → Server
```javascript
// Authenticate socket
socket.emit('authenticate', { token: 'jwt_token' });

// Join user's rooms on connection
socket.emit('join-user-rooms');

// Heartbeat
socket.emit('ping');
```

#### Server → Client
```javascript
// Connection established
socket.on('connected', (data) => {
  console.log('Connected:', data.features);
});

// Authentication success
socket.on('authenticated', (user) => {
  console.log('Authenticated as:', user.username);
});

// Heartbeat response
socket.on('pong', (data) => {
  console.log('Server time:', data.timestamp);
});
```

### Room Events

#### Client → Server
```javascript
// Join specific room
socket.emit('join-room', { roomId: 'room_123' });

// Leave specific room
socket.emit('leave-room', { roomId: 'room_123' });

// Join game chat
socket.emit('join-game-chat', { gameId: 'game_456' });

// Leave game chat
socket.emit('leave-game-chat', { gameId: 'game_456' });
```

#### Server → Client
```javascript
// Room joined successfully
socket.on('room-joined', (data) => {
  console.log('Joined room:', data.roomName);
});

// User joined room
socket.on('user-joined-room', (data) => {
  console.log(`${data.user.username} joined`);
});

// User left room
socket.on('user-left-room', (data) => {
  console.log(`${data.user.username} left`);
});

// Room became full
socket.on('room-full', (data) => {
  console.log('Room is now full:', data.roomId);
});

// Room available again
socket.on('room-available', (data) => {
  console.log('Room has space:', data.roomId);
});
```

### Messaging Events

#### Client → Server
```javascript
// Send message to room
socket.emit('send-message', {
  roomId: 'room_123',
  message: 'Hello everyone!'
});

// Send message to game
socket.emit('send-game-message', {
  gameId: 'game_456',
  message: 'Good move!'
});
```

#### Server → Client
```javascript
// New message received
socket.on('new-message', (message) => {
  console.log(`${message.sender.username}: ${message.content}`);
});

// Game message received
socket.on('game-message', (message) => {
  console.log(`Game chat: ${message.content}`);
});
```

### Typing Events

#### Client → Server
```javascript
// Started typing
socket.emit('typing-start', { roomId: 'room_123' });

// Stopped typing
socket.emit('typing-stop', { roomId: 'room_123' });
```

#### Server → Client
```javascript
// User typing status
socket.on('user-typing', (data) => {
  if (data.isTyping) {
    console.log(`${data.user.username} is typing...`);
  } else {
    console.log(`${data.user.username} stopped typing`);
  }
});
```

## Room Lifecycle

### 1. Room Creation
```
User A creates room → Room visible to all users → Room ID generated
```

### 2. Room Discovery
```
Available rooms shown to all authenticated users (except creator)
```

### 3. Room Joining
```
User B joins room → Room becomes full → Room hidden from other users
```

### 4. Active Chat
```
Only User A and User B can chat in this room
Real-time message exchange via Socket.io
```

### 5. Room Closure
```
User leaves → If all users leave → Room automatically deleted
```

## Rate Limiting

### API Rate Limits
- **Room Creation**: 5 rooms per 10 minutes
- **Messaging**: 30 messages per minute
- **General Chat**: 60 requests per minute

### Socket.io Limits
- **Connection Attempts**: 15 per IP per minute
- **Message Rate**: 30 messages per minute per user
- **Room Operations**: 10 joins/leaves per minute

## Database Schema

### ChatMessage Model
```javascript
{
  sender: ObjectId,        // User who sent message
  content: String,         // Message content (max 500 chars)
  roomId: String,         // Room identifier
  gameId: ObjectId,       // Optional game reference
  timestamp: Date,        // Message timestamp
  type: String,           // 'message', 'system', 'deleted'
  isDeleted: Boolean      // Soft delete flag
}
```

### Room Storage (In-Memory)
```javascript
{
  id: String,             // Unique room identifier
  name: String,           // Display name
  type: String,           // 'private' or 'game'
  createdBy: String,      // Creator user ID
  participants: [String], // Array of user IDs
  maxParticipants: Number,// Maximum users (default: 2)
  isActive: Boolean,      // Room status
  gameId: String,         // Optional game reference
  createdAt: Date,        // Creation timestamp
  lastActivity: Date      // Last message/activity
}
```

## Error Handling

### Common Error Responses
```javascript
// Room not found
{
  success: false,
  message: "Chat room not found"
}

// Room full
{
  success: false,
  message: "Chat room is full"
}

// Not authorized
{
  success: false,
  message: "You are not authorized to view this chat"
}

// Rate limited
{
  success: false,
  message: "Too many requests, please slow down",
  retryAfter: 60
}
```

### Socket.io Errors
```javascript
// Authentication required
socket.on('error', (error) => {
  if (error.code === 'AUTH_REQUIRED') {
    // Redirect to login
  }
});

// Room access denied
socket.on('error', (error) => {
  if (error.message === 'Not authorized to join this room') {
    // Show error message
  }
});
```

## Security Features

### Authentication
- JWT token validation for all endpoints
- Socket.io authentication middleware
- User session management

### Input Validation
- Message content sanitization
- Room name validation
- Rate limiting protection

### Access Control
- Room participant verification
- Game player validation
- Friend-based restrictions

## Deployment Considerations

### Production Setup
1. **Redis Integration**: Replace in-memory room storage with Redis
2. **Message Queue**: Use Redis pub/sub for scaling
3. **Load Balancing**: Configure sticky sessions for Socket.io
4. **Database Optimization**: Index message collections properly

### Monitoring
- Socket connection metrics
- Message delivery tracking
- Room usage statistics
- Error rate monitoring

### Scaling
- Horizontal scaling with Redis adapter
- Database read replicas for message history
- CDN for static assets
- Microservice architecture

## Frontend Integration

### React Example
```javascript
import io from 'socket.io-client';

// Connect with authentication
const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// Join user rooms on connection
socket.on('authenticated', () => {
  socket.emit('join-user-rooms');
});

// Handle new messages
socket.on('new-message', (message) => {
  setMessages(prev => [...prev, message]);
});

// Send message
const sendMessage = (roomId, content) => {
  socket.emit('send-message', { roomId, message: content });
};
```

## Testing

### Unit Tests
- Room management logic
- Message validation
- Authentication middleware

### Integration Tests
- Socket.io event handling
- Database operations
- API endpoint functionality

### Load Tests
- Concurrent user connections
- Message throughput
- Room creation/deletion

This comprehensive Socket.io chat system provides a robust, scalable solution for real-time communication in the Tic Tac Toe application, with extensive features for both casual chat and game-integrated messaging.

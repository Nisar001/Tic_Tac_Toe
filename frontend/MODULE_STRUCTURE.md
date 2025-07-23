# Module Structure Documentation - Tic Tac Toe + Chat Backend

## 📁 Complete Project Structure

```
backend/
├── src/
│   ├── modules/                 # Feature modules
│   │   ├── auth/               # Authentication & User Management
│   │   │   ├── controllers/    # Auth controllers
│   │   │   │   ├── login.controller.ts
│   │   │   │   ├── register.controller.ts
│   │   │   │   ├── getProfile.controller.ts
│   │   │   │   ├── updateProfile.controller.ts
│   │   │   │   ├── changePassword.controller.ts
│   │   │   │   ├── verifyEmail.controller.ts
│   │   │   │   ├── resendVerification.controller.ts
│   │   │   │   ├── requestPasswordReset.controller.ts
│   │   │   │   ├── resetPassword.controller.ts
│   │   │   │   ├── refreshToken.controller.ts
│   │   │   │   ├── logout.controller.ts
│   │   │   │   ├── logoutAll.controller.ts
│   │   │   │   ├── deleteAccount.controller.ts
│   │   │   │   └── index.ts
│   │   │   └── routes/
│   │   │       ├── auth.routes.ts
│   │   │       └── social.routes.ts
│   │   │
│   │   ├── game/               # Game Management System
│   │   │   ├── controllers/    # Game controllers
│   │   │   │   ├── game.controller.ts        # Main game logic
│   │   │   │   ├── createCustomGame.controller.ts
│   │   │   │   ├── forfeitGame.controller.ts
│   │   │   │   ├── getGameState.controller.ts
│   │   │   │   ├── gameHistory.controller.ts
│   │   │   │   ├── gameMove.controller.ts
│   │   │   │   ├── gameRoom.controller.ts
│   │   │   │   ├── getUserGameStats.controller.ts
│   │   │   │   ├── joinGame.controller.ts
│   │   │   │   ├── leaderboard.controller.ts
│   │   │   │   ├── matchmaking.controller.ts
│   │   │   │   ├── spectator.controller.ts
│   │   │   │   └── index.ts
│   │   │   └── routes/
│   │   │       └── game.routes.ts
│   │   │
│   │   ├── chat/               # Chat & Messaging System
│   │   │   ├── controllers/    # Chat controllers
│   │   │   │   ├── chat.controller.ts        # Main chat logic
│   │   │   │   ├── getChatHistory.controller.ts
│   │   │   │   ├── getChatRooms.controller.ts
│   │   │   │   ├── getChatRoomUsers.controller.ts
│   │   │   │   ├── joinChatRoom.controller.ts
│   │   │   │   ├── leaveChatRoom.controller.ts
│   │   │   │   ├── sendMessage.controller.ts
│   │   │   │   └── index.ts
│   │   │   └── routes/
│   │   │       └── chat.routes.ts
│   │   │
│   │   ├── friends/            # Social Features
│   │   │   ├── controllers/
│   │   │   │   ├── friends.unified.ts        # All friend functionality
│   │   │   │   └── index.ts
│   │   │   └── routes/
│   │   │       └── friends.routes.ts
│   │   │
│   │   ├── notifications/      # Notification System
│   │   │   ├── controllers/
│   │   │   │   ├── notifications.controller.ts
│   │   │   │   └── index.ts
│   │   │   └── routes/
│   │   │       └── notifications.routes.ts
│   │   │
│   │   └── admin/              # Admin Panel
│   │       ├── controllers/
│   │       │   ├── admin.controller.ts
│   │       │   └── index.ts
│   │       └── routes/
│   │           └── admin.routes.ts
│   │
│   ├── models/                 # Database Models
│   │   ├── user.model.ts       # User schema & methods
│   │   ├── game.model.ts       # Game schema & methods
│   │   ├── chatMessage.model.ts # Chat message schema
│   │   └── friendRequest.model.ts # Friend request schema
│   │
│   ├── socket/                 # Real-time Socket.io Handlers
│   │   ├── index.ts           # Socket.io setup & initialization
│   │   ├── auth.socket.ts     # Authentication events
│   │   ├── game.socket.ts     # Game-related events
│   │   ├── chat.socket.ts     # Chat events
│   │   └── matchmaking.socket.ts # Matchmaking events
│   │
│   ├── middlewares/           # Express Middlewares
│   │   ├── auth.middleware.ts           # JWT authentication
│   │   ├── validation.middleware.ts     # Input validation
│   │   ├── error.middleware.ts          # Error handling
│   │   ├── rateLimiting.middleware.ts   # Rate limiting
│   │   ├── security.middleware.ts       # Security headers
│   │   ├── performance.middleware.ts    # Performance monitoring
│   │   └── validateResendVerification.ts
│   │
│   ├── services/              # Business Logic Services
│   │   ├── email.service.ts   # Email notifications
│   │   ├── scheduler.service.ts # Task scheduling
│   │   └── sms.service.ts     # SMS notifications
│   │
│   ├── utils/                 # Utility Functions
│   │   ├── logger.ts          # Logging utilities
│   │   ├── auth.utils.ts      # Authentication helpers
│   │   ├── game.utils.ts      # Game logic utilities
│   │   ├── matchmaking.utils.ts # Matchmaking algorithms
│   │   ├── energy.utils.ts    # Energy/XP calculations
│   │   ├── cache.ts           # Caching utilities
│   │   └── database-indexes.ts # Database optimization
│   │
│   ├── config/                # Configuration Files
│   │   ├── index.ts           # Main config
│   │   ├── database.ts        # Database configuration
│   │   ├── passport.config.ts # Social auth config
│   │   └── social.config.ts   # Social login settings
│   │
│   ├── types/                 # TypeScript Type Definitions
│   │   └── index.ts           # Global type definitions
│   │
│   ├── public/                # Static Files
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   ├── app.routes.ts          # Main route configuration
│   ├── server.ts              # Express server setup
│   └── debug-password.ts      # Development utilities
│
├── docs/                      # Documentation
│   └── SOCIAL_LOGIN_REDIRECT_URIS.md
│
├── logs/                      # Application Logs
│   ├── application.log
│   ├── debug.log
│   └── error.log
│
├── types/                     # Additional Type Definitions
│   └── jest.d.ts
│
├── package.json               # Dependencies & scripts
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Testing configuration
├── nodemon.json              # Development server config
├── ENV_VARIABLES.md          # Environment variables guide
├── README.md                 # Project overview
├── API_DOCUMENTATION.md      # Complete API documentation
└── QUICK_REFERENCE.md        # Developer quick reference
```

---

## 🔧 Module Details

### 1. Authentication Module (`src/modules/auth/`)

**Purpose:** Complete user authentication and account management

**Controllers:**
- `login.controller.ts` - User authentication
- `register.controller.ts` - User registration with email verification
- `getProfile.controller.ts` - Retrieve user profile data
- `updateProfile.controller.ts` - Update user information & avatar
- `changePassword.controller.ts` - Secure password changes
- `verifyEmail.controller.ts` - Email verification handling
- `resendVerification.controller.ts` - Resend verification emails
- `requestPasswordReset.controller.ts` - Password reset requests
- `resetPassword.controller.ts` - Password reset with tokens
- `refreshToken.controller.ts` - JWT token refresh
- `logout.controller.ts` - Single session logout
- `logoutAll.controller.ts` - Multi-device logout
- `deleteAccount.controller.ts` - Account deletion

**Key Features:**
- JWT-based authentication with refresh tokens
- Email verification system
- Password reset functionality
- Social authentication ready
- Multi-device session management
- Secure account deletion

---

### 2. Game Module (`src/modules/game/`)

**Purpose:** Complete multiplayer Tic Tac Toe game system

**Controllers:**
- `game.controller.ts` - Main game operations
- `gameRoom.controller.ts` - Game room creation & management
- `joinGame.controller.ts` - Join existing games
- `gameMove.controller.ts` - Process game moves
- `getGameState.controller.ts` - Retrieve current game state & active games
- `gameHistory.controller.ts` - Game history & statistics
- `getUserGameStats.controller.ts` - Individual player statistics
- `leaderboard.controller.ts` - Global rankings & leaderboards
- `matchmaking.controller.ts` - Automatic player matching
- `spectator.controller.ts` - Spectator mode functionality
- `forfeitGame.controller.ts` - Game forfeiture
- `createCustomGame.controller.ts` - Custom game creation

**Key Features:**
- Multiple game modes (Classic, Blitz, Ranked, Custom)
- Real-time multiplayer with Socket.io
- Comprehensive game state management
- Advanced matchmaking algorithms
- Spectator mode
- Complete statistics tracking
- XP and leveling system
- Private/public room options

---

### 3. Chat Module (`src/modules/chat/`)

**Purpose:** Real-time messaging and communication system

**Controllers:**
- `chat.controller.ts` - Main chat operations
- `getChatRooms.controller.ts` - Available chat rooms
- `joinChatRoom.controller.ts` - Join chat rooms
- `leaveChatRoom.controller.ts` - Leave chat rooms
- `sendMessage.controller.ts` - Send messages
- `getChatHistory.controller.ts` - Message history retrieval
- `getChatRoomUsers.controller.ts` - Room user management

**Key Features:**
- Multiple chat room types (Global, Game, Private)
- Real-time messaging with Socket.io
- Message history persistence
- User presence tracking
- Room-based permissions
- Message reactions (ready for implementation)
- File sharing capabilities

---

### 4. Friends Module (`src/modules/friends/`)

**Purpose:** Social features and friend management

**Controllers:**
- `friends.unified.ts` - Complete friend system
  - Send/accept/decline friend requests
  - Friends list management
  - User search functionality
  - Block/unblock users
  - Online status tracking

**Key Features:**
- Friend request system
- User search and discovery
- Online presence indicators
- Blocking/privacy controls
- Friend statistics integration
- Game invitations

---

### 5. Notifications Module (`src/modules/notifications/`)

**Purpose:** In-app and push notification system

**Controllers:**
- `notifications.controller.ts` - Notification management
  - Create notifications
  - Mark as read/unread
  - Get user notifications
  - Real-time delivery

**Key Features:**
- Real-time notifications via Socket.io
- Persistent notification storage
- Multiple notification types
- Read/unread status tracking
- Notification preferences

---

### 6. Admin Module (`src/modules/admin/`)

**Purpose:** Administrative tools and system management

**Controllers:**
- `admin.controller.ts` - Admin operations
  - User management
  - System statistics
  - Game monitoring
  - Ban/unban users
  - System health checks

**Key Features:**
- User moderation tools
- System analytics
- Performance monitoring
- Administrative reports
- Bulk operations

---

## 🔌 Socket.io Handlers (`src/socket/`)

### Real-time Event Handlers

**`index.ts`** - Main Socket.io setup
- Connection management
- Authentication middleware
- Event handler registration
- Error handling

**`game.socket.ts`** - Game events
- `joinGame` - Join game room
- `makeMove` - Real-time move processing
- `gameUpdate` - Broadcast game state changes
- `gameOver` - Handle game completion
- `spectateGame` - Spectator functionality

**`chat.socket.ts`** - Chat events
- `joinChatRoom` - Join chat rooms
- `sendMessage` - Real-time messaging
- `newMessage` - Broadcast messages
- `userJoinedRoom`/`userLeftRoom` - User presence

**`matchmaking.socket.ts`** - Matchmaking events
- `findMatch` - Start matchmaking
- `cancelMatch` - Cancel matchmaking
- `matchFound` - Notify players of matches
- `matchmakingUpdate` - Status updates

**`auth.socket.ts`** - Authentication events
- Connection authentication
- User presence management
- Friend status updates
- Notification delivery

---

## 🛡️ Middleware System (`src/middlewares/`)

**`auth.middleware.ts`**
- JWT token validation
- User authentication
- Role-based access control
- Token refresh handling

**`validation.middleware.ts`**
- Input validation using Joi
- Request sanitization
- File upload validation
- Custom validation rules

**`error.middleware.ts`**
- Global error handling
- Error logging
- User-friendly error responses
- Development vs production errors

**`rateLimiting.middleware.ts`**
- API rate limiting
- IP-based restrictions
- User-based limitations
- Endpoint-specific limits

**`security.middleware.ts`**
- Helmet.js security headers
- CORS configuration
- XSS protection
- Request size limits

**`performance.middleware.ts`**
- Response time monitoring
- Request logging
- Performance metrics
- Health check endpoints

---

## 📊 Data Models (`src/models/`)

### User Model (`user.model.ts`)
```typescript
interface IUser {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  level: number;
  xp: number;
  gamesPlayed: number;
  gamesWon: number;
  isVerified: boolean;
  role: 'user' | 'admin';
  // ... additional fields
}
```

### Game Model (`game.model.ts`)
```typescript
interface IGame {
  gameId: string;
  gameMode: 'classic' | 'blitz' | 'ranked' | 'custom';
  players: {
    player1: ObjectId;
    player2: ObjectId;
  };
  board: (string | null)[][];
  currentPlayer: 'X' | 'O';
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  moves: Array<{
    player: ObjectId;
    position: { row: number; col: number };
    symbol: 'X' | 'O';
    timestamp: Date;
  }>;
  // ... additional fields
}
```

### Chat Message Model (`chatMessage.model.ts`)
```typescript
interface IChatMessage {
  content: string;
  sender: ObjectId;
  roomId: string;
  type: 'text' | 'emoji' | 'system';
  timestamp: Date;
  edited: boolean;
  reactions: Array<{
    emoji: string;
    users: ObjectId[];
  }>;
}
```

### Friend Request Model (`friendRequest.model.ts`)
```typescript
interface IFriendRequest {
  sender: ObjectId;
  recipient: ObjectId;
  status: 'pending' | 'accepted' | 'declined';
  message?: string;
  createdAt: Date;
}
```

---

## ⚙️ Services & Utilities

### Services (`src/services/`)
- **Email Service** - Nodemailer integration for transactional emails
- **SMS Service** - SMS notifications (Twilio integration ready)
- **Scheduler Service** - Cron job management for cleanup tasks

### Utilities (`src/utils/`)
- **Logger** - Winston-based logging system
- **Auth Utils** - JWT helpers, password hashing
- **Game Utils** - Game logic, win conditions, board validation
- **Matchmaking Utils** - Player matching algorithms
- **Energy Utils** - XP calculations, level progression
- **Cache** - Redis caching utilities
- **Database Indexes** - MongoDB optimization

---

## 🚀 Getting Started with Each Module

### 1. Adding New Auth Feature
```typescript
// 1. Create controller in src/modules/auth/controllers/
// 2. Add validation middleware
// 3. Update routes in auth.routes.ts
// 4. Export from index.ts
```

### 2. Adding New Game Mode
```typescript
// 1. Update IGame interface in models/game.model.ts
// 2. Create controller in src/modules/game/controllers/
// 3. Add Socket.io events in socket/game.socket.ts
// 4. Update frontend integration
```

### 3. Adding Chat Features
```typescript
// 1. Update IChatMessage model if needed
// 2. Create controller in src/modules/chat/controllers/
// 3. Add Socket.io events in socket/chat.socket.ts
// 4. Update chat routes
```

---

## 🔍 Code Organization Best Practices

### Controller Structure
```typescript
// Standard controller format
export const controllerName = async (req: Request, res: Response) => {
  try {
    // 1. Input validation
    // 2. Business logic
    // 3. Database operations
    // 4. Response formatting
    
    res.json({
      success: true,
      message: 'Operation successful',
      data: result
    });
  } catch (error) {
    logError('Controller error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
};
```

### Socket Event Structure
```typescript
// Standard socket event handler
export const handleSocketEvent = (socket: Socket) => {
  socket.on('eventName', async (data) => {
    try {
      // 1. Validate data
      // 2. Process event
      // 3. Emit response
      
      socket.emit('eventResponse', {
        success: true,
        data: result
      });
    } catch (error) {
      socket.emit('error', {
        success: false,
        message: 'Event processing failed'
      });
    }
  });
};
```

### Model Method Structure
```typescript
// Standard model methods
gameSchema.methods.makeMove = function(playerId: string, row: number, col: number): boolean {
  // 1. Validate input
  // 2. Check game state
  // 3. Apply move
  // 4. Update state
  return true;
};
```

---

This module structure provides a solid foundation for building and maintaining the Tic Tac Toe + Chat application. Each module is self-contained with clear responsibilities, making the codebase scalable and maintainable.

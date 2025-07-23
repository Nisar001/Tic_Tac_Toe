# Quick Developer Reference - Tic Tac Toe + Chat API

## 🚀 Quick Start

### Base URL
```
http://localhost:3000/api
```

### Authentication Header
```
Authorization: Bearer <your_jwt_token>
```

---

## 📱 Essential API Endpoints

### 🔐 Authentication
```http
POST /api/auth/register     # Register new user
POST /api/auth/login        # User login
GET  /api/auth/profile      # Get user profile
PUT  /api/auth/profile      # Update profile
POST /api/auth/logout       # Logout user
```

### 🎮 Game Management
```http
POST /api/game/room         # Create game room
POST /api/game/join/:gameId # Join game
POST /api/game/move         # Make move
GET  /api/game/state/:gameId # Get game state
GET  /api/game/active-games # Get user's active games
GET  /api/game/leaderboard  # Get leaderboard
```

### 💬 Chat System
```http
GET  /api/chat/rooms        # Get chat rooms
POST /api/chat/join/:roomId # Join room
POST /api/chat/message      # Send message
GET  /api/chat/history/:roomId # Get chat history
```

### 👥 Friends & Social
```http
POST /api/friends/request   # Send friend request
POST /api/friends/respond   # Accept/decline request
GET  /api/friends/list      # Get friends list
GET  /api/friends/search    # Search users
```

---

## 🔌 Socket.io Events

### Client → Server
```javascript
socket.emit('joinGame', { gameId })
socket.emit('makeMove', { gameId, row, col })
socket.emit('sendMessage', { roomId, content })
socket.emit('findMatch', { gameMode })
```

### Server → Client
```javascript
socket.on('gameUpdate', (data) => {})
socket.on('moveResult', (data) => {})
socket.on('gameOver', (data) => {})
socket.on('newMessage', (message) => {})
socket.on('matchFound', (data) => {})
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Error details"
  }
}
```

---

## 🎯 Common Use Cases

### 1. User Registration Flow
```javascript
// 1. Register
POST /api/auth/register
// 2. Verify email (check email for token)
POST /api/auth/verify-email
// 3. Login
POST /api/auth/login
```

### 2. Start a Game
```javascript
// 1. Create or join game
POST /api/game/room
// 2. Connect to Socket.io
socket.emit('joinGame', { gameId })
// 3. Make moves
socket.emit('makeMove', { gameId, row, col })
```

### 3. Chat Integration
```javascript
// 1. Get available rooms
GET /api/chat/rooms
// 2. Join room
socket.emit('joinChatRoom', { roomId })
// 3. Send messages
socket.emit('sendMessage', { roomId, content })
```

---

## 🔒 Security Notes

- All protected routes require JWT token
- Rate limiting applied (100 requests/15min per user)
- Input validation on all endpoints
- XSS and injection protection enabled
- CORS configured for frontend domains

---

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `USER_NOT_FOUND` | User doesn't exist |
| `INVALID_CREDENTIALS` | Wrong login details |
| `TOKEN_EXPIRED` | JWT token expired |
| `GAME_NOT_FOUND` | Game doesn't exist |
| `INVALID_MOVE` | Invalid game move |
| `ROOM_FULL` | Room at capacity |

---

## 🛠️ Development Tips

### Environment Variables
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/tictactoe
JWT_SECRET=your_secret_key
EMAIL_HOST=smtp.gmail.com
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password123"}'
```

### Socket.io Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});
```

---

## 📦 Project Structure

```
src/
├── modules/
│   ├── auth/          # Authentication
│   ├── game/          # Game logic
│   ├── chat/          # Chat system
│   └── friends/       # Social features
├── models/            # Database models
├── socket/            # Socket.io handlers
├── middlewares/       # Express middlewares
└── utils/             # Utility functions
```

---

## 🎮 Game Board Format

```javascript
// 3x3 board representation
board: [
  ["X", null, "O"],
  [null, "X", null],
  ["O", null, "X"]
]

// Position coordinates
{ row: 0, col: 1 } // Top middle
{ row: 1, col: 1 } // Center
{ row: 2, col: 2 } // Bottom right
```

---

## 📞 Support

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

Need help? Check the source code in the respective module directories.

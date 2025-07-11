# Postman Collections - Updated & Complete

This folder contains updated Postman collections and environments for the Tic Tac Toe API, reflecting the current error-free backend implementation.

## 📁 Files Overview

### Collections
- **`Tic_Tac_Toe_API_UPDATED_COMPLETE.postman_collection.json`** - **👈 USE THIS ONE**
  - Complete, up-to-date collection with all current endpoints
  - Includes all authentication, game, matchmaking, and chat endpoints
  - Has proper test scripts and variable management
  - Version 4.1.0 - Latest with all fixes

- **`Tic_Tac_Toe_API.postman_collection.json`** - Original collection (updated header)
- **`Tic_Tac_Toe_API_Complete.postman_collection.json`** - Previous complete version
- **`Tic_Tac_Toe_API_Updated.postman_collection.json`** - Intermediate version

### Environments
- **`Tic_Tac_Toe_Development_Updated.postman_environment.json`** - **👈 USE THIS ONE**
  - Updated environment with correct port (3000) and all necessary variables
  - Includes all tokens, IDs, and configuration variables

- **`Tic_Tac_Toe_Development.postman_environment.json`** - Original (updated)
- **`Tic_Tac_Toe_Staging.postman_environment.json`** - Staging environment
- **`Tic_Tac_Toe_Production.postman_environment.json`** - Production environment

### Test Scripts
- **`../test-api-complete.js`** - Comprehensive Node.js test runner
  - Tests all endpoints automatically
  - Provides detailed results and error reporting

## 🚀 Quick Start

### 1. Import to Postman
1. Open Postman
2. Click "Import"
3. Import these files:
   - `Tic_Tac_Toe_API_UPDATED_COMPLETE.postman_collection.json`
   - `Tic_Tac_Toe_Development_Updated.postman_environment.json`

### 2. Set Environment
- Select "Tic Tac Toe - Development (Updated)" environment
- Verify `apiUrl` is set to `http://localhost:3000`

### 3. Start Testing
1. Ensure your backend server is running on port 3000
2. Start with "Register User" in the Authentication folder
3. Then "Login User" - tokens will be automatically stored
4. Test other endpoints (they use stored tokens automatically)

## 📋 Available Endpoints

### 🔐 Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/resend-verification` - Resend verification
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout
- `POST /api/auth/logout-all` - Logout all devices
- `DELETE /api/auth/account` - Delete account

### 🎮 Game Management
- `POST /api/game/create` - Create custom game
- `GET /api/game/state/:roomId` - Get game state
- `GET /api/game/active` - Get active games
- `POST /api/game/move/:roomId` - Make move
- `POST /api/game/forfeit/:roomId` - Forfeit game
- `GET /api/game/stats` - Get user stats
- `GET /api/game/leaderboard` - Get leaderboard

### 🎯 Matchmaking
- `POST /api/game/matchmaking/join` - Join queue
- `POST /api/game/matchmaking/leave` - Leave queue
- `GET /api/game/matchmaking/status` - Get status
- `GET /api/game/matchmaking/stats` - Get queue stats
- `POST /api/game/admin/force-match` - Force match (admin)
- `POST /api/game/admin/cleanup-queue` - Cleanup queue (admin)

### 💬 Chat
- `GET /api/chat/rooms` - Get chat rooms
- `POST /api/chat/rooms/:roomId/join` - Join room
- `POST /api/chat/rooms/:roomId/leave` - Leave room
- `GET /api/chat/rooms/:roomId/users` - Get room users
- `GET /api/chat/rooms/:roomId/messages` - Get messages
- `POST /api/chat/rooms/:roomId/messages` - Send message
- `GET /api/chat/history/:gameId` - Get history (legacy)
- `POST /api/chat/send` - Send message (legacy)

### 🔍 System
- `GET /api/` - API info
- `GET /health` - Health check

## 🔧 Environment Variables

The updated environment includes:

| Variable | Description | Example |
|----------|-------------|---------|
| `apiUrl` | Base API URL | `http://localhost:3000` |
| `accessToken` | JWT access token | Auto-stored from login |
| `refreshToken` | JWT refresh token | Auto-stored from login |
| `userId` | Current user ID | Auto-stored from login |
| `userEmail` | Current user email | Auto-stored from login |
| `gameId` | Current game ID | Auto-stored from game creation |
| `roomId` | Current room ID | Auto-stored from game creation |
| `adminApiKey` | Admin API key | Set manually for admin endpoints |

## 🧪 Testing Workflow

### Basic Flow
1. **Register** → **Login** → **Get Profile**
2. **Create Game** → **Get Game State** → **Make Move**
3. **Join Chat** → **Send Message** → **Get History**
4. **Get Stats** → **Get Leaderboard**

### Advanced Flow
1. **Join Matchmaking** → **Check Status** → **Leave Queue**
2. **Admin Operations** (requires API key)
3. **Token Refresh** → **Logout**

## 🐛 Troubleshooting

### Common Issues

**401 Unauthorized**
- Ensure you've logged in and have a valid token
- Check if token expired, use refresh endpoint

**404 Not Found**
- Verify the endpoint URL is correct
- Check if the server is running on the right port (3000)

**400 Bad Request**
- Check request body format
- Verify required fields are included
- Check validation requirements

**Rate Limiting**
- Some endpoints have rate limits
- Wait a moment before retrying

### Server Issues
```bash
# Check if server is running
curl http://localhost:3000/api

# Check server logs for errors
# Look for TypeScript compilation errors
# Verify database connection
```

## 📝 Notes

- All endpoints now use the corrected routes from the fixed backend
- Error handling is improved with proper status codes
- Automatic token management in collection scripts
- Comprehensive test coverage for all major flows
- Compatible with the error-free backend implementation

## 🔄 Updates Made

### From Previous Version
1. **Fixed port number** - Changed from 5000 to 3000
2. **Updated all endpoints** - Match current route implementations
3. **Added missing endpoints** - Matchmaking, chat, admin routes
4. **Improved test scripts** - Better error handling and variable management
5. **Fixed authentication flow** - Proper token storage and usage
6. **Added comprehensive documentation** - Complete endpoint coverage

### Backend Compatibility
✅ Compatible with error-free backend (all TypeScript errors fixed)
✅ Matches current route structure and controller implementations
✅ Includes all available endpoints and features
✅ Proper request/response format handling

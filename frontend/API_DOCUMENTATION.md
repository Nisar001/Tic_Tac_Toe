

# API Documentation (Full Route List)

This document lists **every API route** in the backend, grouped by module, with HTTP method, path, required parameters, request/response examples, error cases, and notes. Use this as the single source of truth for frontend/backend integration.

---

## Auth Module

### POST /api/auth/register
Register a new user.
**Request:**
```
{
  "username": "string",
  "email": "string",
  "password": "string",
  "confirmPassword": "string",
  "phoneNumber"?: "string",
  "dateOfBirth"?: "YYYY-MM-DD"
}
```
**Response:**
```
{
  "success": true,
  "message": "Registration successful",
  "data": { "user": { ...userFields } }
}
```
**Error Responses:**
- 400: Missing/invalid fields, duplicate email/username, password mismatch, etc.

### POST /api/auth/login
Login with email and password.
**Request:** `{ "email": "string", "password": "string", "rememberMe"?: true }`
**Response:** `{ "success": true, "message": "Login successful", "data": { "accessToken": "...", "refreshToken": "...", "user": { ... } } }`
**Error Responses:**
- 400: Invalid credentials, missing fields
- 403: Account blocked/deleted

### POST /api/auth/verify-email
Verify email with code.
**Request:** `{ "email": "string", "verificationCode": "string" }`
**Response:** `{ "success": true, "message": "Email verified", "data": { "alreadyVerified": false } }`

### POST /api/auth/resend-verification
Resend email verification code.
**Request:** `{ "email": "string" }`
**Response:** `{ "success": true, "message": "Verification code sent" }`

### POST /api/auth/request-password-reset
Request password reset link.
**Request:** `{ "email": "string" }`
**Response:** `{ "success": true, "message": "Password reset link sent" }`

### POST /api/auth/reset-password
Reset password with token.
**Request:** `{ "token": "string", "newPassword": "string" }`
**Response:** `{ "success": true, "message": "Password reset successful" }`

### POST /api/auth/refresh-token
Refresh access token.
**Request:** `{ "refreshToken": "string" }`
**Response:** `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

### GET /api/auth/profile
Get current user profile.
**Response:** `{ "success": true, "data": { "user": { ... } } }`

### PATCH /api/auth/profile
Update user profile.
**Request:** `{ ...profileFields }`
**Response:** `{ "success": true, "data": { "user": { ... } } }`

### POST /api/auth/change-password
Change user password.
**Request:** `{ "oldPassword": "string", "newPassword": "string" }`
**Response:** `{ "success": true, "message": "Password changed" }`

### POST /api/auth/logout
Logout current session.
**Response:** `{ "success": true, "message": "Logged out" }`

### POST /api/auth/logout-all
Logout all sessions.
**Response:** `{ "success": true, "message": "All sessions logged out" }`

### DELETE /api/auth/account
Delete user account.
**Response:** `{ "success": true, "message": "Account deleted" }`

### Social Auth
#### GET /api/auth/social/google, /facebook
Start Google/Facebook OAuth login (redirects to provider).
#### GET /api/auth/social/google/callback, /facebook/callback
OAuth callback (handled by backend, returns tokens/user or error).
#### POST /api/auth/social/google, /facebook
Direct login with provider token (for mobile/SPA).

---

## Game Module

### POST /api/game/create
Create a new custom game. Requires authentication and at least 1 life.
**Request:**
```
{
  "gameConfig": {
    "gameMode": "classic" | "timed" | "blitz" | "tournament", // optional, default: classic
    "isPrivate": true | false, // optional, default: false
    "maxPlayers": 2, // must be 2
    "timeLimit": 30-3600, // seconds, optional
    "gameName": "string", // optional, min 3 chars
    "password": "string" // optional, min 4 chars if private
  }
}
```
**Response:**
```
{
  "success": true,
  "message": "Custom game created successfully",
  "data": {
    "game": { ... },
    "livesUsed": 1,
    "remainingLives": 4,
    "joinCode": "roomId-if-private-or-null"
  }
}
```
**Real-time:** Registers the game in the socket system for live play. Players joining via socket will receive real-time updates.
**Error Responses:**
- 401: `{ success: false, message: 'Authentication required' }`
- 403: `{ success: false, message: 'Account has been deactivated/blocked' }`
- 400: `{ success: false, message: 'Insufficient lives to create game' }`
- 400: `{ success: false, message: 'Too many active games' }`
- 400: `{ success: false, message: 'Invalid game config fields: ...' }`
- 429: `{ success: false, message: 'Too many custom games created. Please try again later.' }`

### GET /api/game/state/:roomId
Get game state by room ID. Requires authentication.
**Response:**
```
{
  "success": true,
  "message": "Game state fetched successfully",
  "data": { "gameState": { ...full game object... } }
}
```
**Error Responses:**
- 404: `{ success: false, message: 'Game not found' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`

### GET /api/game/active
Get all active games for the authenticated user.
**Response:** `{ "success": true, "data": { "games": [ ... ] } }`

### POST /api/game/forfeit/:roomId
Forfeit a game by room ID. Requires authentication.
**Response:** `{ "success": true, "message": "Game forfeited successfully" }`
**Error Responses:**
- 404: `{ success: false, message: 'Game not found' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`

### GET /api/game/stats
Get user game stats and recent games. Requires authentication.
**Response:** `{ "success": true, "message": "...", "data": { "stats": { ... }, "recentGames": [ ... ] } }`

### GET /api/game/leaderboard
Get leaderboard (supports pagination/timeframe).
**Query:** `?page=1&limit=20&timeframe=all`
**Response:** `{ "success": true, "message": "...", "data": { "leaderboard": [ ... ], "total": 100, "page": 1, "limit": 20 } }`

### POST /api/game/move/:roomId
Make a move in a game. Requires authentication.
**Request:**
```
{
  "position": 0-8, // for classic
  // or
  "row": 0-2, "col": 0-2 // for 2D board
}
```
**Response:** `{ "success": true, "message": "...", "data": { "gameState": { ... } } }`
**Real-time:** Emits a `game_move` event to all clients in the room via socket with `{ roomId, move, gameState }`.
**Error Responses:**
- 400: `{ success: false, message: 'Invalid move' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`
- 404: `{ success: false, message: 'Game not found' }`

### GET /api/game/history
Get user's game history. Requires authentication.
**Query:** `?page=1&limit=10`
**Response:** `{ "success": true, "message": "...", "data": { "games": [ ... ], "pagination": { ... } } }`

### Matchmaking
#### POST /api/game/matchmaking/join
Join matchmaking queue. Requires authentication and at least 1 life.
**Request:** `{ "gameMode": "classic" | "timed" | "blitz" | "tournament", "skillLevel": 1-10 }`
**Response:** `{ "success": true, "message": "...", "data": { "queueStatus": { ... } } }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid game mode' }`
- 400: `{ success: false, message: 'Skill level must be a number between 1 and 10' }`
- 400: `{ success: false, message: 'Already in matchmaking queue' }`
- 400: `{ success: false, message: 'Insufficient lives to join queue' }`

#### POST /api/game/matchmaking/leave
Leave matchmaking queue. Requires authentication.
**Response:** `{ "success": true, "message": "Left matchmaking queue successfully" }`

#### GET /api/game/matchmaking/status
Get matchmaking status for the authenticated user.
**Response:** `{ "success": true, "data": { ...queueData, queueStats } }`

#### GET /api/game/matchmaking/stats
Get overall matchmaking queue stats.
**Response:** `{ "success": true, "data": { "queueStats": { ... } } }`

### Admin (API key required)
#### POST /api/game/admin/force-match
Force a match between two users. Requires API key.
**Request:** `{ "player1Id": "...", "player2Id": "..." }`
**Response:** `{ "success": true, "message": "...", "data": { "match": { ... } } }`

#### POST /api/game/admin/cleanup-queue
Cleanup matchmaking queue. Requires API key.
**Response:** `{ "success": true, "message": "..." }`

---

## Chat Module

### GET /api/chat/rooms
Get all chat rooms for user.
**Query:** `?type=global&page=1&limit=20`
**Response:** `{ "success": true, "message": "...", "data": { "rooms": [ ... ], "total": 10, "page": 1, "limit": 20 } }`

### POST /api/chat/rooms
Create a new chat room (creates a real room in the socket system).
**Request:**
```
{
  "name": "Room Name",
  "description"?: "Optional description",
  "type"?: "private" | "global" | "game" // default: private
}
```
**Response:**
```
{
  "success": true,
  "message": "Chat room created successfully",
  "data": { ...roomFields }
}
```

### DELETE /api/chat/rooms/:roomId
Delete a chat room.
**Response:** `{ "success": true, "message": "...", "data": { "roomId": "...", "deletedBy": "...", "deletedAt": "..." } }`

### POST /api/chat/rooms/:roomId/join
Join a chat room.
**Response:** `{ "success": true, "message": "..." }`

### POST /api/chat/rooms/:roomId/leave
Leave a chat room.
**Response:** `{ "success": true, "message": "..." }`

### GET /api/chat/rooms/:roomId/users
Get users in a chat room.
**Response:** `{ "success": true, "message": "...", "data": { "participants": [ ... ], "spectators": [ ... ] } }`

### GET /api/chat/rooms/:roomId/messages
Get chat history for a room.
**Query:** `?limit=50&offset=0`
**Response:** `{ "success": true, "message": "...", "data": { "roomId": "...", "messages": [ ... ], "total": 50 } }`

### POST /api/chat/rooms/:roomId/messages
Send a message to a room.
**Request:** `{ "message": "string", "messageType"?: "text" | "image" | ... }`
**Response:** `{ "success": true, "message": "...", "data": { "message": { ... } } }`

---

## Friends Module

### GET /api/friends/search
Search users by query.
**Query:** `?q=abc`
**Response:**
```
{
  "success": true,
  "message": "Users found successfully",
  "data": [ { _id, username, email, avatar, level, energySystem } ]
}
```
**Error Responses:**
- 400: `{ "success": false, "message": "Search query is required" }`
- 400: `{ "success": false, "message": "Search query must be at least 2 characters long" }`

### POST /api/friends/request
Send a friend request.
**Request:** `{ "receiverId": "string", "message"?: "string" }`
**Response:**
```
{
  "success": true,
  "message": "Friend request sent successfully",
  "data": { ...friendRequest }
}
```
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid receiver ID" }`
- 400: `{ "success": false, "message": "Cannot send friend request to yourself" }`
- 404: `{ "success": false, "message": "User not found" }`
- 400: `{ "success": false, "message": "You are already friends with this user" }`
- 400: `{ "success": false, "message": "A friend request already exists between you and this user" }`

### GET /api/friends/requests
Get all friend requests for user (sent and received).
**Response:**
```
{
  "success": true,
  "message": "Friend requests retrieved successfully",
  "data": {
    "sent": [ ... ],
    "received": [ ... ]
  }
}
```

### POST /api/friends/requests/:requestId/accept
Accept a friend request.
**Response:**
```
{
  "success": true,
  "message": "Friend request accepted successfully",
  "data": { ...friendRequest }
}
```
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid request ID" }`
- 404: `{ "success": false, "message": "Friend request not found or already processed" }`

### POST /api/friends/requests/:requestId/reject
Reject a friend request.
**Response:** `{ "success": true, "message": "Friend request rejected successfully" }`
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid request ID" }`
- 404: `{ "success": false, "message": "Friend request not found or already processed" }`

### DELETE /api/friends/requests/:requestId
Cancel a sent friend request.
**Response:** `{ "success": true, "message": "Friend request cancelled successfully" }`
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid request ID" }`
- 404: `{ "success": false, "message": "Friend request not found or cannot be cancelled" }`

### POST /api/friends/block/:userId
Block a user.
**Response:** `{ "success": true, "message": "User blocked successfully" }`
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid user ID" }`
- 400: `{ "success": false, "message": "Cannot block yourself" }`
- 404: `{ "success": false, "message": "User not found" }`
- 400: `{ "success": false, "message": "User is already blocked" }`

### DELETE /api/friends/block/:userId
Unblock a user.
**Response:** `{ "success": true, "message": "User unblocked successfully" }`
**Error Responses:**
- 400: `{ "success": false, "message": "Invalid user ID" }`
- 404: `{ "success": false, "message": "User not found" }`
- 400: `{ "success": false, "message": "User is not blocked" }`

### GET /api/friends/blocked
Get all blocked users.
**Response:**
```
{
  "success": true,
  "message": "Blocked users retrieved successfully",
  "data": [ { _id, username, email, avatar } ]
}
```

---

## Notifications Module

### GET /api/notifications
Get all notifications for user.
**Query:** `?page=1&limit=20`
**Response:** `{ "success": true, "data": { "notifications": [ ... ], "total": 10, "page": 1, "limit": 20 } }`

### GET /api/notifications/unread-count
Get unread notification count.
**Response:** `{ "success": true, "data": { "count": 5 } }`

### PATCH /api/notifications/:notificationId/read
Mark a notification as read.
**Response:** `{ "success": true, "message": "Notification marked as read" }`

### PATCH /api/notifications/mark-all-read
Mark all notifications as read.
**Response:** `{ "success": true, "message": "All notifications marked as read" }`

### DELETE /api/notifications/:notificationId
Delete a notification.
**Response:** `{ "success": true, "message": "Notification deleted" }`

### DELETE /api/notifications/read/all
Delete all read notifications.
**Response:** `{ "success": true, "message": "All read notifications deleted" }`

---

## Admin Module (API key or admin required)

### GET /api/admin/stats
Get dashboard stats.
**Response:** `{ "success": true, "data": { ...stats } }`

### GET /api/admin/users
Get all users (paginated).
**Query:** `?page=1&limit=10`
**Response:** `{ "success": true, "data": { "users": [ ... ], "pagination": { ... } } }`

### PUT /api/admin/users/:userId
Update user role/status.
**Request:** `{ "role"?: "admin" | "user", "isActive"?: true | false }`
**Response:** `{ "success": true, "message": "User updated", "data": { ...user } }`

### DELETE /api/admin/users/:userId
Delete a user.
**Response:** `{ "success": true, "message": "User deleted" }`

### GET /api/admin/games
Get all games (paginated).
**Query:** `?page=1&limit=10`
**Response:** `{ "success": true, "data": { "games": [ ... ], "pagination": { ... } } }`

### GET /api/admin/settings
Get system settings.
**Response:** `{ "success": true, "data": { ...settings } }`

### PUT /api/admin/settings
Update system settings.
**Request:** `{ ...settings }`
**Response:** `{ "success": true, "message": "Settings updated", "data": { ...settings } }`

---

**Note:** All endpoints requiring authentication expect an `Authorization: Bearer <token>` header. Replace `...` with actual data as per your application.

---

## Game Module

### POST /api/game/create
Create a new custom game. Requires authentication and at least 1 life.
**Request:**
```
{
  "gameConfig": {
    "gameMode": "classic" | "timed" | "blitz" | "tournament", // optional, default: classic
    "isPrivate": true | false, // optional, default: false
    "maxPlayers": 2, // must be 2
    "timeLimit": 30-3600, // seconds, optional
    "gameName": "string", // optional, min 3 chars
    "password": "string" // optional, min 4 chars if private
  }
}
```
**Response:**
```
{
  "success": true,
  "message": "Custom game created successfully",
  "data": {
    "game": { ... },
    "livesUsed": 1,
    "remainingLives": 4,
    "joinCode": "roomId-if-private-or-null"
  }
}
```
**Real-time:** Registers the game in the socket system for live play. Players joining via socket will receive real-time updates.
**Error Responses:**
- 401: `{ success: false, message: 'Authentication required' }`
- 403: `{ success: false, message: 'Account has been deactivated/blocked' }`
- 400: `{ success: false, message: 'Insufficient lives to create game' }`
- 400: `{ success: false, message: 'Too many active games' }`
- 400: `{ success: false, message: 'Invalid game config fields: ...' }`
- 429: `{ success: false, message: 'Too many custom games created. Please try again later.' }`

### GET /api/game/state/:roomId
Get game state by room ID. Requires authentication.
**Response:**
```
{
  "success": true,
  "message": "Game state fetched successfully",
  "data": { "gameState": { ...full game object... } }
}
```
**Error Responses:**
- 404: `{ success: false, message: 'Game not found' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`

### GET /api/game/active
Get all active games for the authenticated user.
**Response:** `{ success: true, data: { games: [ ... ] } }`

### POST /api/game/forfeit/:roomId
Forfeit a game by room ID. Requires authentication.
**Response:** `{ success: true, message: 'Game forfeited successfully' }`
**Error Responses:**
- 404: `{ success: false, message: 'Game not found' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`

### GET /api/game/stats
Get user game stats and recent games. Requires authentication.
**Response:** `{ success: true, message, data: { stats, recentGames } }`

### GET /api/game/leaderboard
Get leaderboard (supports pagination/timeframe).
**Query:** `?page=1&limit=20&timeframe=all`
**Response:** `{ success: true, message, data: { leaderboard, total, page, limit } }`

### POST /api/game/move/:roomId
Make a move in a game. Requires authentication.
**Request:**
```
{
  "position": 0-8, // for classic
  // or
  "row": 0-2, "col": 0-2 // for 2D board
}
```
**Response:** `{ success: true, message, data: { gameState } }`
**Real-time:** Emits a `game_move` event to all clients in the room via socket with `{ roomId, move, gameState }`.
**Error Responses:**
- 400: `{ success: false, message: 'Invalid move' }`
- 403: `{ success: false, message: 'You are not a player in this game' }`
- 404: `{ success: false, message: 'Game not found' }`

### GET /api/game/history
Get user's game history. Requires authentication.
**Query:** `?page=1&limit=10`
**Response:** `{ success: true, message, data: { games, pagination } }`

### Matchmaking
#### POST /api/game/matchmaking/join
Join matchmaking queue. Requires authentication and at least 1 life.
**Request:** `{ gameMode: "classic" | "timed" | "blitz" | "tournament", skillLevel: 1-10 }`
**Response:** `{ success: true, message, data: { queueStatus } }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid game mode' }`
- 400: `{ success: false, message: 'Skill level must be a number between 1 and 10' }`
- 400: `{ success: false, message: 'Already in matchmaking queue' }`
- 400: `{ success: false, message: 'Insufficient lives to join queue' }`

#### POST /api/game/matchmaking/leave
Leave matchmaking queue. Requires authentication.
**Response:** `{ success: true, message: 'Left matchmaking queue successfully' }`

#### GET /api/game/matchmaking/status
Get matchmaking status for the authenticated user.
**Response:** `{ success: true, data: { ...queueData, queueStats } }`

#### GET /api/game/matchmaking/stats
Get overall matchmaking queue stats.
**Response:** `{ success: true, data: { queueStats } }`

### Admin (API key required)
#### POST /api/game/admin/force-match
Force a match between two users. Requires API key.
**Request:** `{ player1Id, player2Id }`
**Response:** `{ success: true, message, data: { match } }`

#### POST /api/game/admin/cleanup-queue
Cleanup matchmaking queue. Requires API key.
**Response:** `{ success: true, message }`

---

## Chat Module

### GET /api/chat/rooms
Get all chat rooms for user.
**Query:** `?type=global&page=1&limit=20`
**Response:** `{ success, message, data: { rooms, total, page, limit } }`


### POST /api/chat/rooms
Create a new chat room (now creates a real room in the socket system).
**Request:**
```
{
  "name": "Room Name",
  "description": "Optional description",
  "type": "private" // or "global", "game" (default: "private")
}
```
**Response:**
```
{
  "success": true,
  "message": "Chat room created successfully",
  "data": {
    "roomId": "room_room_name_1620000000000",
    "name": "Room Name",
    "type": "private",
    "description": "Optional description",
    "createdBy": "userId",
    "createdAt": "2025-07-21T12:00:00.000Z",
    "members": ["userId"]
  }
}
```

### DELETE /api/chat/rooms/:roomId
Delete a chat room.
**Response:** `{ success, message, data: { roomId, deletedBy, deletedAt } }`

### POST /api/chat/rooms/:roomId/join
Join a chat room.
**Response:** `{ success, message }`

### POST /api/chat/rooms/:roomId/leave
Leave a chat room.
**Response:** `{ success, message }`

### GET /api/chat/rooms/:roomId/users
Get users in a chat room.
**Response:** `{ success, message, data: { participants, spectators } }`

### GET /api/chat/rooms/:roomId/messages
Get chat history for a room.
**Query:** `?limit=50&offset=0`
**Response:** `{ success, message, data: { roomId, messages, total } }`

### POST /api/chat/rooms/:roomId/messages
Send a message to a room.
**Request:** `{ message, messageType? }`
**Response:** `{ success, message, data: { message } }`

### Legacy/Compatibility
#### GET /api/chat/history/:gameId
Get chat history for a game room.
#### POST /api/chat/send
Send a message (legacy route).

---

## Friends Module

### GET /api/friends/search
Search users by query.
**Query:** `?q=abc`
**Response:**
```
{
  "success": true,
  "message": "Users found successfully",
  "data": [ { _id, username, email, avatar, level, energySystem } ]
}
```
**Error Responses:**
- 400: `{ success: false, message: 'Search query is required' }`
- 400: `{ success: false, message: 'Search query must be at least 2 characters long' }`

### POST /api/friends/request
Send a friend request.
**Request:** `{ receiverId, message? }`
**Response:**
```
{
  "success": true,
  "message": "Friend request sent successfully",
  "data": { ...friendRequest }
}
```
**Error Responses:**
- 400: `{ success: false, message: 'Invalid receiver ID' }`
- 400: `{ success: false, message: 'Cannot send friend request to yourself' }`
- 404: `{ success: false, message: 'User not found' }`
- 400: `{ success: false, message: 'You are already friends with this user' }`
- 400: `{ success: false, message: 'A friend request already exists between you and this user' }`

### GET /api/friends/requests
Get all friend requests for user (sent and received).
**Response:**
```
{
  "success": true,
  "message": "Friend requests retrieved successfully",
  "data": {
    "sent": [ ... ],
    "received": [ ... ]
  }
}
```

### POST /api/friends/requests/:requestId/accept
Accept a friend request.
**Response:**
```
{
  "success": true,
  "message": "Friend request accepted successfully",
  "data": { ...friendRequest }
}
```
**Error Responses:**
- 400: `{ success: false, message: 'Invalid request ID' }`
- 404: `{ success: false, message: 'Friend request not found or already processed' }`

### POST /api/friends/requests/:requestId/reject
Reject a friend request.
**Response:** `{ success: true, message: 'Friend request rejected successfully' }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid request ID' }`
- 404: `{ success: false, message: 'Friend request not found or already processed' }`

### DELETE /api/friends/requests/:requestId
Cancel a sent friend request.
**Response:** `{ success: true, message: 'Friend request cancelled successfully' }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid request ID' }`
- 404: `{ success: false, message: 'Friend request not found or cannot be cancelled' }`

### POST /api/friends/block/:userId
Block a user.
**Response:** `{ success: true, message: 'User blocked successfully' }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid user ID' }`
- 400: `{ success: false, message: 'Cannot block yourself' }`
- 404: `{ success: false, message: 'User not found' }`
- 400: `{ success: false, message: 'User is already blocked' }`

### DELETE /api/friends/block/:userId
Unblock a user.
**Response:** `{ success: true, message: 'User unblocked successfully' }`
**Error Responses:**
- 400: `{ success: false, message: 'Invalid user ID' }`
- 404: `{ success: false, message: 'User not found' }`
- 400: `{ success: false, message: 'User is not blocked' }`

### GET /api/friends/blocked
Get all blocked users.
**Response:**
```
{
  "success": true,
  "message": "Blocked users retrieved successfully",
  "data": [ { _id, username, email, avatar } ]
}
```

---

## Notifications Module

### GET /api/notifications
Get all notifications for user.
**Query:** `?page=1&limit=20`
**Response:** `{ success, data: { notifications, total, page, limit } }`

### GET /api/notifications/unread-count
Get unread notification count.
**Response:** `{ success, data: { count } }`

### PATCH /api/notifications/:notificationId/read
Mark a notification as read.
**Response:** `{ success, message }`

### PATCH /api/notifications/mark-all-read
Mark all notifications as read.
**Response:** `{ success, message }`

### DELETE /api/notifications/:notificationId
Delete a notification.
**Response:** `{ success, message }`

### DELETE /api/notifications/read/all
Delete all read notifications.
**Response:** `{ success, message }`

---

## Admin Module (API key or admin required)

### GET /api/admin/stats
Get dashboard stats.
**Response:** `{ success, data: { ...stats } }`

### GET /api/admin/users
Get all users (paginated).
**Query:** `?page=1&limit=10`
**Response:** `{ success, data: { users, pagination } }`

### PUT /api/admin/users/:userId
Update user role/status.
**Request:** `{ role?, isActive? }`
**Response:** `{ success, message, data: { ...user } }`

### DELETE /api/admin/users/:userId
Delete a user.
**Response:** `{ success, message }`

### GET /api/admin/games
Get all games (paginated).
**Query:** `?page=1&limit=10`
**Response:** `{ success, data: { games, pagination } }`

### GET /api/admin/settings
Get system settings.
**Response:** `{ success, data: { ...settings } }`

### PUT /api/admin/settings
Update system settings.
**Request:** `{ ...settings }`
**Response:** `{ success, message, data: { ...settings } }`

---

**Note:** All endpoints requiring authentication expect an `Authorization: Bearer <token>` header. Replace `...` with actual data as per your application.

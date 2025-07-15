# Tic Tac Toe - AI Coding Agent Instructions

## Architecture Overview

This is a full-stack real-time Tic Tac Toe game with separate **backend** (Express.js/TypeScript) and **frontend** (React/TypeScript) applications.

### Backend Structure (`/backend/`)
- **Modular API**: `src/modules/{auth,game,chat}/` with controllers, routes, and services
- **Real-time Features**: Socket.io integration via `SocketManager` class
- **Security**: JWT auth, rate limiting, input validation, helmet security headers
- **Database**: MongoDB with Mongoose models (`src/models/`)
- **Services**: Email, SMS, scheduler services in `src/services/`

### Frontend Structure (`/frontend/`)
- **Context-based State**: React contexts for auth, game, chat, socket management
- **Service Layer**: API clients in `src/services/` that mirror backend modules
- **Component Organization**: Pages, UI components, game-specific components
- **Real-time Updates**: Socket.io client integration

## Critical Development Patterns

### API Integration
- All API calls go through `src/services/api.ts` ApiClient with automatic token refresh
- Service files (`auth.ts`, `game.ts`, `chat.ts`) provide typed API methods
- Response format: `{ success: boolean, message?: string, data?: T }`

### Authentication Flow
```typescript
// Backend: JWT with refresh tokens
POST /api/auth/login → { tokens: { accessToken, refreshToken }, user }

// Frontend: Auto token refresh in axios interceptors
localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
```

### Game State Management
- Backend: Database persistence + Socket.io for real-time updates
- Frontend: React Context + Socket event handlers
- Move validation happens on backend, UI updates via socket events

### Socket Events Pattern
```typescript
// Backend: SocketManager class handles all socket logic
socketManager.getGameSocket().createGame(config)

// Frontend: useSocket hook + context providers
const { socket } = useSocket();
socket.on('gameStateUpdate', handleGameUpdate);
```

## Development Workflows

### Backend Development
```bash
cd backend
npm run dev          # Development with hot reload
npm run build        # TypeScript compilation to dist/
npm test            # Jest test suite
```

### Frontend Development
```bash
cd frontend
npm start           # React dev server
npm run build       # Production build
npm test           # React testing
```

### Environment Setup
- Backend uses `.env` file with required vars: `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`
- Frontend uses `REACT_APP_` prefixed environment variables
- Development assumes MongoDB running on localhost:27017

## Code Conventions

### Error Handling
```typescript
// Backend: Use asyncHandler wrapper + createError utility
export const controller = asyncHandler(async (req, res) => {
  if (!req.user) throw createError.unauthorized('Auth required');
});

// Frontend: Try/catch with toast notifications
try {
  const response = await authAPI.login(credentials);
} catch (error) {
  toast.error(error.response?.data?.message || 'Login failed');
}
```

### Rate Limiting
- Backend: Express-rate-limit middleware on sensitive endpoints
- Pattern: `{operation}RateLimit` exported from controllers, applied in routes

### Validation
- Backend: Express-validator middleware + custom validators
- Frontend: Form validation + TypeScript interfaces for type safety

## Integration Points

### Database Models
- Users: Authentication, profile, energy system, leveling
- Games: Board state, players, moves history, status
- ChatMessages: Room-based messaging with game integration

### External Services
- **Email**: Nodemailer for verification/password reset
- **SMS**: Twilio for notifications (optional)
- **Social Auth**: Passport.js strategies for Google/Facebook

## Key Files for Reference
- Backend API structure: `src/app.routes.ts`
- Socket management: `src/socket/SocketManager.ts`
- Frontend API client: `src/services/api.ts`
- Type definitions: `src/types/index.ts` (both backend/frontend)
- Environment config: `src/config/index.ts` (backend)

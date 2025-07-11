# Tic Tac Toe Frontend

This is the professional React + Tailwind CSS frontend for the Tic Tac Toe backend.

## Features

- Modern UI with Tailwind CSS and icons
- Authentication (register, login, forgot/reset password, email verification)
- Real-time multiplayer Tic Tac Toe with Socket.io
- Game lobby, matchmaking, and leaderboard
- Chat system for games
- Profile and settings management
- Context API for state management

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

The app will run at [http://localhost:3000](http://localhost:3000) and proxy API requests to the backend at [http://localhost:5000](http://localhost:5000).

### 3. Build for production

```bash
npm run build
```

## Folder Structure

- `src/contexts` — Context API providers for Auth, Game, Socket, etc.
- `src/pages` — Main pages (auth, dashboard, game, leaderboard, profile, settings)
- `src/components` — UI components and layout
- `src/services` — API and socket services
- `src/types` — TypeScript types
- `src/constants` — App constants

## Environment Variables

Create a `.env` file for custom API URLs if needed:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

For backend API endpoints and features, see the backend README.

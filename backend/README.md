# Tic Tac Toe Backend API

A comprehensive Node.js/Express backend for a multiplayer Tic Tac Toe game with real-time features, user authentication, matchmaking, and chat functionality.

## 🚀 Features

### Authentication & Security
- **User Registration & Login** with email verification
- **Social Authentication** (Google, Facebook, Twitter, Instagram)
- **JWT-based Authentication** with refresh tokens
- **Password Reset** functionality with secure tokens
- **Rate Limiting** and **Security Headers**
- **Input Validation & Sanitization**

### Game Features
- **Real-time Multiplayer** Tic Tac Toe
- **Matchmaking System** with queue management
- **Game Statistics** and **Leaderboards**
- **Energy System** with regeneration
- **Game History** and **Analytics**

### Communication
- **Real-time Chat** with Socket.io
- **Game Notifications** via email
- **WebSocket Events** for live updates

### Administration
- **Health Monitoring**
- **Metrics & Analytics**
- **Admin API Endpoints**
- **Comprehensive Logging**

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + Passport.js
- **Real-time**: Socket.io
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest
- **Validation**: Express Validator

## 📋 Prerequisites

- Node.js 16+ 
- MongoDB 4.4+
- NPM or Yarn
- SMTP Email Service (Gmail, SendGrid, etc.)

## ⚙️ Installation & Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/tic_tac_toe

# JWT Secrets (Use strong, random strings in production)
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration (Required for email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@tictactoe.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Social Authentication (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

TWITTER_CONSUMER_KEY=your-twitter-consumer-key
TWITTER_CONSUMER_SECRET=your-twitter-consumer-secret

INSTAGRAM_CLIENT_ID=your-instagram-client-id
INSTAGRAM_CLIENT_SECRET=your-instagram-client-secret

# Twilio SMS (Optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-phone

# Security
ADMIN_API_KEY=your-admin-api-key-change-in-production
BCRYPT_ROUNDS=12

# Game Configuration
MAX_ENERGY=5
ENERGY_REGEN_TIME=90
ENERGY_PER_GAME=1
```

### 3. Database Setup

Start MongoDB and create the database:
```bash
# Start MongoDB (if installed locally)
mongod

# Or use MongoDB Atlas cloud database
# Update MONGO_URI in .env with your Atlas connection string
```

### 4. Build and Start

```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
```

## 🧪 Testing the API

### Automated Testing
```bash
# Run the comprehensive API test
node test-api.js

# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Manual Testing with Postman

1. Import the Postman collection: `postman_collection_complete.json`
2. Set the `baseUrl` variable to `http://localhost:5000`
3. Test endpoints in this order:
   - Health Check
   - Register a user
   - Login (saves token automatically)
   - Test protected endpoints

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/verify-email` | Verify email with code | No |
| POST | `/api/auth/resend-verification` | Resend verification email | No |
| POST | `/api/auth/request-password-reset` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| POST | `/api/auth/refresh-token` | Refresh access token | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| PATCH | `/api/auth/profile` | Update user profile | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |
| POST | `/api/auth/logout` | Logout current session | Yes |
| POST | `/api/auth/logout-all` | Logout all sessions | Yes |
| DELETE | `/api/auth/account` | Delete user account | Yes |

### Game Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/game/create` | Create new game | Yes |
| POST | `/api/game/move/:roomId` | Make a move | Yes |
| GET | `/api/game/state/:roomId` | Get game state | Yes |
| GET | `/api/game/active` | Get active games | Yes |
| POST | `/api/game/forfeit/:roomId` | Forfeit game | Yes |
| GET | `/api/game/stats` | Get user statistics | Yes |
| GET | `/api/game/leaderboard` | Get leaderboard | Yes |

### Matchmaking Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/game/matchmaking/join` | Join matchmaking queue | Yes |
| POST | `/api/game/matchmaking/leave` | Leave matchmaking queue | Yes |
| GET | `/api/game/matchmaking/status` | Get queue status | Yes |
| GET | `/api/game/matchmaking/stats` | Get queue statistics | Yes |

### Chat Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/chat/send` | Send message | Yes |
| GET | `/api/chat/history/:roomId` | Get chat history | Yes |
| POST | `/api/chat/join` | Join chat room | Yes |
| POST | `/api/chat/leave` | Leave chat room | Yes |
| GET | `/api/chat/rooms` | Get available rooms | Yes |
| GET | `/api/chat/rooms/:roomId/users` | Get room users | Yes |

### System Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| GET | `/metrics` | System metrics | No |
| GET | `/api/` | API information | No |

## 🔌 WebSocket Events

### Connection Events
- `connect` - Client connected
- `disconnect` - Client disconnected
- `authenticate` - Authenticate socket connection

### Game Events
- `game:join` - Join a game room
- `game:move` - Make a move
- `game:state` - Game state update
- `game:end` - Game ended

### Matchmaking Events
- `matchmaking:join` - Join queue
- `matchmaking:leave` - Leave queue
- `matchmaking:found` - Match found
- `matchmaking:status` - Queue status update

### Chat Events
- `chat:join` - Join chat room
- `chat:leave` - Leave chat room
- `chat:message` - Send/receive message
- `chat:typing` - Typing indicator

## 🔧 Configuration Options

### Game Settings
```javascript
ENERGY_CONFIG: {
  MAX_ENERGY: 5,           // Maximum energy points
  ENERGY_REGEN_TIME: 90,   // Minutes between energy regeneration
  ENERGY_PER_GAME: 1       // Energy cost per game
}

LEVELING_CONFIG: {
  BASE_XP: 100,            // Base XP for level 1
  XP_PER_WIN: 50,          // XP gained for winning
  XP_PER_DRAW: 20,         // XP gained for draw
  XP_PER_LOSS: 10,         // XP gained for losing
  LEVEL_MULTIPLIER: 1.5    // XP multiplier per level
}
```

### Security Settings
```javascript
SECURITY: {
  BCRYPT_ROUNDS: 12,       // Password hashing rounds
  MAX_LOGIN_ATTEMPTS: 5,   // Max failed login attempts
  LOCK_TIME: 3600000,      // Account lock time (1 hour)
  PASSWORD_MIN_LENGTH: 8   // Minimum password length
}

RATE_LIMIT: {
  WINDOW_MS: 900000,       // Rate limit window (15 minutes)
  MAX_REQUESTS: 100        // Max requests per window
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:27017
   ```
   - Ensure MongoDB is running
   - Check MONGO_URI in .env
   - Verify network connectivity

2. **Email Service Error**
   ```
   Error: Invalid login credentials
   ```
   - Check EMAIL_USER and EMAIL_PASS
   - Use app-specific password for Gmail
   - Verify SMTP settings

3. **JWT Token Issues**
   ```
   Error: Invalid or expired token
   ```
   - Check JWT_SECRET is set
   - Verify token format in Authorization header
   - Check token expiration time

4. **Socket Connection Failed**
   ```
   Error: WebSocket connection failed
   ```
   - Verify CORS settings
   - Check FRONTEND_URL configuration
   - Ensure Socket.io client compatibility

### Debug Mode

Enable debug logging:
```env
NODE_ENV=development
DEBUG=*
```

### Health Check

Monitor server health:
```bash
curl http://localhost:5000/health
```

## 📦 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use strong, unique secrets for JWT_SECRET
3. Configure production database (MongoDB Atlas)
4. Set up SSL/TLS certificates
5. Configure reverse proxy (Nginx)
6. Enable logging and monitoring

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Performance Optimization
- Enable MongoDB indexing
- Configure connection pooling
- Set up caching (Redis)
- Enable gzip compression
- Configure CDN for static assets

## 🔒 Security Considerations

- Use HTTPS in production
- Implement CSRF protection
- Set secure cookie options
- Regular security audits
- Keep dependencies updated
- Monitor for suspicious activity
- Implement proper logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Run the automated tests
4. Check server logs for errors
5. Create an issue with detailed information

---

**Note**: This backend is designed to work with the corresponding React frontend. Make sure both applications are properly configured and running for the complete gaming experience.
- Rate limiting and security middleware
- Email and SMS notifications

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/tic-tac-toe-backend.git
   ```
2. Navigate to the project directory:
   ```bash
   cd tic-tac-toe-backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables
Create `.env` files for different environments (`.env`, `.env.development`, `.env.testing`) and set the following variables:
- `MONGO_URI`
- `JWT_SECRET`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `PASSPORT_GOOGLE_CLIENT_ID`, `PASSPORT_GOOGLE_CLIENT_SECRET`
- `PASSPORT_FACEBOOK_CLIENT_ID`, `PASSPORT_FACEBOOK_CLIENT_SECRET`
- `PASSPORT_TWITTER_CONSUMER_KEY`, `PASSPORT_TWITTER_CONSUMER_SECRET`
- `PASSPORT_INSTAGRAM_CLIENT_ID`, `PASSPORT_INSTAGRAM_CLIENT_SECRET`

## Scripts
- `npm run dev`: Start the development server
- `npm run build`: Build the project
- `npm start`: Start the production server
- `npm test`: Run tests

## Project Structure
```
backend/
├── src/
│   ├── config/
│   ├── models/
│   ├── middlewares/
│   ├── modules/
│   ├── services/
│   ├── socket/
│   ├── types/
│   ├── utils/
│   └── tests/
├── dist/
├── logs/
├── .env
├── .env.development
├── .env.testing
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## License
This project is licensed under the ISC License.

# Tic Tac Toe Multiplayer Backend

## Overview
This is the backend for a multiplayer Tic Tac Toe game built with Node.js, TypeScript, and MongoDB. It provides APIs for user authentication, game management, chat functionality, and matchmaking.

## Features
- User authentication (login, registration, social login)
- Game management (create, join, play, forfeit games)
- Chat functionality (send and receive messages)
- Matchmaking system
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

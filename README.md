# Tic Tac Toe - Full Stack Real-time Game

A modern, full-stack Tic Tac Toe game with real-time multiplayer functionality, social authentication, and comprehensive user management.

## 🚀 Live Demo

- **Frontend**: [Deploy on Netlify](https://netlify.com) (See [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md))
- **Backend**: https://tic-tac-toe-uf5h.onrender.com

## ✨ Features

- **Real-time Multiplayer**: Play against other players in real-time
- **Social Authentication**: Login with Google, Facebook
- **User Management**: Profiles, statistics, energy system
- **Chat System**: In-game messaging
- **Responsive Design**: Works on desktop and mobile
- **Game Modes**: Classic, Blitz, Ranked matches
- **Energy System**: Strategic gameplay with energy management

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Socket.io Client** for real-time communication
- **React Hook Form** + **Yup** for form validation
- **React Router** for navigation
- **Axios** for API calls

### Backend
- **Node.js** + **Express** with TypeScript
- **MongoDB** with Mongoose
- **Socket.io** for real-time features
- **JWT Authentication** with refresh tokens
- **Passport.js** for social auth
- **Express Rate Limiting** for security

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nisar001/Tic_Tac_Toe.git
   cd Tic_Tac_Toe
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your .env file
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## 📦 Deployment

### Frontend (Netlify)
See detailed guide: [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)

### Backend (Render)
Backend is deployed on Render: https://tic-tac-toe-uf5h.onrender.com

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
```

**Backend (.env)**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/tictactoe
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

## 📱 Features Detail

### Authentication
- Email/Password registration and login
- Social authentication (Google, Facebook)
- Email verification
- Password reset functionality
- JWT with refresh token rotation

### Game Features
- Real-time multiplayer gameplay
- Game rooms and matchmaking
- Spectator mode
- Game history and statistics
- Different game modes and difficulties

### User Management
- User profiles with avatars
- Statistics tracking
- Energy system for strategic gameplay
- Friend system
- Leaderboards

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Developer**: [Nisar001](https://github.com/Nisar001)

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the deployment guides
- Review the API documentation
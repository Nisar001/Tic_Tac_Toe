import { Router } from 'express';
import authRoutes from './modules/auth/routes/auth.routes';
import gameRoutes from './modules/game/routes/game.routes';
import chatRoutes from './modules/chat/routes/chat.routes';

const router = Router();

// API version
router.get('/', (req, res) => {
  res.json({
    message: 'Tic Tac Toe API v1.0.0',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      game: '/api/game',
      chat: '/api/chat',
      health: '/health'
    }
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Game routes
router.use('/game', gameRoutes);

// Chat routes
router.use('/chat', chatRoutes);

export default router;
import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from './modules/auth/routes/auth.routes';
import gameRoutes from './modules/game/routes/game.routes';
import chatRoutes from './modules/chat/routes/chat.routes';
import { logInfo, logWarn } from './utils/logger';
import { authenticate } from './middlewares/auth.middleware';

const router = Router();

// Simple request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logInfo(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.ip}`);
  });
  
  next();
};

// Request logging middleware for API routes
router.use(requestLogger);

// Health check endpoint for Render
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version and documentation endpoint
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiInfo = {
      message: 'Tic Tac Toe API v1.0.0',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        auth: '/api/auth',
        game: '/api/game',
        chat: '/api/chat',
        health: '/health',
        metrics: '/metrics'
      },
      documentation: {
        authEndpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/logout',
          'POST /api/auth/refresh',
          'POST /api/auth/forgot-password',
          'POST /api/auth/reset-password',
          'GET /api/auth/profile',
          'PUT /api/auth/profile',
          'DELETE /api/auth/account'
        ],
        gameEndpoints: [
          'GET /api/game/active',
          'POST /api/game/create',
          'POST /api/game/:id/join',
          'POST /api/game/:id/move',
          'GET /api/game/:id',
          'GET /api/game/leaderboard'
        ],
        chatEndpoints: [
          'GET /api/chat/history/:gameId',
          'POST /api/chat/send',
          'GET /api/chat/rooms/:roomId/users'
        ]
      }
    };
    
    res.status(200).json(apiInfo);
    logInfo(`API info requested from IP: ${req.ip}`);
  } catch (error) {
    logWarn(`Error serving API info: ${error}`);
    next(error);
  }
});

// Auth routes (public)
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.use('/game', authenticate, gameRoutes);
router.use('/chat', authenticate, chatRoutes);

// Catch-all for undefined API routes
router.use('*', (req: Request, res: Response) => {
  logWarn(`Attempted access to undefined route: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: ['/auth', '/game', '/chat']
  });
});

export default router;
import { Router, Request, Response, NextFunction } from 'express';
import authRoutes from './modules/auth/routes/auth.routes';
import gameRoutes from './modules/game/routes/game.routes';
import chatRoutes from './modules/chat/routes/chat.routes';
import chatSocketRoutes from './modules/chat/routes/chat.socket.routes';
import chatRealtimeRoutes from './modules/chat/routes/chat.realtime.routes';
import friendsUnifiedRoutes from './modules/friends/routes/friends.unified';
import { notificationsRoutes } from './modules/notifications';
import { adminRoutes } from './modules/admin';
import { logInfo, logWarn } from './utils/logger';
import { authenticate } from './middlewares/auth.middleware';

const router = Router();

// Simple request logging middleware
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Only log requests in development mode, except for health checks
  if (process.env.NODE_ENV === 'development' && !req.originalUrl.includes('/health')) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logInfo(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    });
  }
  
  next();
};

// Request logging middleware for API routes
router.use(requestLogger);

// Handle preflight OPTIONS requests explicitly
router.options('*', (req: Request, res: Response) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Timestamp, Cache-Control, Pragma, Expires, If-Modified-Since, If-None-Match');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  res.sendStatus(200);
});

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
        'chat-socket': '/api/chat-socket',
        'chat-realtime': '/api/chat-realtime',
        friends: '/api/friends',
        notifications: '/api/notifications',
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
          'GET /api/chat/rooms/:roomId/users',
          'POST /api/chat-socket/socket/rooms',
          'GET /api/chat-socket/socket/rooms/available',
          'POST /api/chat-socket/socket/rooms/:roomId/join',
          'POST /api/chat-socket/socket/send',
          'POST /api/chat-realtime/rooms',
          'GET /api/chat-realtime/rooms/available',
          'POST /api/chat-realtime/message',
          'POST /api/chat-realtime/game/room'
        ],
        friendsEndpoints: [
          'GET /api/friends',
          'GET /api/friends/requests',
          'GET /api/friends/requests/sent',
          'POST /api/friends/request',
          'PUT /api/friends/request/:requestId/accept',
          'DELETE /api/friends/request/:requestId/reject',
          'DELETE /api/friends/:friendId',
          'GET /api/friends/search',
          'GET /api/friends/health',
          'GET /api/friends/stats'
        ],
        notificationsEndpoints: [
          'GET /api/notifications',
          'GET /api/notifications/unread-count',
          'PATCH /api/notifications/:notificationId/read',
          'PATCH /api/notifications/mark-all-read',
          'DELETE /api/notifications/:notificationId',
          'DELETE /api/notifications/read/all'
        ],
        adminEndpoints: [
          'GET /api/admin/stats',
          'GET /api/admin/users',
          'GET /api/admin/games',
          'PUT /api/admin/users/:userId',
          'DELETE /api/admin/users/:userId',
          'GET /api/admin/settings',
          'PUT /api/admin/settings'
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
router.use('/game', authenticate as any, gameRoutes);
router.use('/chat', authenticate as any, chatRoutes);
router.use('/chat-socket', authenticate as any, chatSocketRoutes);
router.use('/chat-realtime', authenticate as any, chatRealtimeRoutes);
// Unified friends routes
router.use('/friends', friendsUnifiedRoutes);
router.use('/notifications', authenticate as any, notificationsRoutes);
router.use('/admin', authenticate as any, adminRoutes);

// Catch-all for undefined API routes
router.use('*', (req: Request, res: Response) => {
  logWarn(`Attempted access to undefined route: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: ['/auth', '/game', '/chat', '/chat-socket', '/chat-realtime', '/friends', '/notifications', '/admin']
  });
});

export default router;

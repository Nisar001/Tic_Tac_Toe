import { Router, Request, Response, NextFunction } from 'express';

// Import controllers
import {
  getGameState,
  getActiveGames,
  createCustomGame,
  getUserGameStats,
  getLeaderboard,
  forfeitGame,
  makeMove
} from '../controllers';

import {
  joinQueue,
  leaveQueue,
  getMatchmakingStatus,
  getQueueStats,
  forceMatch,
  cleanupQueue
} from '../controllers/matchmaking.controller';

// Import middleware
import { authenticate, checkEnergy } from '../../../middlewares/auth.middleware';
import {
  validateGameMove,
  validateGameId,
  validatePagination,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import { Request as ExpressRequest } from 'express';
import {
  gameCreationRateLimit,
  createDynamicRateLimit
} from '../../../middlewares/rateLimiting.middleware';
import { validateApiKey } from '../../../middlewares/security.middleware';
import { logWarn } from '../../../utils/logger';
import { IUser } from '../../../models/user.model';

const router = Router();
// Patch Express Request type to include user property from user.model
declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
  }
}

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Game management routes
router.post('/create',
  gameCreationRateLimit,
  checkEnergy(1),
  asyncHandler(createCustomGame)
);

router.get('/state/:roomId',
  validateGameId,
  handleValidationErrors,
  asyncHandler(getGameState)
);

router.get('/active',
  asyncHandler(getActiveGames)
);

router.post('/forfeit/:roomId',
  validateGameId,
  handleValidationErrors,
  asyncHandler(forfeitGame)
);

router.get('/stats',
  asyncHandler(getUserGameStats)
);

router.get('/leaderboard',
  validatePagination,
  handleValidationErrors,
  asyncHandler(getLeaderboard)
);

// Matchmaking routes
router.post('/matchmaking/join',
  createDynamicRateLimit(10, 60 * 1000), // 10 requests per minute
  checkEnergy(1),
  asyncHandler(joinQueue)
);

router.post('/matchmaking/leave',
  asyncHandler(leaveQueue)
);

router.get('/matchmaking/status',
  asyncHandler(getMatchmakingStatus)
);

router.get('/matchmaking/stats',
  asyncHandler(getQueueStats)
);

// Admin routes (protected with API key validation)
router.post('/admin/force-match',
  validateApiKey,
  asyncHandler(forceMatch)
);

router.post('/admin/cleanup-queue',
  validateApiKey,
  asyncHandler(cleanupQueue)
);

// Move route
router.post('/move/:roomId',
  validateGameMove,
  validateGameId,
  handleValidationErrors,
  asyncHandler(makeMove)
);

// Catch-all for undefined game routes
router.use('*', (req: Request, res: Response) => {
  logWarn(`Attempted access to undefined game route: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'Game endpoint not found',
    availableEndpoints: [
      '/create', '/state/:roomId', '/active', '/forfeit/:roomId', 
      '/stats', '/leaderboard', '/matchmaking/*'
    ]
  });
});

export default router;

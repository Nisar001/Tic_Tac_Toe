import { Router } from 'express';

// Import controllers
import {
  getGameState,
  getActiveGames,
  createCustomGame,
  getUserGameStats,
  getLeaderboard,
  forfeitGame
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
import {
  gameCreationRateLimit,
  createDynamicRateLimit
} from '../../../middlewares/rateLimiting.middleware';

const router = Router();

// All game routes require authentication
router.use(authenticate);

// Game management routes
router.post('/create',
  gameCreationRateLimit,
  checkEnergy(1),
  createCustomGame
);

router.get('/state/:roomId',
  validateGameId,
  handleValidationErrors,
  getGameState
);

router.get('/active',
  getActiveGames
);

router.post('/forfeit/:roomId',
  validateGameId,
  handleValidationErrors,
  forfeitGame
);

router.get('/stats',
  getUserGameStats
);

router.get('/leaderboard',
  validatePagination,
  handleValidationErrors,
  getLeaderboard
);

// Matchmaking routes
router.post('/matchmaking/join',
  createDynamicRateLimit(10, 60 * 1000), // 10 requests per minute
  checkEnergy(1),
  joinQueue
);

router.post('/matchmaking/leave',
  leaveQueue
);

router.get('/matchmaking/status',
  getMatchmakingStatus
);

router.get('/matchmaking/stats',
  getQueueStats
);

// Admin routes (should be protected with admin middleware in production)
router.post('/admin/force-match',
  forceMatch
);

router.post('/admin/cleanup-queue',
  cleanupQueue
);

export default router;

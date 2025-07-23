import { Router, Request, Response } from 'express';
import { logError } from '../../../utils/logger';

// Import controllers
import {
  getUserGameStats,
  getLeaderboard,
  createGameRoom,
  joinGameRoom,
  getAvailableRooms,
  getGameRoom,
  leaveGameRoom,
  makeGameMove,
  forfeitGame,
  getGameState,
  getUserActiveGames,
  joinQueue,
  leaveQueue,
  getMatchmakingStatus,
  getQueueStats,
  forceMatch,
  cleanupQueue
} from '../controllers';

// Import middleware
import { authenticate, checkLives } from '../../../middlewares/auth.middleware';
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
import { validateApiKey } from '../../../middlewares/security.middleware';
import { asyncHandler } from '../../../middlewares/error.middleware';
import { IUser } from '../../../models/user.model';

/**
 * Game Routes
 * 
 * Available endpoints:
 * - POST /rooms, /create, /createGame - Create new game room
 * - GET /rooms - Get available rooms  
 * - POST /rooms/:roomId/join, /join/:gameId - Join game
 * - POST /rooms/:roomId/move, /move - Make game move
 * - GET /rooms/:roomId/state, /state/:gameId - Get game state
 * - GET /active-games - Get user's active games
 * - GET /stats - Get user statistics
 * - GET /leaderboard - Get leaderboard
 * - POST /matchmaking/join - Join matchmaking queue
 * - POST /matchmaking/leave - Leave matchmaking queue
 */

const router = Router();

// Apply authentication to all routes
router.use(authenticate as any);

// User statistics routes
router.get('/stats',
  asyncHandler(getUserGameStats)
);

// Get user's active games
router.get('/active-games',
  asyncHandler(getUserActiveGames)
);

router.get('/leaderboard',
  validatePagination,
  handleValidationErrors,
  asyncHandler(getLeaderboard)
);

// Game room management routes
router.post('/rooms',
  gameCreationRateLimit,
  checkLives(1) as any,
  asyncHandler(createGameRoom)
);

// Alias for game creation (common frontend expectations)
router.post('/create',
  gameCreationRateLimit,
  checkLives(1) as any,
  asyncHandler(createGameRoom)
);

router.post('/createGame',
  gameCreationRateLimit,
  checkLives(1) as any,
  asyncHandler(createGameRoom)
);

router.get('/rooms',
  asyncHandler(getAvailableRooms)
);

router.get('/rooms/:roomId',
  validateGameId,
  handleValidationErrors,
  asyncHandler(getGameRoom)
);

router.post('/rooms/:roomId/join',
  validateGameId,
  handleValidationErrors,
  checkLives(1) as any,
  asyncHandler(joinGameRoom)
);

// Alias for joining games
router.post('/join/:gameId',
  validateGameId,
  handleValidationErrors,
  checkLives(1) as any,
  asyncHandler(joinGameRoom)
);

router.post('/rooms/:roomId/leave',
  validateGameId,
  handleValidationErrors,
  asyncHandler(leaveGameRoom)
);

// Game move routes
router.post('/rooms/:roomId/move',
  validateGameMove,
  validateGameId,
  handleValidationErrors,
  asyncHandler(makeGameMove)
);

// Alias for making moves
router.post('/move',
  validateGameMove,
  handleValidationErrors,
  asyncHandler(makeGameMove)
);

router.post('/rooms/:roomId/forfeit',
  validateGameId,
  handleValidationErrors,
  asyncHandler(forfeitGame)
);

router.get('/rooms/:roomId/state',
  validateGameId,
  handleValidationErrors,
  asyncHandler(getGameState)
);

// Alias for getting game state
router.get('/state/:gameId',
  validateGameId,
  handleValidationErrors,
  asyncHandler(getGameState)
);

// Matchmaking routes
router.post('/matchmaking/join',
  createDynamicRateLimit(10, 60 * 1000), // 10 requests per minute
  checkLives(1) as any,
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

// Game history route
router.get('/history',
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user as IUser;
    
    try {
      const Game = require('../../../models/game.model').default;
      
      const games = await Game.find({
        $or: [
          { 'players.player1': user._id },
          { 'players.player2': user._id }
        ]
      })
      .sort({ startedAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('players.player1', 'username')
      .populate('players.player2', 'username');

      const total = await Game.countDocuments({
        $or: [
          { 'players.player1': user._id },
          { 'players.player2': user._id }
        ]
      });

      const totalPages = Math.ceil(total / Number(limit));

      res.status(200).json({
        success: true,
        message: 'Game history retrieved successfully',
        data: {
          games,
          pagination: {
            currentPage: Number(page),
            totalPages,
            totalGames: total,
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1
          }
        }
      });
    } catch (error) {
      logError(`Error fetching game history: ${error instanceof Error ? error.message : error}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch game history'
      });
    }
  })
);

export default router;

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

// Game history route
router.get('/history',
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const user = req.user as IUser;
    
    try {
      // Import Game model here to avoid circular dependency
      const { Game } = require('../../../models/game.model');
      
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

      res.json({
        success: true,
        message: 'Game history retrieved successfully',
        data: {
          games,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve game history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Join game route
router.post('/join/:roomId',
  validateGameId,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const user = req.user as IUser;
    
    try {
      // Import Game model here to avoid circular dependency
      const { Game } = require('../../../models/game.model');
      
      const game = await Game.findOne({ room: roomId });
      
      if (!game) {
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }

      // Check if game is full
      if (game.players.player1 && game.players.player2) {
        return res.status(400).json({
          success: false,
          message: 'Game is already full'
        });
      }

      // Check if user is already in this game
      if (game.players.player1?.toString() === user._id.toString() || 
          game.players.player2?.toString() === user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'You are already in this game'
        });
      }

      // Join as player2 if player1 is taken, or player1 if player2 is taken
      if (!game.players.player2) {
        game.players.player2 = user._id;
      } else if (!game.players.player1) {
        game.players.player1 = user._id;
      }

      // Start the game if both players are present
      if (game.players.player1 && game.players.player2) {
        game.status = 'active';
      }

      await game.save();

      res.json({
        success: true,
        message: 'Successfully joined game',
        data: {
          gameId: game._id,
          roomId: game.room,
          players: game.players,
          status: game.status
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to join game',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
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

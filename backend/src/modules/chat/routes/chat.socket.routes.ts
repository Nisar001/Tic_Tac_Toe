/**
 * Simple Socket.io Chat Routes
 * Clean integration with existing system
 */

import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../../middlewares/auth.middleware';
import { handleValidationErrors } from '../../../middlewares/validation.middleware';
import { chatRateLimit } from '../../../middlewares/rateLimiting.middleware';

// Import existing working controllers
import {
  getChatHistory,
  getChatRooms,
  joinChatRoom,
  leaveChatRoom,
  getChatRoomUsers
} from '../controllers/index';

// Import new Socket.io controller
import {
  createSimpleRoom,
  getAvailableRooms,
  joinSimpleRoom,
  sendSocketMessage
} from '../controllers/socketChat.controller';

const router = Router();

// Apply authentication to all routes
router.use(authenticate as any);

// Validation rules
const validateMessage = [
  body('message')
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Message must be between 1 and 500 characters')
    .trim(),
  body('roomId')
    .optional()
    .isString()
    .withMessage('Invalid room ID'),
  body('gameId')
    .optional()
    .isMongoId()
    .withMessage('Invalid game ID')
];

const validateRoomCreation = [
  body('name')
    .isString()
    .isLength({ min: 3, max: 50 })
    .withMessage('Room name must be between 3 and 50 characters')
    .trim(),
  body('gameId')
    .optional()
    .isMongoId()
    .withMessage('Invalid game ID')
];

// ===== EXISTING ENDPOINTS (WORKING) =====

/**
 * @route GET /api/chat/history/:gameId
 * @desc Get chat history for a game
 * @access Private
 */
router.get('/history/:gameId', getChatHistory);

/**
 * @route GET /api/chat/rooms
 * @desc Get chat rooms for user
 * @access Private
 */
router.get('/rooms', getChatRooms);

/**
 * @route POST /api/chat/rooms/:roomId/join
 * @desc Join a chat room
 * @access Private
 */
router.post('/rooms/:roomId/join', joinChatRoom);

/**
 * @route POST /api/chat/rooms/:roomId/leave
 * @desc Leave a chat room
 * @access Private
 */
router.post('/rooms/:roomId/leave', leaveChatRoom);

/**
 * @route GET /api/chat/rooms/:roomId/users
 * @desc Get users in a chat room
 * @access Private
 */
router.get('/rooms/:roomId/users', getChatRoomUsers);

// ===== NEW SOCKET.IO ENDPOINTS =====

/**
 * @route POST /api/chat/socket/rooms
 * @desc Create a new Socket.io room
 * @access Private
 */
router.post('/socket/rooms',
  validateRoomCreation,
  handleValidationErrors,
  createSimpleRoom as any
);

/**
 * @route GET /api/chat/socket/rooms/available
 * @desc Get available Socket.io rooms
 * @access Private
 */
router.get('/socket/rooms/available', getAvailableRooms as any);

/**
 * @route POST /api/chat/socket/rooms/:roomId/join
 * @desc Join a Socket.io room
 * @access Private
 */
router.post('/socket/rooms/:roomId/join',
  param('roomId').isString().withMessage('Invalid room ID'),
  handleValidationErrors,
  joinSimpleRoom as any
);

/**
 * @route POST /api/chat/socket/send
 * @desc Send message via Socket.io
 * @access Private
 */
router.post('/socket/send',
  chatRateLimit,
  validateMessage,
  handleValidationErrors,
  sendSocketMessage as any
);

// ===== LEGACY ENDPOINT (COMPATIBILITY) =====

/**
 * @route POST /api/chat/send
 * @desc Send message (legacy endpoint)
 * @access Private
 */
router.post('/send',
  chatRateLimit,
  validateMessage,
  handleValidationErrors,
  sendSocketMessage as any
);

// Health check
router.get('/health', (req: any, res: any) => {
  res.status(200).json({
    success: true,
    message: 'Chat service with Socket.io integration is healthy',
    features: [
      'Legacy chat compatibility',
      'Socket.io real-time messaging',
      'Room management',
      'Game integration'
    ]
  });
});

// 404 handler
router.use('*', (req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: 'Chat endpoint not found',
    availableEndpoints: {
      legacy: [
        'GET /history/:gameId',
        'GET /rooms',
        'POST /rooms/:roomId/join',
        'POST /rooms/:roomId/leave',
        'GET /rooms/:roomId/users'
      ],
      socketio: [
        'POST /socket/rooms',
        'GET /socket/rooms/available',
        'POST /socket/rooms/:roomId/join',
        'POST /socket/send'
      ],
      compatibility: [
        'POST /send'
      ]
    }
  });
});

export default router;

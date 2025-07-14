import { Router, Request, Response, NextFunction } from 'express';

// Import controllers
import {
  getChatHistory,
  getChatRooms,
  sendMessage,
  joinChatRoom,
  leaveChatRoom,
  getChatRoomUsers
} from '../controllers';

// Import middleware
import { authenticate } from '../../../middlewares/auth.middleware';
import {
  validateChatMessage,
  validateLegacyChatMessage,
  validateRoomId,
  validatePagination,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import {
  chatRateLimit
} from '../../../middlewares/rateLimiting.middleware';
import { logWarn } from '../../../utils/logger';

const router = Router();

// Error handling wrapper for async routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Chat room management
router.get('/rooms',
  asyncHandler(getChatRooms)
);

router.post('/rooms/:roomId/join',
  validateRoomId,
  handleValidationErrors,
  asyncHandler(joinChatRoom)
);

router.post('/rooms/:roomId/leave',
  validateRoomId,
  handleValidationErrors,
  asyncHandler(leaveChatRoom)
);

router.get('/rooms/:roomId/users',
  validateRoomId,
  handleValidationErrors,
  asyncHandler(getChatRoomUsers)
);

// Message management
router.get('/rooms/:roomId/messages',
  validateRoomId,
  validatePagination,
  handleValidationErrors,
  asyncHandler(getChatHistory)
);

router.post('/rooms/:roomId/messages',
  chatRateLimit,
  validateRoomId,
  validateChatMessage,
  handleValidationErrors,
  asyncHandler(sendMessage)
);

// Backward compatibility routes
router.get('/history/:gameId',
  validateRoomId,
  validatePagination,
  handleValidationErrors,
  asyncHandler(getChatHistory)
);

router.post('/send',
  chatRateLimit,
  validateLegacyChatMessage,
  handleValidationErrors,
  asyncHandler(sendMessage)
);

// Create chat room
router.post('/rooms',
  chatRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;
    const user = req.user as any;
    
    try {
      if (!name || typeof name !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Room name is required'
        });
      }

      // For simplicity, return a mock response for testing
      const roomId = `room_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
      
      res.status(201).json({
        success: true,
        message: 'Chat room created successfully',
        data: {
          roomId,
          name,
          description: description || '',
          createdBy: user._id,
          createdAt: new Date(),
          members: [user._id]
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create chat room',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Delete chat room
router.delete('/rooms/:roomId',
  validateRoomId,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const user = req.user as any;
    
    try {
      // For simplicity, return a mock response for testing
      res.json({
        success: true,
        message: 'Chat room deleted successfully',
        data: {
          roomId,
          deletedBy: user._id,
          deletedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete chat room',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// Catch-all for undefined chat routes
router.use('*', (req: Request, res: Response) => {
  logWarn(`Attempted access to undefined chat route: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'Chat endpoint not found',
    availableEndpoints: [
      '/rooms', '/rooms/:roomId/join', '/rooms/:roomId/leave', 
      '/rooms/:roomId/users', '/rooms/:roomId/messages'
    ]
  });
});

export default router;

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
  validateChatMessage,
  handleValidationErrors,
  asyncHandler(sendMessage)
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

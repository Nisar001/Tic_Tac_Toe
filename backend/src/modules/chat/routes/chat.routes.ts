import { Router } from 'express';

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

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// Chat room management
router.get('/rooms',
  getChatRooms
);

router.post('/rooms/:roomId/join',
  validateRoomId,
  handleValidationErrors,
  joinChatRoom
);

router.post('/rooms/:roomId/leave',
  validateRoomId,
  handleValidationErrors,
  leaveChatRoom
);

router.get('/rooms/:roomId/users',
  validateRoomId,
  handleValidationErrors,
  getChatRoomUsers
);

// Message management
router.get('/rooms/:roomId/messages',
  validateRoomId,
  validatePagination,
  handleValidationErrors,
  getChatHistory
);

router.post('/rooms/:roomId/messages',
  chatRateLimit,
  validateRoomId,
  validateChatMessage,
  handleValidationErrors,
  sendMessage
);

export default router;

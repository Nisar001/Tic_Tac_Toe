import { Router } from 'express';
import {
  getFriends,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  searchUsers,
  blockUser,
  unblockUser,
  getBlockedUsers
} from '../controllers/friends.controller';

// Import middleware
import { authenticate } from '../../../middlewares/auth.middleware';
import {
  validateFriendRequestCreate,
  validateUserId,
  validateSearchQuery,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import {
  friendRequestRateLimit,
  searchRateLimit,
  blockUserRateLimit
} from '../../../middlewares/rateLimiting.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Friend management routes
router.get('/', getFriends);

router.post('/request', 
  friendRequestRateLimit,
  validateFriendRequestCreate,
  handleValidationErrors,
  sendFriendRequest
);

router.get('/requests', getFriendRequests);

router.post('/requests/:requestId/accept',
  validateUserId,
  handleValidationErrors,
  acceptFriendRequest
);

router.post('/requests/:requestId/reject',
  validateUserId,
  handleValidationErrors,
  rejectFriendRequest
);

router.delete('/requests/:requestId',
  validateUserId,
  handleValidationErrors,
  cancelFriendRequest
);

router.delete('/:friendId',
  validateUserId,
  handleValidationErrors,
  removeFriend
);

// User search
router.get('/search',
  searchRateLimit,
  validateSearchQuery,
  handleValidationErrors,
  searchUsers
);

// Blocking functionality
router.post('/block/:userId',
  blockUserRateLimit,
  validateUserId,
  handleValidationErrors,
  blockUser
);

router.delete('/block/:userId',
  validateUserId,
  handleValidationErrors,
  unblockUser
);

router.get('/blocked', getBlockedUsers);

export default router;

import { Router } from 'express';
import {
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest
} from '../controllers/request/request.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateFriendRequestCreate, validateUserId, handleValidationErrors } from '../../../middlewares/validation.middleware';
import { friendRequestRateLimit } from '../../../middlewares/rateLimiting.middleware';

const router = Router();
router.use(authenticate);

router.post('/request', friendRequestRateLimit, validateFriendRequestCreate, handleValidationErrors, sendFriendRequest);
router.get('/requests', getFriendRequests);
router.post('/requests/:requestId/accept', validateUserId, handleValidationErrors, acceptFriendRequest);
router.post('/requests/:requestId/reject', validateUserId, handleValidationErrors, rejectFriendRequest);
router.delete('/requests/:requestId', validateUserId, handleValidationErrors, cancelFriendRequest);

export default router;

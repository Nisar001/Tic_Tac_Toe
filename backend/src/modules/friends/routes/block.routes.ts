import { Router } from 'express';
import { blockUser, unblockUser, getBlockedUsers } from '../controllers/block/block.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateUserId, handleValidationErrors } from '../../../middlewares/validation.middleware';
import { blockUserRateLimit } from '../../../middlewares/rateLimiting.middleware';

const router = Router();
router.use(authenticate);

router.post('/block/:userId', blockUserRateLimit, validateUserId, handleValidationErrors, blockUser);
router.delete('/block/:userId', validateUserId, handleValidationErrors, unblockUser);
router.get('/blocked', getBlockedUsers);

export default router;

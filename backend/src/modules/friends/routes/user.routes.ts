import { Router } from 'express';
import { searchUsers } from '../controllers/user/user.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validateSearchQuery, handleValidationErrors } from '../../../middlewares/validation.middleware';
import { searchRateLimit } from '../../../middlewares/rateLimiting.middleware';

const router = Router();
router.use(authenticate);

router.get('/search', searchRateLimit, validateSearchQuery, handleValidationErrors, searchUsers);

export default router;

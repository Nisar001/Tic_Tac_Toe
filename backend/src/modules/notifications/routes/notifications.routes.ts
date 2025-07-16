import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} from '../controllers/notifications.controller';

// Import middleware
import { authenticate } from '../../../middlewares/auth.middleware';
import {
  validateUserId,
  validatePagination,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import {
  generalRateLimit
} from '../../../middlewares/rateLimiting.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get notifications for current user
router.get('/', 
  validatePagination,
  handleValidationErrors,
  getNotifications
);

// Get unread count
router.get('/unread-count', getUnreadCount);

// Mark specific notification as read
router.patch('/:notificationId/read',
  validateUserId,
  handleValidationErrors,
  markNotificationAsRead
);

// Mark all notifications as read
router.patch('/mark-all-read', markAllAsRead);

// Delete specific notification
router.delete('/:notificationId',
  validateUserId,
  handleValidationErrors,
  deleteNotification
);

// Delete all read notifications
router.delete('/read/all', deleteAllRead);

export default router;

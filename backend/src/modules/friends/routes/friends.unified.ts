/**
 * Unified Friends Routes
 * Clean and organized friend-related endpoints
 */

import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate } from '../../../middlewares/auth.middleware';
import { handleValidationErrors } from '../../../middlewares/validation.middleware';
import { friendRequestRateLimit, searchRateLimit } from '../../../middlewares/rateLimiting.middleware';

// Import unified controller
import {
  getFriends,
  getPendingRequests,
  getSentRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  searchUsers
} from '../controllers/friends.unified';

const router = Router();

// Apply authentication to all routes
router.use(authenticate as any);

// Validation middleware
const validateFriendRequest = [
  body('receiverId')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Message must be less than 200 characters')
    .trim()
];

const validateSearch = [
  query('q')
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
    .trim(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const validateObjectId = [
  param('requestId')
    .optional()
    .isMongoId()
    .withMessage('Invalid request ID'),
  param('friendId')
    .optional()
    .isMongoId()
    .withMessage('Invalid friend ID')
];

// ===== MAIN FRIENDS ENDPOINTS =====

/**
 * @route GET /api/friends
 * @desc Get all friends for the authenticated user
 * @access Private
 */
router.get('/', getFriends as any);

/**
 * @route GET /api/friends/list
 * @desc Get all friends for the authenticated user (alias)
 * @access Private
 */
router.get('/list', getFriends as any);

/**
 * @route GET /api/friends/requests
 * @desc Get pending friend requests (received)
 * @access Private
 */
router.get('/requests', getPendingRequests as any);

/**
 * @route GET /api/friends/requests/sent
 * @desc Get sent friend requests (for debugging)
 * @access Private
 */
router.get('/requests/sent', getSentRequests as any);

/**
 * @route POST /api/friends/request
 * @desc Send a friend request
 * @access Private
 */
router.post('/request',
  friendRequestRateLimit,
  validateFriendRequest,
  handleValidationErrors,
  sendFriendRequest as any
);

/**
 * @route PUT /api/friends/request/:requestId/accept
 * @desc Accept a friend request
 * @access Private
 */
router.put('/request/:requestId/accept',
  validateObjectId,
  handleValidationErrors,
  acceptFriendRequest as any
);

/**
 * @route DELETE /api/friends/request/:requestId/reject
 * @desc Reject a friend request
 * @access Private
 */
router.delete('/request/:requestId/reject',
  validateObjectId,
  handleValidationErrors,
  rejectFriendRequest as any
);

/**
 * @route DELETE /api/friends/:friendId
 * @desc Remove a friend (unfriend)
 * @access Private
 */
router.delete('/:friendId',
  validateObjectId,
  handleValidationErrors,
  removeFriend as any
);

/**
 * @route GET /api/friends/search
 * @desc Search for users to add as friends
 * @access Private
 */
router.get('/search',
  searchRateLimit,
  validateSearch,
  handleValidationErrors,
  searchUsers as any
);

// ===== UTILITY ENDPOINTS =====

/**
 * @route GET /api/friends/health
 * @desc Health check for friends service
 * @access Private
 */
router.get('/health', (req: any, res: any) => {
  res.status(200).json({
    success: true,
    message: 'Friends service is healthy',
    timestamp: new Date().toISOString(),
    features: [
      'Friend management',
      'Friend requests',
      'User search',
      'Real-time updates'
    ]
  });
});

/**
 * @route GET /api/friends/stats
 * @desc Get friend statistics for the user
 * @access Private
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // This could be expanded with actual statistics
    res.status(200).json({
      success: true,
      message: 'Friend statistics retrieved',
      data: {
        totalFriends: 0, // Would be calculated from database
        pendingRequests: 0, // Would be calculated from database
        sentRequests: 0, // Would be calculated from database
        lastActivity: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to get friend statistics',
      error: error.message
    });
  }
});

// 404 handler for undefined friend routes
router.use('*', (req: any, res: any) => {
  res.status(404).json({
    success: false,
    message: 'Friends endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /requests',
      'GET /requests/sent',
      'POST /request',
      'PUT /request/:requestId/accept',
      'DELETE /request/:requestId/reject',
      'DELETE /:friendId',
      'GET /search',
      'GET /health',
      'GET /stats'
    ]
  });
});

export default router;

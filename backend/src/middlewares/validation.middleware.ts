import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { AuthUtils } from '../utils/auth.utils';

// Extended Request interface for file uploads
interface RequestWithFile extends Request {
  file?: any;
  files?: any;
}

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : 'unknown',
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined
      }))
    });
    return;
  }
  
  next();
};

/**
 * User registration validation
 */
export const validateUserRegistration: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      if (!AuthUtils.isValidUsername(value)) {
        throw new Error('Invalid username format');
      }
      return true;
    }),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .custom((value) => {
      if (!AuthUtils.isValidEmail(value)) {
        throw new Error('Invalid email format');
      }
      return true;
    }),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number')
    .custom((value) => {
      if (!AuthUtils.isValidPassword(value)) {
        throw new Error('Password does not meet security requirements');
      }
      return true;
    }),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  body('phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),

  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const age = new Date().getFullYear() - new Date(value).getFullYear();
      if (age < 13) {
        throw new Error('You must be at least 13 years old to register');
      }
      return true;
    })
];

/**
 * User login validation
 */
export const validateUserLogin: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Password reset request validation
 */
export const validatePasswordResetRequest: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

/**
 * Password reset validation
 */
export const validatePasswordReset: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number')
    .custom((value) => {
      if (!AuthUtils.isValidPassword(value)) {
        throw new Error('Password does not meet security requirements');
      }
      return true;
    }),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Change password validation
 */
export const validateChangePassword: ValidationChain[] = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('New password must contain at least one letter and one number')
    .custom((value) => {
      if (!AuthUtils.isValidPassword(value)) {
        throw new Error('New password does not meet security requirements');
      }
      return true;
    }),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Delete account validation
 */
export const validateDeleteAccount: ValidationChain[] = [
  body('password')
    .notEmpty()
    .withMessage('Password is required for account deletion'),

  body('confirmDeletion')
    .equals('DELETE')
    .withMessage('Please type DELETE to confirm account deletion')
];

/**
 * Refresh token validation
 */
export const validateRefreshToken: ValidationChain[] = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

/**
 * Resend verification validation
 */
export const validateResendVerification: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

/**
 * Email verification validation (updated)
 */
export const validateEmailVerification: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('verificationCode')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Verification code must be 6 digits')
];

/**
 * Game creation validation
 */
export const validateGameCreation: ValidationChain[] = [
  body('roomName')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Room name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Room name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean value'),

  body('maxSpectators')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Max spectators must be between 0 and 50')
];

/**
 * Room ID validation (enhanced)
 */
export const validateRoomId: ValidationChain[] = [
  param('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .isLength({ min: 3, max: 100 })
    .withMessage('Invalid room ID format')
];

/**
 * Matchmaking queue validation
 */
export const validateMatchmakingQueue: ValidationChain[] = [
  body('gameMode')
    .optional()
    .isIn(['classic', 'blitz', 'ranked'])
    .withMessage('Invalid game mode'),

  body('skillLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Invalid skill level'),

  body('maxWaitTime')
    .optional()
    .isInt({ min: 30, max: 600 })
    .withMessage('Max wait time must be between 30 and 600 seconds')
];

/**
 * Force match validation (admin)
 */
export const validateForceMatch: ValidationChain[] = [
  body('player1Id')
    .isMongoId()
    .withMessage('Invalid player 1 ID'),

  body('player2Id')
    .isMongoId()
    .withMessage('Invalid player 2 ID')
    .custom((value, { req }) => {
      if (value === req.body.player1Id) {
        throw new Error('Player 1 and Player 2 cannot be the same');
      }
      return true;
    })
];

/**
 * Leaderboard query validation
 */
export const validateLeaderboard: ValidationChain[] = [
  query('type')
    .optional()
    .isIn(['wins', 'level', 'winRate', 'streak'])
    .withMessage('Invalid leaderboard type'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

/**
 * Chat room creation validation
 */
export const validateChatRoomCreation: ValidationChain[] = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Room name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9\s_-]+$/)
    .withMessage('Room name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('type')
    .isIn(['public', 'private', 'game'])
    .withMessage('Invalid room type'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must be less than 200 characters')
];

/**
 * Chat history validation
 */
export const validateChatHistory: ValidationChain[] = [
  param('roomId')
    .notEmpty()
    .withMessage('Room ID is required'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),

  query('before')
    .optional()
    .isISO8601()
    .withMessage('Before timestamp must be a valid date')
];

/**
 * File upload validation (enhanced)
 */
export const validateAvatarUpload = (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
    return;
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(req.file.mimetype)) {
    res.status(400).json({
      success: false,
      message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
    });
    return;
  }

  if (req.file.size > maxSize) {
    res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
    return;
  }

  next();
};

/**
 * User search validation
 */
export const validateUserSearch: ValidationChain[] = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
    .custom((value) => {
      const sanitized = AuthUtils.sanitizeInput(value);
      if (sanitized !== value) {
        throw new Error('Search query contains invalid characters');
      }
      return true;
    }),

  query('type')
    .optional()
    .isIn(['username', 'email'])
    .withMessage('Search type must be username or email')
];

/**
 * Energy system validation
 */
export const validateEnergyAction: ValidationChain[] = [
  body('action')
    .isIn(['use', 'regenerate', 'purchase'])
    .withMessage('Invalid energy action'),

  body('amount')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Energy amount must be between 1 and 10')
];

/**
 * Game statistics validation
 */
export const validateGameStatsQuery: ValidationChain[] = [
  query('period')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'all'])
    .withMessage('Invalid time period'),

  query('gameMode')
    .optional()
    .isIn(['classic', 'blitz', 'ranked'])
    .withMessage('Invalid game mode')
];

/**
 * Friend request validation (enhanced)
 */
export const validateFriendRequest: ValidationChain[] = [
  body('friendId')
    .isMongoId()
    .withMessage('Invalid friend ID'),

  body('message')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Friend request message must be less than 200 characters')
];

/**
 * Friend request response validation
 */
export const validateFriendRequestResponse: ValidationChain[] = [
  param('requestId')
    .isMongoId()
    .withMessage('Invalid request ID'),

  body('action')
    .isIn(['accept', 'reject'])
    .withMessage('Action must be accept or reject')
];

/**
 * Report user validation
 */
export const validateReportUser: ValidationChain[] = [
  body('reportedUserId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('reason')
    .isIn(['spam', 'harassment', 'cheating', 'inappropriate_content', 'other'])
    .withMessage('Invalid report reason'),

  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('gameId')
    .optional()
    .isMongoId()
    .withMessage('Invalid game ID')
];

/**
 * Block user validation
 */
export const validateBlockUser: ValidationChain[] = [
  body('blockedUserId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

/**
 * Admin actions validation
 */
export const validateAdminAction: ValidationChain[] = [
  body('action')
    .isIn(['ban', 'unban', 'warn', 'mute', 'unmute'])
    .withMessage('Invalid admin action'),

  body('targetUserId')
    .isMongoId()
    .withMessage('Invalid target user ID'),

  body('reason')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Reason must be between 5 and 200 characters'),

  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (hours)')
];

/**
 * Notification settings validation
 */
export const validateNotificationSettings: ValidationChain[] = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),

  body('pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean'),

  body('gameInvites')
    .optional()
    .isBoolean()
    .withMessage('Game invites setting must be a boolean'),

  body('friendRequests')
    .optional()
    .isBoolean()
    .withMessage('Friend requests setting must be a boolean')
];

/**
 * Custom validation for file uploads
 */
export const validateFileUpload = (
  req: RequestWithFile,
  res: Response,
  next: NextFunction
): void => {
  if (!req.file && !req.files) {
    res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
    return;
  }

  // Add file type validation here if needed
  next();
};

/**
 * Profile update validation
 */
export const validateProfileUpdate: ValidationChain[] = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio must be less than 200 characters')
];

/**
 * Chat message validation
 */
export const validateChatMessage: ValidationChain[] = [
  body('message')
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

/**
 * Legacy chat message validation (includes roomId in body)
 */
export const validateLegacyChatMessage: ValidationChain[] = [
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .isString()
    .withMessage('Room ID must be a string')
    .isLength({ min: 3, max: 50 })
    .withMessage('Room ID must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Room ID can only contain letters, numbers, hyphens, and underscores'),
  body('message')
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Message must be less than 500 characters')
];

/**
 * Game move validation
 */
export const validateGameMove: ValidationChain[] = [
  body('move')
    .notEmpty()
    .withMessage('Move cannot be empty')
    .isIn(['X', 'O'])
    .withMessage('Move must be either X or O'),

  body('position')
    .isInt({ min: 0, max: 8 })
    .withMessage('Position must be between 0 and 8')
];

/**
 * Game ID validation
 */
export const validateGameId: ValidationChain[] = [
  param('gameId')
    .notEmpty()
    .withMessage('Game ID is required')
    .isMongoId()
    .withMessage('Invalid Game ID')
];

/**
 * Pagination validation
 */
export const validatePagination: ValidationChain[] = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
];

/**
 * User ID validation
 */
export const validateUserId: ValidationChain[] = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid User ID')
];

/**
 * Request ID validation
 */
export const validateRequestId: ValidationChain[] = [
  param('requestId')
    .notEmpty()
    .withMessage('Request ID is required')
    .isMongoId()
    .withMessage('Invalid Request ID')
];

/**
 * Friend ID validation
 */
export const validateFriendId: ValidationChain[] = [
  param('friendId')
    .notEmpty()
    .withMessage('Friend ID is required')
    .isMongoId()
    .withMessage('Invalid Friend ID')
];

/**
 * Search query validation
 */
export const validateSearchQuery: ValidationChain[] = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
    .trim()
    .escape()
];

/**
 * Friend request validation
 */
export const validateFriendRequestCreate: ValidationChain[] = [
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid Receiver ID'),

  body('message')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Message cannot exceed 200 characters')
    .trim()
    .escape()
];

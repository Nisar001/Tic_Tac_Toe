import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount
} from '../controllers';

// Import middleware
import { authenticate, optionalAuthenticate, checkEnergy } from '../../../middlewares/auth.middleware';
import {
  validateUserRegistration,
  validateUserLogin,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateProfileUpdate,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import {
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit,
  profileUpdateRateLimit
} from '../../../middlewares/rateLimiting.middleware';

const router = Router();

// Public routes (authentication)
router.post('/register', 
  authRateLimit,
  validateUserRegistration,
  handleValidationErrors,
  register
);

router.post('/login',
  authRateLimit,
  validateUserLogin,
  handleValidationErrors,
  login
);

router.post('/verify-email',
  emailVerificationRateLimit,
  validateEmailVerification,
  handleValidationErrors,
  verifyEmail
);

router.post('/resend-verification',
  emailVerificationRateLimit,
  validateEmailVerification,
  handleValidationErrors,
  resendVerification
);

router.post('/request-password-reset',
  passwordResetRateLimit,
  validatePasswordResetRequest,
  handleValidationErrors,
  requestPasswordReset
);

router.post('/reset-password',
  authRateLimit,
  validatePasswordReset,
  handleValidationErrors,
  resetPassword
);

router.post('/refresh-token', refreshToken);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.get('/profile', getProfile);

router.patch('/profile',
  profileUpdateRateLimit,
  validateProfileUpdate,
  handleValidationErrors,
  updateProfile
);

router.post('/change-password',
  authRateLimit,
  validatePasswordReset,
  handleValidationErrors,
  changePassword
);

router.post('/logout', logout);

router.post('/logout-all', logoutAll);

router.delete('/account',
  authRateLimit,
  deleteAccount
);

export default router;

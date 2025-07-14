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
  deleteAccount,
  emergencyPasswordReset
} from '../controllers';

// Import social routes
import socialRoutes from './social.routes';

// Import middleware
import { authenticate, optionalAuthenticate, checkEnergy } from '../../../middlewares/auth.middleware';
import {
  validateUserRegistration,
  validateUserLogin,
  validateEmailVerification,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChangePassword,
  validateProfileUpdate,
  handleValidationErrors
} from '../../../middlewares/validation.middleware';
import { validateResendVerification } from '../../../middlewares/validateResendVerification';
import {
  authRateLimit,
  passwordResetRateLimit,
  emailVerificationRateLimit,
  profileUpdateRateLimit
} from '../../../middlewares/rateLimiting.middleware';

const router = Router();

// Social authentication routes
router.use('/social', socialRoutes);

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
  validateResendVerification,
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

// TEMPORARY: Emergency password reset (remove in production)
router.post('/emergency-reset', emergencyPasswordReset);

// Protected routes (require authentication)
router.use(authenticate as any); // All routes below require authentication

router.get('/profile', getProfile);

router.patch('/profile',
  profileUpdateRateLimit,
  validateProfileUpdate,
  handleValidationErrors,
  updateProfile
);

router.post('/change-password',
  authRateLimit,
  validateChangePassword,
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

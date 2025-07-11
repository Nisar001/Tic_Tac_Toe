import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import {
  facebookLogin,
  facebookCallback,
  facebookAuthRateLimit,
  googleLogin,
  googleCallback,
  socialAuthRateLimit,
  instagramLogin,
  instagramCallback,
  instagramAuthRateLimit,
  twitterLogin,
  twitterCallback,
  twitterAuthRateLimit
} from '../controllers/social';
import { logWarn } from '../../../utils/logger';

const router = Router();

// Error handling wrapper for async routes
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Google authentication routes
router.get('/google', 
  socialAuthRateLimit,
  passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get('/google/callback', asyncHandler(googleCallback));
router.post('/google', socialAuthRateLimit, asyncHandler(googleLogin));

// Facebook authentication routes
router.get('/facebook',
  facebookAuthRateLimit,
  passport.authenticate('facebook', { scope: ['email'] })
);
router.get('/facebook/callback', asyncHandler(facebookCallback));
router.post('/facebook', facebookAuthRateLimit, asyncHandler(facebookLogin));

// Twitter authentication routes
router.get('/twitter',
  twitterAuthRateLimit,
  passport.authenticate('twitter')
);
router.get('/twitter/callback', asyncHandler(twitterCallback));
router.post('/twitter', twitterAuthRateLimit, asyncHandler(twitterLogin));

// Instagram authentication routes
router.get('/instagram',
  instagramAuthRateLimit,
  passport.authenticate('instagram')
);
router.get('/instagram/callback', asyncHandler(instagramCallback));
router.post('/instagram', instagramAuthRateLimit, asyncHandler(instagramLogin));

// Catch-all for undefined social auth routes
router.use('*', (req: Request, res: Response) => {
  logWarn(`Attempted access to undefined social auth route: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
  res.status(404).json({
    success: false,
    message: 'Social authentication endpoint not found',
    availableProviders: ['google', 'facebook', 'twitter', 'instagram']
  });
});

export default router;

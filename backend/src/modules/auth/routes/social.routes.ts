import { Router } from 'express';
import {
  facebookLogin,
  googleLogin,
  instagramLogin,
  twitterLogin
} from '../controllers/social';

const router = Router();

// Social login routes
router.post('/facebook', facebookLogin);
router.post('/google', googleLogin);
router.post('/instagram', instagramLogin);
router.post('/twitter', twitterLogin);

export default router;

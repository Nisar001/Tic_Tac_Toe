// Social Authentication Controllers
export { facebookLogin, facebookCallback, facebookAuthRateLimit } from './facebook.controller';
export { googleLogin, googleCallback, socialAuthRateLimit } from './google.controller';
export { instagramLogin, instagramCallback, instagramAuthRateLimit } from './instagram.controller';
export { twitterLogin, twitterCallback, twitterAuthRateLimit } from './twitter.controller';

// Common rate limiter for all social auth (alias for backward compatibility)
export { socialAuthRateLimit as defaultSocialAuthRateLimit } from './google.controller';

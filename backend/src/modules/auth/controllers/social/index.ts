// Social Authentication Controllers
export { facebookLogin, facebookCallback, facebookAuthRateLimit } from './facebook.controller';
export { googleLogin, googleCallback, socialAuthRateLimit } from './google.controller';

// Common rate limiter for all social auth (alias for backward compatibility)
export { socialAuthRateLimit as defaultSocialAuthRateLimit } from './google.controller';

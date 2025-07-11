import { config } from './index';

// Base URLs for backend
const baseUrls = {
  development: 'http://localhost:3000',
  production: process.env.BASE_URL || 'https://your-api-domain.com',
  test: process.env.BASE_URL_TEST || 'http://localhost:3000'
};

// Frontend URLs
const frontendUrls = {
  development: 'http://localhost:3001',
  production: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  test: process.env.FRONTEND_URL_TEST || 'http://localhost:3001'
};

const currentEnv = config.NODE_ENV || 'development';

const currentBaseUrl = baseUrls[currentEnv as keyof typeof baseUrls];
const currentFrontendUrl = frontendUrls[currentEnv as keyof typeof frontendUrls];

// Social auth configuration
export const socialConfig = {
  baseUrls,
  getCurrentBaseUrl: () => currentBaseUrl,
  frontend: frontendUrls,
  getCurrentFrontendUrl: () => currentFrontendUrl,

  redirectUrIs: {
    google: {
      callback: `${currentBaseUrl}/api/auth/google/callback`,
      success: `${currentFrontendUrl}/auth/success`,
      error: `${currentFrontendUrl}/auth/error`
    },
    facebook: {
      callback: `${currentBaseUrl}/api/auth/facebook/callback`,
      success: `${currentFrontendUrl}/auth/success`,
      error: `${currentFrontendUrl}/auth/error`
    },
    instagram: {
      callback: `${currentBaseUrl}/api/auth/instagram/callback`,
      success: `${currentFrontendUrl}/auth/success`,
      error: `${currentFrontendUrl}/auth/error`
    },
    twitter: {
      callback: `${currentBaseUrl}/api/auth/twitter/callback`,
      success: `${currentFrontendUrl}/auth/success`,
      error: `${currentFrontendUrl}/auth/error`
    }
  },

  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: ['profile', 'email']
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID,
      appSecret: process.env.FACEBOOK_APP_SECRET,
      scope: ['email', 'public_profile']
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
      scope: ['user_profile', 'user_media']
    },
    twitter: {
      apiKey: process.env.TWITTER_API_KEY,
      apiSecret: process.env.TWITTER_API_SECRET,
      scope: ['tweet.read', 'users.read']
    }
  }
};

// List of allowed redirect URIs (for social provider dashboard setup)
export const socialProviderRedirectURIs = {
  development: {
    google: [
      'http://localhost:3000/api/auth/google/callback',
      'http://localhost:3001/auth/success',
      'http://localhost:3001/auth/error'
    ],
    facebook: [
      'http://localhost:3000/api/auth/facebook/callback',
      'http://localhost:3001/auth/success',
      'http://localhost:3001/auth/error'
    ],
    instagram: [
      'http://localhost:3000/api/auth/instagram/callback',
      'http://localhost:3001/auth/success',
      'http://localhost:3001/auth/error'
    ],
    twitter: [
      'http://localhost:3000/api/auth/twitter/callback',
      'http://localhost:3001/auth/success',
      'http://localhost:3001/auth/error'
    ]
  },
  production: {
    google: [
      `${baseUrls.production}/api/auth/google/callback`,
      `${frontendUrls.production}/auth/success`,
      `${frontendUrls.production}/auth/error`
    ],
    facebook: [
      `${baseUrls.production}/api/auth/facebook/callback`,
      `${frontendUrls.production}/auth/success`,
      `${frontendUrls.production}/auth/error`
    ],
    instagram: [
      `${baseUrls.production}/api/auth/instagram/callback`,
      `${frontendUrls.production}/auth/success`,
      `${frontendUrls.production}/auth/error`
    ],
    twitter: [
      `${baseUrls.production}/api/auth/twitter/callback`,
      `${frontendUrls.production}/auth/success`,
      `${frontendUrls.production}/auth/error`
    ]
  }
};

// ✅ Validate required env vars for OAuth
export const validateSocialConfig = (): boolean => {
  const missing: string[] = [];

  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.FACEBOOK_APP_ID) missing.push('FACEBOOK_APP_ID');
  if (!process.env.FACEBOOK_APP_SECRET) missing.push('FACEBOOK_APP_SECRET');
  if (!process.env.TWITTER_API_KEY) missing.push('TWITTER_API_KEY');
  if (!process.env.TWITTER_API_SECRET) missing.push('TWITTER_API_SECRET');
  if (!process.env.INSTAGRAM_CLIENT_ID) missing.push('INSTAGRAM_CLIENT_ID');
  if (!process.env.INSTAGRAM_CLIENT_SECRET) missing.push('INSTAGRAM_CLIENT_SECRET');

  if (missing.length > 0) {
    console.warn(
      `⚠️ Missing social authentication environment variables:\n- ${missing.join('\n- ')}`
    );
    return false;
  }

  return true;
};

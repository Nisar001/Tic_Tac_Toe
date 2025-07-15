import { config } from './index';

// Base URLs for backend
const baseUrls = {
  development: 'http://localhost:5000',
  production: process.env.BASE_URL || 'https://tic-tac-toe-uf5h.onrender.com',
  test: process.env.BASE_URL_TEST || 'http://localhost:5000'
};

// Frontend URLs
const frontendUrls = {
  development: 'http://localhost:3000',
  production: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  test: process.env.FRONTEND_URL_TEST || 'http://localhost:3000'
};

const currentEnv = config.NODE_ENV || 'development';

// Force production URLs for deployed backend
const currentBaseUrl = process.env.NODE_ENV === 'production' 
  ? 'https://tic-tac-toe-uf5h.onrender.com' 
  : baseUrls[currentEnv as keyof typeof baseUrls];
  
const currentFrontendUrl = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL || 'http://localhost:3000'
  : frontendUrls[currentEnv as keyof typeof frontendUrls];

// Social auth configuration
export const socialConfig = {
  baseUrls,
  getCurrentBaseUrl: () => currentBaseUrl,
  frontend: frontendUrls,
  getCurrentFrontendUrl: () => currentFrontendUrl,

  redirectUrIs: {
    google: {
      callback: `${currentBaseUrl}/api/auth/social/google/callback`,
      success: `${currentFrontendUrl}/auth/callback`,
      error: `${currentFrontendUrl}/auth/login`
    },
    facebook: {
      callback: `${currentBaseUrl}/api/auth/social/facebook/callback`,
      success: `${currentFrontendUrl}/auth/callback`,
      error: `${currentFrontendUrl}/auth/login`
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
    }
  }
};

// List of allowed redirect URIs (for social provider dashboard setup)
export const socialProviderRedirectURIs = {
  development: {
    google: [
      'http://localhost:5000/api/auth/social/google/callback',
      'http://localhost:3000/auth/callback'
    ],
    facebook: [
      'http://localhost:5000/api/auth/social/facebook/callback',
      'http://localhost:3000/auth/callback'
    ]
  },
  production: {
    google: [
      'https://tic-tac-toe-uf5h.onrender.com/api/auth/social/google/callback',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`
    ],
    facebook: [
      'https://tic-tac-toe-uf5h.onrender.com/api/auth/social/facebook/callback',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`
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

  if (missing.length > 0) {
    console.warn(
      `⚠️ Missing social authentication environment variables:\n- ${missing.join('\n- ')}`
    );
    return false;
  }

  return true;
};

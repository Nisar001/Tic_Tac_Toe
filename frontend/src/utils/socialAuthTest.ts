// Test Social Auth Configuration
console.log('🔍 Testing Social Auth Configuration...');

// Simulate the environment
process.env.NODE_ENV = 'development'; // Change to 'production' to test production URLs
process.env.BASE_URL = 'https://tic-tac-toe-uf5h.onrender.com';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Import the config (you would normally import this)
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development'
};

const baseUrls = {
  development: 'http://localhost:5000',
  production: process.env.BASE_URL || 'https://tic-tac-toe-uf5h.onrender.com',
  test: process.env.BASE_URL_TEST || 'http://localhost:5000'
};

const frontendUrls = {
  development: 'http://localhost:3000',
  production: process.env.FRONTEND_URL || 'https://your-frontend-domain.com',
  test: process.env.FRONTEND_URL_TEST || 'http://localhost:3000'
};

const currentEnv = config.NODE_ENV || 'development';
const currentBaseUrl = baseUrls[currentEnv as keyof typeof baseUrls];
const currentFrontendUrl = frontendUrls[currentEnv as keyof typeof frontendUrls];

const socialConfig = {
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
  }
};

console.log('📊 Configuration Results:');
console.log('Current Environment:', currentEnv);
console.log('Backend Base URL:', currentBaseUrl);
console.log('Frontend URL:', currentFrontendUrl);
console.log('\n🔗 Social Auth URLs:');
console.log('Google Callback:', socialConfig.redirectUrIs.google.callback);
console.log('Google Success:', socialConfig.redirectUrIs.google.success);
console.log('Google Error:', socialConfig.redirectUrIs.google.error);
console.log('Facebook Callback:', socialConfig.redirectUrIs.facebook.callback);
console.log('Facebook Success:', socialConfig.redirectUrIs.facebook.success);
console.log('Facebook Error:', socialConfig.redirectUrIs.facebook.error);

console.log('\n✅ Expected URLs for OAuth Providers:');
console.log('Add these to Google OAuth Console:');
console.log(`  - ${socialConfig.redirectUrIs.google.callback}`);
console.log('Add these to Facebook App Settings:');
console.log(`  - ${socialConfig.redirectUrIs.facebook.callback}`);

// Test production URLs
process.env.NODE_ENV = 'production';
const prodEnv = 'production';
const prodBaseUrl = baseUrls[prodEnv];
const prodFrontendUrl = frontendUrls[prodEnv];

const prodSocialConfig = {
  redirectUrIs: {
    google: {
      callback: `${prodBaseUrl}/api/auth/social/google/callback`,
      success: `${prodFrontendUrl}/auth/callback`,
      error: `${prodFrontendUrl}/auth/login`
    },
    facebook: {
      callback: `${prodBaseUrl}/api/auth/social/facebook/callback`,
      success: `${prodFrontendUrl}/auth/callback`,
      error: `${prodFrontendUrl}/auth/login`
    }
  }
};

console.log('\n🚀 Production URLs (when frontend is deployed):');
console.log('Google Callback:', prodSocialConfig.redirectUrIs.google.callback);
console.log('Facebook Callback:', prodSocialConfig.redirectUrIs.facebook.callback);

export { socialConfig, prodSocialConfig };

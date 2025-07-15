// Test script to check what URLs are being resolved
const { config } = require('./backend/src/config/index.ts');

console.log('Environment:', process.env.NODE_ENV);
console.log('BASE_URL:', process.env.BASE_URL);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

// Log what the social config would resolve to
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

const currentEnv = process.env.NODE_ENV || 'development';
console.log('Current Environment:', currentEnv);
console.log('Current Base URL:', baseUrls[currentEnv]);
console.log('Current Frontend URL:', frontendUrls[currentEnv]);

console.log('Expected Google Callback:', `${baseUrls[currentEnv]}/api/auth/social/google/callback`);
console.log('Expected Facebook Callback:', `${baseUrls[currentEnv]}/api/auth/social/facebook/callback`);

#!/usr/bin/env node

/**
 * Render Environment Variables Setup Guide
 * Run this after deployment to get the required environment variables
 */

console.log('🔧 RENDER ENVIRONMENT VARIABLES SETUP\n');

console.log('📋 Required Environment Variables for your Render service:\n');

const envVars = [
  {
    key: 'NODE_ENV',
    value: 'production',
    description: 'Application environment'
  },
  {
    key: 'PORT', 
    value: '10000',
    description: 'Server port (Render uses 10000)'
  },
  {
    key: 'MONGO_URI',
    value: 'mongodb+srv://username:password@cluster.mongodb.net/tic_tac_toe',
    description: 'MongoDB Atlas connection string'
  },
  {
    key: 'JWT_SECRET',
    value: 'your-super-secure-32-character-secret',
    description: 'JWT signing secret (minimum 32 characters)'
  },
  {
    key: 'JWT_REFRESH_SECRET',
    value: 'your-refresh-token-secret-32-chars',
    description: 'JWT refresh token secret'
  },
  {
    key: 'FRONTEND_URL',
    value: 'https://your-frontend.netlify.app',
    description: 'Your frontend application URL'
  },
  {
    key: 'CORS_ORIGIN',
    value: 'https://your-frontend.netlify.app',
    description: 'CORS origin (usually same as FRONTEND_URL)'
  }
];

console.log('🚨 CRITICAL VARIABLES (Required):');
envVars.slice(0, 6).forEach((env, index) => {
  console.log(`${index + 1}. ${env.key}=${env.value}`);
  console.log(`   Description: ${env.description}\n`);
});

console.log('📧 OPTIONAL EMAIL VARIABLES:');
const emailVars = [
  'EMAIL_HOST=smtp.gmail.com',
  'EMAIL_PORT=587', 
  'EMAIL_USER=your-email@gmail.com',
  'EMAIL_PASSWORD=your-app-password'
];
emailVars.forEach(env => console.log(`   ${env}`));

console.log('\n📱 OPTIONAL SMS VARIABLES (Twilio):');
const smsVars = [
  'TWILIO_ACCOUNT_SID=your-twilio-sid',
  'TWILIO_AUTH_TOKEN=your-twilio-token',
  'TWILIO_PHONE_NUMBER=your-twilio-phone'
];
smsVars.forEach(env => console.log(`   ${env}`));

console.log('\n📖 HOW TO SET THESE IN RENDER:');
console.log('1. Go to your Render service dashboard');
console.log('2. Click "Environment" in the left sidebar');
console.log('3. Add each variable with its value');
console.log('4. Click "Save Changes"');
console.log('5. Your service will automatically redeploy\n');

console.log('🔗 Your deployed service: https://tic-tac-toe-uf5h.onrender.com');
console.log('📊 Health check: https://tic-tac-toe-uf5h.onrender.com/health');
console.log('📝 API info: https://tic-tac-toe-uf5h.onrender.com/');

console.log('\n✅ After setting environment variables, your logs should show:');
console.log('   🌍 Environment: production');
console.log('   📍 Port: 10000');
console.log('   🔗 Frontend URL: https://your-frontend.com');

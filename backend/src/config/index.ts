import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tic_tac_toe',
  MONGO_TEST_URI: process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/tic_tac_toe_test',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // OAuth Configuration
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',
  
  TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY || '',
  TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET || '',
  
  INSTAGRAM_CLIENT_ID: process.env.INSTAGRAM_CLIENT_ID || '',
  INSTAGRAM_CLIENT_SECRET: process.env.INSTAGRAM_CLIENT_SECRET || '',
  
  // Email Configuration (Nodemailer)
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@tictactoe.com',
  
  // Twilio Configuration
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // Game Configuration
  ENERGY_CONFIG: {
    MAX_ENERGY: parseInt(process.env.MAX_ENERGY || '5'),
    ENERGY_REGEN_TIME: parseInt(process.env.ENERGY_REGEN_TIME || '90'), // minutes
    ENERGY_PER_GAME: parseInt(process.env.ENERGY_PER_GAME || '1')
  },
  
  // Leveling Configuration
  LEVELING_CONFIG: {
    BASE_XP: parseInt(process.env.BASE_XP || '100'),
    XP_PER_WIN: parseInt(process.env.XP_PER_WIN || '50'),
    XP_PER_DRAW: parseInt(process.env.XP_PER_DRAW || '20'),
    XP_PER_LOSS: parseInt(process.env.XP_PER_LOSS || '10'),
    LEVEL_MULTIPLIER: parseFloat(process.env.LEVEL_MULTIPLIER || '1.5')
  },
  
  // Session Configuration
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret-here',
  
  // CORS Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  }
};

export default config;

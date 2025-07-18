import * as dotenv from 'dotenv';
import { logError, logWarn } from '../utils/logger';

dotenv.config();

// Configuration validation function
function validateConfig() {
  const requiredEnvVars = ['NODE_ENV', 'MONGO_URI'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingVars.length > 0) {
    logError(`Missing required environment variables: ${missingVars.join(', ')}`);
    throw new Error(`Configuration validation failed: missing ${missingVars.join(', ')}`);
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    const prodRequired = ['JWT_SECRET', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'SESSION_SECRET'];
    const missingProdVars = prodRequired.filter(envVar => !process.env[envVar]);

    if (missingProdVars.length > 0) {
      logError(`Missing required production environment variables: ${missingProdVars.join(', ')}`);
      throw new Error(`Missing production configuration: ${missingProdVars.join(', ')}`);
    }
  }

  // Validate JWT_SECRET
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logWarn('JWT_SECRET is shorter than recommended (32+ characters)');
  }

  // Validate Mongo URI
  if (process.env.MONGO_URI &&
    !process.env.MONGO_URI.startsWith('mongodb://') &&
    !process.env.MONGO_URI.startsWith('mongodb+srv://')) {
    logError('Invalid MongoDB URI format');
    throw new Error('Invalid MongoDB URI format');
  }

  // Validate numeric values
  if (isNaN(Number(process.env.PORT))) {
    logWarn('PORT is not a valid number, defaulting to 5000');
  }

  if (isNaN(Number(process.env.EMAIL_PORT))) {
    logWarn('EMAIL_PORT is not a valid number, defaulting to 587');
  }
}

validateConfig();

export const config = {
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tic_tac_toe',
  MONGO_TEST_URI: process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/tic_tac_toe_test',

  JWT_SECRET: process.env.JWT_SECRET || (
    process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('JWT_SECRET must be set in production'); })()
      : 'development-jwt-secret-change-in-production'
  ),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-here',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID || '',
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET || '',

  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@tictactoe.com',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',

  ENERGY_CONFIG: {
    MAX_ENERGY: parseInt(process.env.MAX_ENERGY || '5'),
    ENERGY_REGEN_TIME: parseInt(process.env.ENERGY_REGEN_TIME || '90'),
    ENERGY_PER_GAME: parseInt(process.env.ENERGY_PER_GAME || '1')
  },
  LIVES_CONFIG: {
    MAX_LIVES: parseInt(process.env.MAX_LIVES || '15'),
    LIVES_REGEN_TIME: parseInt(process.env.LIVES_REGEN_TIME || '5'), // minutes
    LIVES_PER_GAME: parseInt(process.env.LIVES_PER_GAME || '1')
  },

  LEVELING_CONFIG: {
    BASE_XP: parseInt(process.env.BASE_XP || '100'),
    XP_PER_WIN: parseInt(process.env.XP_PER_WIN || '50'),
    XP_PER_DRAW: parseInt(process.env.XP_PER_DRAW || '20'),
    XP_PER_LOSS: parseInt(process.env.XP_PER_LOSS || '10'),
    LEVEL_MULTIPLIER: parseFloat(process.env.LEVEL_MULTIPLIER || '1.5')
  },

  SESSION_SECRET: process.env.SESSION_SECRET || (
    process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('SESSION_SECRET must be set in production'); })()
      : 'your-session-secret-here'
  ),

  FRONTEND_URL: process.env.FRONTEND_URL || 'https://tictactoenisar.netlify.app',

  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900'),
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000')
  },

  SECURITY: {
    BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    LOCK_TIME: parseInt(process.env.LOCK_TIME || '3600'),
    PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'admin-api-key-change-in-production'
  },

  FEATURES: {
    SOCIAL_AUTH_ENABLED: process.env.SOCIAL_AUTH_ENABLED === 'true',
    EMAIL_VERIFICATION_REQUIRED: process.env.EMAIL_VERIFICATION_REQUIRED !== 'false',
    SMS_NOTIFICATIONS_ENABLED: process.env.SMS_NOTIFICATIONS_ENABLED === 'true',
    ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED === 'true'
  },

  PERFORMANCE: {
    DATABASE_CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000'),
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
    SOCKET_TIMEOUT: parseInt(process.env.SOCKET_TIMEOUT || '60000')
  }
};

export type Config = typeof config;
export default config;

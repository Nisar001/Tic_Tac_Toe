// Global test setup
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console.log to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.env for consistent testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_key_for_testing';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '0'; // Let the system assign a port

// Mock database for tests
jest.mock('../src/config/database', () => ({
  connectDB: jest.fn().mockResolvedValue(true),
}));

// Mock services that require external dependencies
jest.mock('../src/services/email.service', () => ({
  EmailService: {
    initialize: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  },
}));

jest.mock('../src/services/sms.service', () => ({
  SMSService: {
    initialize: jest.fn(),
    sendVerificationSMS: jest.fn(),
    sendPasswordResetSMS: jest.fn(),
  },
}));

jest.mock('../src/services/scheduler.service', () => ({
  SchedulerService: {
    initialize: jest.fn(),
    shutdown: jest.fn(),
  },
}));

// Mock authentication middleware
jest.mock('../src/middlewares/auth.middleware', () => {
  const originalModule = jest.requireActual('../src/middlewares/auth.middleware');
  
  return {
    ...originalModule,
    authenticate: (req: any, res: any, next: any) => {
      // Mock user data for tests
      req.user = {
        id: 'test_user_id',
        email: 'test@example.com',
        username: 'testuser',
        level: 1,
        energy: 5,
      };
      next();
    },
  };
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Cleanup after all tests
afterAll(async () => {
  // Close any open connections, cleanup resources
  await new Promise(resolve => setTimeout(resolve, 1000));
});

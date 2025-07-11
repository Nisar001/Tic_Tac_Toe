import twilio from 'twilio';
import { SMSService, SMSValidationResult, SMSRateLimitResult } from '../../../src/services/sms.service';
import { config } from '../../../src/config';
import * as logger from '../../../src/utils/logger';

// Mock dependencies
jest.mock('twilio');
jest.mock('../../../src/config');
jest.mock('../../../src/utils/logger');

const mockTwilio = twilio as jest.MockedFunction<typeof twilio>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockLogger = {
  logError: logger.logError as jest.MockedFunction<typeof logger.logError>,
  logInfo: logger.logInfo as jest.MockedFunction<typeof logger.logInfo>,
  logWarn: logger.logWarn as jest.MockedFunction<typeof logger.logWarn>
};

describe('SMSService', () => {
  const mockTwilioClient = {
    messages: {
      create: jest.fn()
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset static state
    (SMSService as any).isInitialized = false;
    (SMSService as any).client = null;
    (SMSService as any).phoneNumberAttempts = new Map();
    (SMSService as any).ipAttempts = new Map();

    // Setup default config mocks
    mockConfig.TWILIO_ACCOUNT_SID = 'test_account_sid';
    mockConfig.TWILIO_AUTH_TOKEN = 'test_auth_token';
    mockConfig.TWILIO_PHONE_NUMBER = '+1234567890';

    // Setup Twilio mock
    mockTwilio.mockReturnValue(mockTwilioClient as any);
    mockTwilioClient.messages.create.mockResolvedValue({ sid: 'test_message_id' });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', () => {
      const result = SMSService.initialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockTwilio).toHaveBeenCalledWith('test_account_sid', 'test_auth_token');
      expect(mockLogger.logInfo).toHaveBeenCalledWith('SMS service initialized successfully');
    });

    it('should return error when Twilio credentials are missing', () => {
      mockConfig.TWILIO_ACCOUNT_SID = '';
      mockConfig.TWILIO_AUTH_TOKEN = '';

      const result = SMSService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service not configured');
      expect(mockLogger.logWarn).toHaveBeenCalledWith('Twilio credentials not configured - SMS service disabled');
    });

    it('should return error when Twilio phone number is missing', () => {
      mockConfig.TWILIO_PHONE_NUMBER = '';

      const result = SMSService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS phone number not configured');
      expect(mockLogger.logWarn).toHaveBeenCalledWith('Twilio phone number not configured');
    });

    it('should return success if already initialized', () => {
      // First initialization
      SMSService.initialize();
      jest.clearAllMocks();

      // Second initialization
      const result = SMSService.initialize();

      expect(result.success).toBe(true);
      expect(mockTwilio).not.toHaveBeenCalled(); // Should not initialize again
    });

    it('should handle initialization errors', () => {
      mockTwilio.mockImplementation(() => {
        throw new Error('Twilio initialization failed');
      });

      const result = SMSService.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to initialize SMS service');
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('SMS service initialization failed')
      );
    });
  });

  describe('validatePhoneNumber', () => {
    // Access private method for testing
    const validatePhoneNumber = (SMSService as any).validatePhoneNumber.bind(SMSService);

    it('should validate correct US phone number', () => {
      const result = validatePhoneNumber('+15551234567');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedPhone).toBe('+15551234567');
    });

    it('should validate and format 10-digit US number', () => {
      const result = validatePhoneNumber('5551234567');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('+15551234567');
    });

    it('should validate and format 11-digit number starting with 1', () => {
      const result = validatePhoneNumber('15551234567');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('+15551234567');
    });

    it('should add plus sign to international numbers', () => {
      const result = validatePhoneNumber('441234567890');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('+441234567890');
    });

    it('should reject empty phone number', () => {
      const result = validatePhoneNumber('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number is required');
    });

    it('should reject null phone number', () => {
      const result = validatePhoneNumber(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number is required');
    });

    it('should reject non-string phone number', () => {
      const result = validatePhoneNumber(12345 as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number is required');
    });

    it('should reject too short phone numbers', () => {
      const result = validatePhoneNumber('123456789');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number must be between 10 and 15 digits');
    });

    it('should reject too long phone numbers', () => {
      const result = validatePhoneNumber('1234567890123456');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Phone number must be between 10 and 15 digits');
    });

    it('should reject blocked test patterns', () => {
      const testCases = [
        '+1234567890',
        '000000000',
        'test1234567890',
        'spam1234567890',
        'fake1234567890'
      ];

      testCases.forEach(testNumber => {
        const result = validatePhoneNumber(testNumber);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Phone number appears to be invalid or test number');
      });
    });

    it('should handle phone numbers with formatting characters', () => {
      const result = validatePhoneNumber('(555) 123-4567');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedPhone).toBe('+15551234567');
    });
  });

  describe('checkRateLimit', () => {
    const checkRateLimit = (SMSService as any).checkRateLimit.bind(SMSService);

    beforeEach(() => {
      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should allow SMS when no previous attempts', () => {
      const result = checkRateLimit('+15551234567');

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow SMS when under phone number rate limit', () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const now = Date.now();
      
      // Add 4 attempts in the last hour (under limit of 5)
      phoneAttempts.set('+15551234567', [
        new Date(now - 3600000 + 1000),
        new Date(now - 3600000 + 2000),
        new Date(now - 3600000 + 3000),
        new Date(now - 3600000 + 4000)
      ]);

      const result = checkRateLimit('+15551234567');

      expect(result.allowed).toBe(true);
    });

    it('should block SMS when phone number rate limit exceeded', () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const now = Date.now();
      
      // Add 5 attempts in the last hour (at limit)
      phoneAttempts.set('+15551234567', [
        new Date(now - 3600000 + 1000),
        new Date(now - 3600000 + 2000),
        new Date(now - 3600000 + 3000),
        new Date(now - 3600000 + 4000),
        new Date(now - 3600000 + 5000)
      ]);

      const result = checkRateLimit('+15551234567');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Too many SMS sent to this phone number');
      expect(result.retryAfter).toBe(3600);
    });

    it('should allow SMS when under IP rate limit', () => {
      const ipAttempts = (SMSService as any).ipAttempts;
      const now = Date.now();
      
      // Add 19 attempts from IP (under limit of 20)
      const attempts = Array.from({ length: 19 }, (_, i) => new Date(now - 3600000 + (i * 1000)));
      ipAttempts.set('192.168.1.1', attempts);

      const result = checkRateLimit('+15551234567', '192.168.1.1');

      expect(result.allowed).toBe(true);
    });

    it('should block SMS when IP rate limit exceeded', () => {
      const ipAttempts = (SMSService as any).ipAttempts;
      const now = Date.now();
      
      // Add 20 attempts from IP (at limit)
      const attempts = Array.from({ length: 20 }, (_, i) => new Date(now - 3600000 + (i * 1000)));
      ipAttempts.set('192.168.1.1', attempts);

      const result = checkRateLimit('+15551234567', '192.168.1.1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Too many SMS sent from this IP address');
      expect(result.retryAfter).toBe(3600);
    });

    it('should ignore old attempts outside the hour window', () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const now = Date.now();
      
      // Add 6 attempts, but only 1 in the last hour
      phoneAttempts.set('+15551234567', [
        new Date(now - 7200000), // 2 hours ago
        new Date(now - 7200000), // 2 hours ago
        new Date(now - 7200000), // 2 hours ago
        new Date(now - 7200000), // 2 hours ago
        new Date(now - 7200000), // 2 hours ago
        new Date(now - 1000)     // 1 second ago
      ]);

      const result = checkRateLimit('+15551234567');

      expect(result.allowed).toBe(true);
    });

    it('should handle rate limit check errors gracefully', () => {
      // Mock Date constructor to throw error
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      global.Date.now = Date.now;

      const result = checkRateLimit('+15551234567');

      expect(result.allowed).toBe(true); // Should allow on error
      expect(mockLogger.logError).toHaveBeenCalled();

      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('sanitizeMessage', () => {
    const sanitizeMessage = (SMSService as any).sanitizeMessage.bind(SMSService);

    it('should sanitize normal message correctly', () => {
      const result = sanitizeMessage('Hello, this is a test message!');

      expect(result).toBe('Hello, this is a test message!');
    });

    it('should trim whitespace', () => {
      const result = sanitizeMessage('  Hello World  ');

      expect(result).toBe('Hello World');
    });

    it('should limit message length', () => {
      const longMessage = 'a'.repeat(2000);
      const result = sanitizeMessage(longMessage);

      expect(result.length).toBe(1600);
    });

    it('should remove control characters', () => {
      const result = sanitizeMessage('Hello\x00World\x1F');

      expect(result).toBe('HelloWorld');
    });

    it('should preserve newlines and carriage returns', () => {
      const result = sanitizeMessage('Line 1\nLine 2\rLine 3');

      expect(result).toBe('Line 1\nLine 2\rLine 3');
    });

    it('should handle empty message', () => {
      const result = sanitizeMessage('');

      expect(result).toBe('');
    });

    it('should handle null message', () => {
      const result = sanitizeMessage(null as any);

      expect(result).toBe('');
    });

    it('should handle non-string message', () => {
      const result = sanitizeMessage(12345 as any);

      expect(result).toBe('');
    });

    it('should handle sanitization errors', () => {
      // Mock string methods to throw error
      const originalSubstring = String.prototype.substring;
      String.prototype.substring = jest.fn(() => {
        throw new Error('Substring error');
      });

      const result = sanitizeMessage('test message');

      expect(result).toBe('Message content error');
      expect(mockLogger.logError).toHaveBeenCalled();

      // Restore substring
      String.prototype.substring = originalSubstring;
    });
  });

  describe('sendSMS', () => {
    beforeEach(() => {
      SMSService.initialize();
    });

    it('should send SMS successfully', async () => {
      const result = await SMSService.sendSMS('+15551234567', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test_message_id');
      expect(result.error).toBeUndefined();

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        body: 'Test message',
        from: '+1234567890',
        to: '+15551234567'
      });

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        expect.stringContaining('SMS sent successfully to +15551234567')
      );
    });

    it('should fail when service is not initialized', async () => {
      mockConfig.TWILIO_ACCOUNT_SID = '';

      const result = await SMSService.sendSMS('+15551234567', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service not configured');
    });

    it('should fail with invalid phone number', async () => {
      const result = await SMSService.sendSMS('invalid', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid phone number');
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid phone number for SMS')
      );
    });

    it('should fail when rate limited', async () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const now = Date.now();
      
      // Set up rate limiting
      phoneAttempts.set('+15551234567', Array.from({ length: 5 }, () => new Date(now)));

      const result = await SMSService.sendSMS('+15551234567', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many SMS sent to this phone number');
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('SMS rate limited')
      );
    });

    it('should fail with empty message', async () => {
      const result = await SMSService.sendSMS('+15551234567', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid message content');
    });

    it('should record attempt on successful send', async () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;

      await SMSService.sendSMS('+15551234567', 'Test message', '192.168.1.1');

      expect(phoneAttempts.has('+15551234567')).toBe(true);
      expect(phoneAttempts.get('+15551234567')).toHaveLength(1);
    });

    it('should record IP attempt when provided', async () => {
      const ipAttempts = (SMSService as any).ipAttempts;

      await SMSService.sendSMS('+15551234567', 'Test message', '192.168.1.1');

      expect(ipAttempts.has('192.168.1.1')).toBe(true);
      expect(ipAttempts.get('192.168.1.1')).toHaveLength(1);
    });

    it('should handle Twilio API errors', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio API error'));

      const result = await SMSService.sendSMS('+15551234567', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send SMS');
      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('SMS sending failed')
      );
    });

    it('should record failed attempts for rate limiting', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('Twilio API error'));
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;

      await SMSService.sendSMS('+15551234567', 'Test message');

      expect(phoneAttempts.has('+15551234567')).toBe(true);
    });
  });

  describe('sendVerificationSMS', () => {
    beforeEach(() => {
      SMSService.initialize();
    });

    it('should send verification SMS with valid code', async () => {
      const result = await SMSService.sendVerificationSMS('+15551234567', '123456');

      expect(result.success).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('123456'),
          to: '+15551234567'
        })
      );
    });

    it('should include security message in verification SMS', async () => {
      await SMSService.sendVerificationSMS('+15551234567', '123456');

      const callArgs = mockTwilioClient.messages.create.mock.calls[0][0];
      expect(callArgs.body).toContain('Do not share this code');
      expect(callArgs.body).toContain('expire in 10 minutes');
    });

    it('should reject invalid verification code format', async () => {
      const result = await SMSService.sendVerificationSMS('+15551234567', '12345');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code format');
    });

    it('should reject non-numeric verification code', async () => {
      const result = await SMSService.sendVerificationSMS('+15551234567', 'abcdef');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification code format');
    });

    it('should handle verification SMS errors', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('SMS error'));

      const result = await SMSService.sendVerificationSMS('+15551234567', '123456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send verification SMS');
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('sendGameNotificationSMS', () => {
    beforeEach(() => {
      SMSService.initialize();
    });

    it('should send game notification SMS', async () => {
      const result = await SMSService.sendGameNotificationSMS(
        '+15551234567', 
        'You won against Player2!'
      );

      expect(result.success).toBe(true);
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: '🎮 Tic Tac Toe Game - You won against Player2!',
          to: '+15551234567'
        })
      );
    });

    it('should reject empty notification message', async () => {
      const result = await SMSService.sendGameNotificationSMS('+15551234567', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid notification message');
    });

    it('should reject too long notification message', async () => {
      const longMessage = 'a'.repeat(501);
      const result = await SMSService.sendGameNotificationSMS('+15551234567', longMessage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid notification message');
    });

    it('should handle game notification SMS errors', async () => {
      mockTwilioClient.messages.create.mockRejectedValue(new Error('SMS error'));

      const result = await SMSService.sendGameNotificationSMS(
        '+15551234567', 
        'Game notification'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to send game notification');
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format valid phone number', () => {
      const result = SMSService.formatPhoneNumber('5551234567');

      expect(result.success).toBe(true);
      expect(result.formatted).toBe('+15551234567');
    });

    it('should return error for invalid phone number', () => {
      const result = SMSService.formatPhoneNumber('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle formatting errors', () => {
      // Mock validation to throw error
      const originalValidate = (SMSService as any).validatePhoneNumber;
      (SMSService as any).validatePhoneNumber = jest.fn(() => {
        throw new Error('Validation error');
      });

      const result = SMSService.formatPhoneNumber('5551234567');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number formatting failed');
      expect(mockLogger.logError).toHaveBeenCalled();

      // Restore
      (SMSService as any).validatePhoneNumber = originalValidate;
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return true for valid phone number', () => {
      const result = SMSService.isValidPhoneNumber('+15551234567');

      expect(result).toBe(true);
    });

    it('should return false for invalid phone number', () => {
      const result = SMSService.isValidPhoneNumber('invalid');

      expect(result).toBe(false);
    });

    it('should handle validation errors', () => {
      // Mock validation to throw error
      const originalValidate = (SMSService as any).validatePhoneNumber;
      (SMSService as any).validatePhoneNumber = jest.fn(() => {
        throw new Error('Validation error');
      });

      const result = SMSService.isValidPhoneNumber('5551234567');

      expect(result).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();

      // Restore
      (SMSService as any).validatePhoneNumber = originalValidate;
    });
  });

  describe('getServiceStatus', () => {
    it('should return correct service status when initialized', () => {
      SMSService.initialize();

      const status = SMSService.getServiceStatus();

      expect(status.isInitialized).toBe(true);
      expect(status.isConfigured).toBe(true);
      expect(status.rateLimitStats).toEqual({
        totalPhoneNumbers: 0,
        totalIPs: 0
      });
    });

    it('should return correct service status when not configured', () => {
      mockConfig.TWILIO_ACCOUNT_SID = '';

      const status = SMSService.getServiceStatus();

      expect(status.isConfigured).toBe(false);
    });

    it('should return rate limit stats', () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const ipAttempts = (SMSService as any).ipAttempts;

      phoneAttempts.set('+15551234567', [new Date()]);
      ipAttempts.set('192.168.1.1', [new Date()]);

      const status = SMSService.getServiceStatus();

      expect(status.rateLimitStats.totalPhoneNumbers).toBe(1);
      expect(status.rateLimitStats.totalIPs).toBe(1);
    });

    it('should handle status errors', () => {
      // Mock config access to throw error
      const originalConfig = config;
      Object.defineProperty(config, 'TWILIO_ACCOUNT_SID', {
        get: () => {
          throw new Error('Config error');
        }
      });

      const status = SMSService.getServiceStatus();

      expect(status.isInitialized).toBe(false);
      expect(status.isConfigured).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();

      // Restore
      Object.defineProperty(config, 'TWILIO_ACCOUNT_SID', {
        value: originalConfig.TWILIO_ACCOUNT_SID,
        configurable: true
      });
    });
  });

  describe('cleanupRateLimitData', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should clean up old rate limit data', () => {
      const phoneAttempts = (SMSService as any).phoneNumberAttempts;
      const ipAttempts = (SMSService as any).ipAttempts;
      const now = Date.now();

      // Add old and recent attempts
      phoneAttempts.set('+15551234567', [
        new Date(now - 25 * 60 * 60 * 1000), // 25 hours ago (old)
        new Date(now - 1000) // 1 second ago (recent)
      ]);

      ipAttempts.set('192.168.1.1', [
        new Date(now - 25 * 60 * 60 * 1000) // 25 hours ago (old)
      ]);

      SMSService.cleanupRateLimitData();

      expect(phoneAttempts.get('+15551234567')).toHaveLength(1); // Only recent attempt remains
      expect(ipAttempts.has('192.168.1.1')).toBe(false); // All old attempts removed
      expect(mockLogger.logInfo).toHaveBeenCalledWith('SMS rate limit data cleanup completed');
    });

    it('should handle cleanup errors', () => {
      // Mock Date to throw error
      const originalDate = Date;
      global.Date = jest.fn(() => {
        throw new Error('Date error');
      }) as any;
      global.Date.now = Date.now;

      SMSService.cleanupRateLimitData();

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit cleanup error')
      );

      // Restore Date
      global.Date = originalDate;
    });
  });
});

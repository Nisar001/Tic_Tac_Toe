import nodemailer from 'nodemailer';
import { EmailService, EmailOptions, EmailValidationResult } from '../../../src/services/email.service';
import { config } from '../../../src/config';
import { AuthUtils } from '../../../src/utils/auth.utils';

// Mock nodemailer
jest.mock('nodemailer');
jest.mock('../../../src/config');
jest.mock('../../../src/utils/auth.utils');

const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;
const mockConfig = config as jest.Mocked<typeof config>;
const mockAuthUtils = AuthUtils as jest.Mocked<typeof AuthUtils>;

describe('EmailService', () => {
  const mockTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
    close: jest.fn()
  };

  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const mockConsoleError = jest.fn();
  const mockConsoleLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    console.error = mockConsoleError;
    console.log = mockConsoleLog;

    // Setup default mocks
    mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);
    mockTransporter.verify.mockImplementation((callback) => {
      callback(null, true);
    });
    mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

    // Setup config mocks
    mockConfig.EMAIL_HOST = 'smtp.gmail.com';
    mockConfig.EMAIL_PORT = 587;
    mockConfig.EMAIL_USER = 'test@example.com';
    mockConfig.EMAIL_PASS = 'testpassword';
    mockConfig.EMAIL_FROM = 'noreply@tictactoe.com';
    mockConfig.FRONTEND_URL = 'http://localhost:3000';

    // Setup AuthUtils mocks
    mockAuthUtils.isValidEmail.mockReturnValue(true);
    mockAuthUtils.isSuspiciousEmail.mockReturnValue(false);
    mockAuthUtils.validateAndSanitizeInput.mockImplementation((input) => input);

    // Clear email queue before each test
    (EmailService as any).emailQueue = new Map();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('initialize', () => {
    it('should initialize email service with correct configuration', () => {
      EmailService.initialize();

      expect(mockNodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'testpassword',
        },
        requireTLS: true,
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14
      });
    });

    it('should verify email configuration on initialization', () => {
      EmailService.initialize();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('Email service is ready to send messages');
    });

    it('should handle verification errors', () => {
      mockTransporter.verify.mockImplementation((callback) => {
        callback(new Error('Connection failed'), false);
      });

      EmailService.initialize();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Email service configuration error:',
        expect.any(Error)
      );
    });

    it('should handle initialization errors', () => {
      mockNodemailer.createTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      expect(() => EmailService.initialize()).toThrow('Email service initialization failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to initialize email service:',
        expect.any(Error)
      );
    });

    it('should configure secure connection for port 465', () => {
      mockConfig.EMAIL_PORT = 465;

      EmailService.initialize();

      expect(mockNodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          secure: true
        })
      );
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = EmailService.validateEmail('test@example.com');

      expect(result.isValid).toBe(true);
      expect(mockAuthUtils.isValidEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should reject invalid email format', () => {
      mockAuthUtils.isValidEmail.mockReturnValue(false);

      const result = EmailService.validateEmail('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid email format');
    });

    it('should reject suspicious emails', () => {
      mockAuthUtils.isSuspiciousEmail.mockReturnValue(true);

      const result = EmailService.validateEmail('suspicious@example.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Email appears suspicious');
    });

    it('should reject disposable email domains', () => {
      const result = EmailService.validateEmail('test@10minutemail.com');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Disposable email addresses are not allowed');
    });

    it('should handle case insensitive domain check', () => {
      const result = EmailService.validateEmail('test@GUERRILLAMAIL.COM');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Disposable email addresses are not allowed');
    });

    it('should validate legitimate email domains', () => {
      const result = EmailService.validateEmail('user@gmail.com');

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('checkEmailRateLimit', () => {
    beforeEach(() => {
      // Mock Date.now for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should allow emails within rate limit', () => {
      const result = EmailService.checkEmailRateLimit('test@example.com');

      expect(result).toBe(true);
    });

    it('should enforce hourly rate limit', () => {
      const emailQueue = (EmailService as any).emailQueue;
      const now = Date.now();

      // Add 10 emails in the last hour (at the limit)
      for (let i = 0; i < 10; i++) {
        emailQueue.set(`test${i}@example.com`, now - 1000);
      }

      const result = EmailService.checkEmailRateLimit('new@example.com');

      expect(result).toBe(false);
    });

    it('should enforce cooldown between emails to same address', () => {
      const emailQueue = (EmailService as any).emailQueue;
      const now = Date.now();

      // Add recent email to same address
      emailQueue.set('test@example.com', now - 30000); // 30 seconds ago

      const result = EmailService.checkEmailRateLimit('test@example.com');

      expect(result).toBe(false);
    });

    it('should allow emails after cooldown period', () => {
      const emailQueue = (EmailService as any).emailQueue;
      const now = Date.now();

      // Add old email to same address
      emailQueue.set('test@example.com', now - 70000); // 70 seconds ago

      const result = EmailService.checkEmailRateLimit('test@example.com');

      expect(result).toBe(true);
    });

    it('should clean up old email entries', () => {
      const emailQueue = (EmailService as any).emailQueue;
      const now = Date.now();

      // Add old emails (more than 1 hour ago)
      emailQueue.set('old1@example.com', now - 3700000); // Over 1 hour ago
      emailQueue.set('old2@example.com', now - 3700000);
      emailQueue.set('recent@example.com', now - 1000); // Recent

      EmailService.checkEmailRateLimit('test@example.com');

      expect(emailQueue.has('old1@example.com')).toBe(false);
      expect(emailQueue.has('old2@example.com')).toBe(false);
      expect(emailQueue.has('recent@example.com')).toBe(true);
    });

    it('should handle case insensitive email comparison', () => {
      const emailQueue = (EmailService as any).emailQueue;
      const now = Date.now();

      emailQueue.set('test@example.com', now - 30000);

      const result = EmailService.checkEmailRateLimit('TEST@EXAMPLE.COM');

      expect(result).toBe(false);
    });
  });

  describe('sendEmail', () => {
    const validEmailOptions: EmailOptions = {
      to: 'recipient@example.com',
      subject: 'Test Subject',
      html: '<h1>Test HTML</h1>',
      text: 'Test text content'
    };

    beforeEach(() => {
      EmailService.initialize();
    });

    it('should send email successfully', async () => {
      await EmailService.sendEmail(validEmailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Tic Tac Toe Game" <noreply@tictactoe.com>',
          to: 'recipient@example.com',
          subject: 'Test Subject',
          html: '<h1>Test HTML</h1>',
          text: 'Test text content',
          headers: expect.objectContaining({
            'X-Priority': '3',
            'X-Mailer': 'Tic Tac Toe Game System'
          })
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully to recipient@example.com')
      );
    });

    it('should validate email before sending', async () => {
      mockAuthUtils.isValidEmail.mockReturnValue(false);

      await expect(EmailService.sendEmail(validEmailOptions))
        .rejects.toThrow('Email validation failed: Invalid email format');

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should check rate limiting before sending', async () => {
      // Setup rate limiting to fail
      const emailQueue = (EmailService as any).emailQueue;
      emailQueue.set('recipient@example.com', Date.now() - 30000);

      await expect(EmailService.sendEmail(validEmailOptions))
        .rejects.toThrow('Email rate limit exceeded. Please try again later.');

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should sanitize input before sending', async () => {
      await EmailService.sendEmail(validEmailOptions);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('recipient@example.com', 255);
      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('Test Subject', 255);
      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('<h1>Test HTML</h1>', 10000);
      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('Test text content', 5000);
    });

    it('should handle missing HTML content', async () => {
      const options = { ...validEmailOptions, html: undefined };

      await EmailService.sendEmail(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: undefined
        })
      );
    });

    it('should handle missing text content', async () => {
      const options = { ...validEmailOptions, text: undefined };

      await EmailService.sendEmail(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: undefined
        })
      );
    });

    it('should include attachments if provided', async () => {
      const options = { ...validEmailOptions, attachments: [{ filename: 'test.txt' }] };

      await EmailService.sendEmail(options);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [{ filename: 'test.txt' }]
        })
      );
    });

    it('should initialize transporter if not already initialized', async () => {
      // Clear transporter
      (EmailService as any).transporter = null;

      await EmailService.sendEmail(validEmailOptions);

      expect(mockNodemailer.createTransport).toHaveBeenCalled();
    });

    it('should record successful email send for rate limiting', async () => {
      const emailQueue = (EmailService as any).emailQueue;

      await EmailService.sendEmail(validEmailOptions);

      expect(emailQueue.has('recipient@example.com')).toBe(true);
    });

    it('should handle transporter send errors', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(EmailService.sendEmail(validEmailOptions))
        .rejects.toThrow('Failed to send email: SMTP Error');

      expect(mockConsoleError).toHaveBeenCalledWith('Email sending failed:', expect.any(Error));
    });

    it('should handle unknown errors', async () => {
      mockTransporter.sendMail.mockRejectedValue('Unknown error');

      await expect(EmailService.sendEmail(validEmailOptions))
        .rejects.toThrow('Failed to send email: Unknown error');
    });
  });

  describe('sendVerificationEmail', () => {
    beforeEach(() => {
      EmailService.initialize();
    });

    it('should send verification email with correct content', async () => {
      await EmailService.sendVerificationEmail('user@example.com', '123456');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '🎮 Verify Your Email - Tic Tac Toe Game',
          html: expect.stringContaining('123456'),
          text: expect.stringContaining('123456')
        })
      );
    });

    it('should validate verification code', async () => {
      await expect(EmailService.sendVerificationEmail('user@example.com', ''))
        .rejects.toThrow('Invalid verification code');

      await expect(EmailService.sendVerificationEmail('user@example.com', '12345'))
        .rejects.toThrow('Invalid verification code');
    });

    it('should sanitize verification code', async () => {
      await EmailService.sendVerificationEmail('user@example.com', '123456');

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('123456', 20);
    });

    it('should include security warnings in email', async () => {
      await EmailService.sendVerificationEmail('user@example.com', '123456');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('This code will expire in 24 hours');
      expect(emailCall.html).toContain('Never share this code with anyone');
      expect(emailCall.text).toContain('This code will expire in 24 hours');
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(() => {
      EmailService.initialize();
    });

    it('should send password reset email with correct content', async () => {
      const resetToken = 'a'.repeat(25);
      await EmailService.sendPasswordResetEmail('user@example.com', resetToken);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: '🔒 Password Reset - Tic Tac Toe Game',
          html: expect.stringContaining(`${mockConfig.FRONTEND_URL}/reset-password?token=${resetToken}`),
          text: expect.stringContaining(`${mockConfig.FRONTEND_URL}/reset-password?token=${resetToken}`)
        })
      );
    });

    it('should validate reset token', async () => {
      await expect(EmailService.sendPasswordResetEmail('user@example.com', ''))
        .rejects.toThrow('Invalid reset token');

      await expect(EmailService.sendPasswordResetEmail('user@example.com', 'short'))
        .rejects.toThrow('Invalid reset token');
    });

    it('should sanitize reset token', async () => {
      const resetToken = 'a'.repeat(25);
      await EmailService.sendPasswordResetEmail('user@example.com', resetToken);

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith(resetToken, 100);
    });

    it('should include security warnings in email', async () => {
      const resetToken = 'a'.repeat(25);
      await EmailService.sendPasswordResetEmail('user@example.com', resetToken);

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('This link will expire in 1 hour');
      expect(emailCall.html).toContain('Never share this link with anyone');
    });
  });

  describe('sendGameNotificationEmail', () => {
    beforeEach(() => {
      EmailService.initialize();
    });

    it('should send game notification email for win', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'win', 'Opponent');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('WIN vs Opponent'),
          html: expect.stringContaining('🏆'),
          text: expect.stringContaining('WIN')
        })
      );
    });

    it('should send game notification email for loss', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'loss', 'Opponent');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('😔');
      expect(emailCall.subject).toContain('loss vs Opponent');
    });

    it('should send game notification email for draw', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'draw', 'Opponent');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('🤝');
      expect(emailCall.subject).toContain('draw vs Opponent');
    });

    it('should send game notification email for forfeit', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'forfeit', 'Opponent');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('🏃‍♂️');
      expect(emailCall.subject).toContain('forfeit vs Opponent');
    });

    it('should validate game result', async () => {
      await expect(EmailService.sendGameNotificationEmail('user@example.com', 'invalid', 'Opponent'))
        .rejects.toThrow('Invalid game result');
    });

    it('should sanitize opponent name and game result', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'win', 'Opponent Name');

      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('Opponent Name', 50);
      expect(mockAuthUtils.validateAndSanitizeInput).toHaveBeenCalledWith('win', 20);
    });

    it('should handle case insensitive game results', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'WIN', 'Opponent');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('🏆');
    });

    it('should include game information in email', async () => {
      await EmailService.sendGameNotificationEmail('user@example.com', 'win', 'TestOpponent');

      const emailCall = mockTransporter.sendMail.mock.calls[0][0];
      expect(emailCall.html).toContain('TestOpponent');
      expect(emailCall.html).toContain('win');
      expect(emailCall.html).toContain('Finished:');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle validation errors in sendEmail', async () => {
      mockAuthUtils.validateAndSanitizeInput.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      await expect(EmailService.sendEmail({
        to: 'test@example.com',
        subject: 'Test'
      })).rejects.toThrow();
    });

    it('should handle rate limiting edge cases', () => {
      // Test with undefined email queue entry
      const result = EmailService.checkEmailRateLimit('new@example.com');
      expect(result).toBe(true);
    });

    it('should handle email validation with malformed addresses', () => {
      const result = EmailService.validateEmail('test@');
      // Should not crash and should return validation result
      expect(typeof result.isValid).toBe('boolean');
    });
  });
});

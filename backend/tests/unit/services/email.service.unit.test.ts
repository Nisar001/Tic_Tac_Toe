// Unit tests for email.service.ts
import nodemailer from 'nodemailer';
import { EmailService } from '../../../src/services/email.service';
import { config } from '../../../src/config';

jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
(nodemailer as any).createTransport = mockCreateTransport;

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize transporter correctly', () => {
    EmailService.initialize();

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_PORT === 465,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  });

  it('should send email successfully', async () => {
    const emailOptions = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      text: 'Test',
    };

    await EmailService.sendEmail(emailOptions);

    expect(mockSendMail).toHaveBeenCalledWith({
      from: config.EMAIL_FROM,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      text: emailOptions.text,
    });
  });

  it('should throw error if email sending fails', async () => {
    mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));

    const emailOptions = {
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test</p>',
      text: 'Test',
    };

    await expect(EmailService.sendEmail(emailOptions)).rejects.toThrow('Failed to send email');
  });

  it('should send verification email successfully', async () => {
    const email = 'test@example.com';
    const verificationCode = '123456';

    await EmailService.sendVerificationEmail(email, verificationCode);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      subject: '🎮 Verify Your Email - Tic Tac Toe Game',
      html: expect.stringContaining(verificationCode),
      text: expect.stringContaining(verificationCode),
    }));
  });

  it('should send password reset email successfully', async () => {
    const email = 'test@example.com';
    const resetToken = 'reset-token';

    await EmailService.sendPasswordResetEmail(email, resetToken);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      subject: '🔒 Reset Your Password - Tic Tac Toe Game',
      html: expect.stringContaining(resetToken),
      text: expect.stringContaining(resetToken),
    }));
  });

  it('should send game update email successfully', async () => {
    const email = 'test@example.com';
    const gameResult = 'win';
    const opponent = 'opponentUser';

    await EmailService.sendGameUpdateEmail(email, gameResult, opponent);

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: email,
      subject: `🎮 Game Result: ${gameResult} - Tic Tac Toe Game`,
      html: expect.stringContaining(opponent),
      text: expect.stringContaining(opponent),
    }));
  });
});

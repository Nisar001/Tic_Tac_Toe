import nodemailer from 'nodemailer';
import { config } from '../config';
import { AuthUtils } from '../utils/auth.utils';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: any[];
}

export interface EmailValidationResult {
  isValid: boolean;
  reason?: string;
}

export class EmailService {
  private static transporter: any;
  private static emailQueue: Map<string, number> = new Map();
  private static readonly MAX_EMAILS_PER_HOUR = 10;
  private static readonly EMAIL_COOLDOWN_MS = 60 * 1000; // 1 minute cooldown

  /**
   * Initialize the Nodemailer transporter
   */
  static initialize(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        secure: config.EMAIL_PORT === 465,
        auth: {
          user: config.EMAIL_USER,
          pass: config.EMAIL_PASS,
        },
        requireTLS: true,
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 14,
      });

      this.transporter.verify((error: any, success: any) => {
        if (error) {

        } else {

        }
      });
    } catch (error) {

      throw new Error('Email service failed to initialize.');
    }
  }

  /**
   * Validate email address format and integrity
   */
  static validateEmail(email: string): EmailValidationResult {
    if (!AuthUtils.isValidEmail(email)) {
      return { isValid: false, reason: 'Invalid email format' };
    }

    if (AuthUtils.isSuspiciousEmail(email)) {
      return { isValid: false, reason: 'Suspicious email address' };
    }

    const disposableDomains = [
      '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'tempmail.org', 'throwaway.email', 'getnada.com',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) {
      return { isValid: false, reason: 'Disposable email domain is not allowed' };
    }

    return { isValid: true };
  }

  /**
   * Enforce rate limiting for email sends per user
   */
  static checkEmailRateLimit(email: string): boolean {
    const now = Date.now();
    const key = email.toLowerCase();

    // Remove entries older than 1 hour
    for (const [emailKey, timestamp] of this.emailQueue.entries()) {
      if (now - timestamp > 60 * 60 * 1000) {
        this.emailQueue.delete(emailKey);
      }
    }

    const recentEmails = Array.from(this.emailQueue.values())
      .filter(ts => now - ts < 60 * 60 * 1000);

    if (recentEmails.length >= this.MAX_EMAILS_PER_HOUR) return false;

    const lastSent = this.emailQueue.get(key);
    if (lastSent && now - lastSent < this.EMAIL_COOLDOWN_MS) return false;

    return true;
  }

  /**
   * Generalized email send method with validation and sanitization
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const validation = this.validateEmail(options.to);
      if (!validation.isValid) throw new Error(`Invalid email: ${validation.reason}`);

      if (!this.checkEmailRateLimit(options.to)) {
        throw new Error('Email rate limit exceeded');
      }

      const sanitized = {
        to: AuthUtils.validateAndSanitizeInput(options.to, 255),
        subject: AuthUtils.validateAndSanitizeInput(options.subject, 255),
        html: options.html?.slice(0, 10000),
        text: options.text ? AuthUtils.validateAndSanitizeInput(options.text, 5000) : undefined,
        attachments: options.attachments || [],
      };

      if (!this.transporter) this.initialize();

      const mailOptions = {
        from: `"Tic Tac Toe Game" <${config.EMAIL_FROM}>`,
        to: sanitized.to,
        subject: sanitized.subject,
        html: sanitized.html,
        text: sanitized.text,
        attachments: sanitized.attachments,
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'Tic Tac Toe Game',
        },
      };

      const result = await this.transporter.sendMail(mailOptions);
      this.emailQueue.set(options.to.toLowerCase(), Date.now());


    } catch (error: any) {

      throw new Error(`Send email failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Send verification email with styled HTML
   */
  static async sendVerificationEmail(email: string, code: string): Promise<void> {
    if (!code || code.length < 6) throw new Error('Invalid verification code');

    const sanitizedCode = AuthUtils.validateAndSanitizeInput(code, 20);

    const html = `<p>Your verification code is: <strong>${sanitizedCode}</strong></p>`;
    const text = `Your verification code is: ${sanitizedCode}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Tic Tac Toe',
      html,
      text,
    });
  }

  /**
   * Send password reset email with secure token link
   */
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!token || token.length < 20) throw new Error('Invalid reset token');

    const sanitizedToken = AuthUtils.validateAndSanitizeInput(token, 100);
    const resetLink = `${config.FRONTEND_URL}/reset-password?token=${sanitizedToken}`;

    const html = `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`;
    const text = `Reset your password using this link: ${resetLink}`;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset - Tic Tac Toe',
      html,
      text,
    });
  }

  /**
   * Send game result notification to a user
   */
  static async sendGameNotificationEmail(email: string, result: string, opponent: string): Promise<void> {
    const validResults = ['win', 'loss', 'draw', 'forfeit'];
    if (!validResults.includes(result.toLowerCase())) {
      throw new Error('Invalid game result');
    }

    const resultUpper = AuthUtils.validateAndSanitizeInput(result, 20).toUpperCase();
    const opponentSanitized = AuthUtils.validateAndSanitizeInput(opponent, 50);

    const html = `<p>You played against <strong>${opponentSanitized}</strong>. Result: <strong>${resultUpper}</strong></p>`;
    const text = `Opponent: ${opponentSanitized}\nResult: ${resultUpper}`;

    await this.sendEmail({
      to: email,
      subject: `Game Result: ${resultUpper} vs ${opponentSanitized}`,
      html,
      text,
    });
  }
}

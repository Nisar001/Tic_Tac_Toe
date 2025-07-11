import twilio, { Twilio } from 'twilio';
import { config } from '../config';
import { logError, logInfo, logWarn } from '../utils/logger';

export interface SMSValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedPhone?: string;
}

export interface SMSRateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
}

export class SMSService {
  private static client: Twilio;
  private static isInitialized = false;

  // Rate limiting maps
  private static phoneNumberAttempts: Map<string, Date[]> = new Map();
  private static ipAttempts: Map<string, Date[]> = new Map();

  // Constants
  private static readonly MAX_SMS_PER_PHONE_PER_HOUR = 5;
  private static readonly MAX_SMS_PER_IP_PER_HOUR = 20;
  private static readonly BLOCKED_PATTERNS = [
    /test/i, /spam/i, /fake/i, /\+1234567890/, /000000000/
  ];

  /**
   * Initialize Twilio client
   */
  static initialize(): { success: boolean; error?: string } {
    if (this.isInitialized && this.client) return { success: true };

    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || !config.TWILIO_PHONE_NUMBER) {
      const error = 'Twilio config missing';
      logWarn(error);
      return { success: false, error };
    }

    try {
      this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      this.isInitialized = true;
      logInfo('SMSService initialized');
      return { success: true };
    } catch (err) {
      logError(`Failed to initialize SMSService: ${err}`);
      return { success: false, error: 'Twilio init failed' };
    }
  }

  /**
   * Validate and sanitize phone number
   */
  private static validatePhoneNumber(phoneNumber: string): SMSValidationResult {
    const errors: string[] = [];

    if (!phoneNumber) return { isValid: false, errors: ['Phone number is required'] };

    const digits = phoneNumber.replace(/\D/g, '');
    let formatted = phoneNumber.trim();

    if (digits.length < 10 || digits.length > 15) {
      errors.push('Phone number must be 10-15 digits');
    }

    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(phoneNumber)) {
        errors.push('Phone number is blocked/test/fake');
        break;
      }
    }

    if (errors.length === 0) {
      if (digits.length === 10) formatted = `+1${digits}`;
      else if (!phoneNumber.startsWith('+')) formatted = `+${digits}`;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedPhone: errors.length === 0 ? formatted : undefined
    };
  }

  /**
   * Check rate limit
   */
  private static checkRateLimit(phone: string, ip?: string): SMSRateLimitResult {
    const now = new Date();
    const limitWindow = new Date(now.getTime() - 3600000);

    const phoneAttempts = (this.phoneNumberAttempts.get(phone) || []).filter(attempt => attempt > limitWindow);
    if (phoneAttempts.length >= this.MAX_SMS_PER_PHONE_PER_HOUR) {
      return { allowed: false, reason: 'Too many SMS to this phone', retryAfter: 3600 };
    }

    if (ip) {
      const ipAttempts = (this.ipAttempts.get(ip) || []).filter(attempt => attempt > limitWindow);
      if (ipAttempts.length >= this.MAX_SMS_PER_IP_PER_HOUR) {
        return { allowed: false, reason: 'Too many SMS from this IP', retryAfter: 3600 };
      }
    }

    return { allowed: true };
  }

  /**
   * Record SMS attempts
   */
  private static recordAttempt(phone: string, ip?: string) {
    const now = new Date();

    const updatedPhone = (this.phoneNumberAttempts.get(phone) || []);
    updatedPhone.push(now);
    this.phoneNumberAttempts.set(phone, updatedPhone);

    if (ip) {
      const updatedIp = (this.ipAttempts.get(ip) || []);
      updatedIp.push(now);
      this.ipAttempts.set(ip, updatedIp);
    }
  }

  /**
   * Sanitize SMS message
   */
  private static sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') return '';
    return message
      .trim()
      .substring(0, 1600)
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/[^\x20-\x7E\r\n]/g, ''); // Keep ASCII
  }

  /**
   * Core sendSMS method
   */
  static async sendSMS(to: string, msg: string, ip?: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    const init = this.initialize();
    if (!init.success) return { success: false, error: init.error };

    const valid = this.validatePhoneNumber(to);
    if (!valid.isValid || !valid.sanitizedPhone) {
      return { success: false, error: valid.errors.join(', ') };
    }

    const rateLimit = this.checkRateLimit(valid.sanitizedPhone, ip);
    if (!rateLimit.allowed) return { success: false, error: rateLimit.reason };

    const cleanMsg = this.sanitizeMessage(msg);
    if (!cleanMsg) return { success: false, error: 'Invalid SMS message' };

    try {
      const result = await this.client.messages.create({
        body: cleanMsg,
        from: config.TWILIO_PHONE_NUMBER!,
        to: valid.sanitizedPhone,
      });

      this.recordAttempt(valid.sanitizedPhone, ip);
      logInfo(`✅ SMS sent to ${valid.sanitizedPhone}`);
      return { success: true, messageId: result.sid };
    } catch (err) {
      logError(`❌ Failed to send SMS: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return { success: false, error: 'SMS sending failed' };
    }
  }

  /**
   * Send verification code
   */
  static async sendVerificationSMS(phone: string, code: string, ip?: string) {
    if (!/^\d{6}$/.test(code)) return { success: false, error: 'Invalid verification code' };
    const msg = `🎮 Your verification code is: ${code}. It expires in 10 minutes.`;
    return await this.sendSMS(phone, msg, ip);
  }

  /**
   * Send game-related notification
   */
  static async sendGameNotificationSMS(phone: string, notification: string, ip?: string) {
    if (!notification || notification.length > 500) return { success: false, error: 'Invalid notification message' };
    const msg = `🎮 Tic Tac Toe - ${notification}`;
    return await this.sendSMS(phone, msg, ip);
  }

  /**
   * Validate phone number
   */
  static isValidPhoneNumber(phone: string): boolean {
    return this.validatePhoneNumber(phone).isValid;
  }

  /**
   * Format a phone number
   */
  static formatPhoneNumber(phone: string): { success: boolean; formatted?: string; error?: string } {
    const result = this.validatePhoneNumber(phone);
    return result.isValid ? { success: true, formatted: result.sanitizedPhone } : { success: false, error: result.errors[0] };
  }

  /**
   * Cleanup old attempts
   */
  static cleanupRateLimitData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const [phone, attempts] of this.phoneNumberAttempts.entries()) {
      const recent = attempts.filter(a => a > cutoff);
      if (recent.length) this.phoneNumberAttempts.set(phone, recent);
      else this.phoneNumberAttempts.delete(phone);
    }

    for (const [ip, attempts] of this.ipAttempts.entries()) {
      const recent = attempts.filter(a => a > cutoff);
      if (recent.length) this.ipAttempts.set(ip, recent);
      else this.ipAttempts.delete(ip);
    }

    logInfo('🧹 SMS rate limit data cleaned');
  }

  /**
   * Get SMS service status
   */
  static getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      isConfigured: !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER),
      rateLimitStats: {
        totalPhoneNumbers: this.phoneNumberAttempts.size,
        totalIPs: this.ipAttempts.size
      }
    };
  }
}

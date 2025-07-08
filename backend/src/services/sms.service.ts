import twilio from 'twilio';
import { config } from '../config';

export class SMSService {
  private static client: twilio.Twilio;

  static initialize() {
    if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
      this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    }
  }

  static async sendSMS(to: string, message: string): Promise<void> {
    try {
      if (!this.client) {
        this.initialize();
      }

      if (!this.client) {
        throw new Error('Twilio client not initialized. Check your credentials.');
      }

      await this.client.messages.create({
        body: message,
        from: config.TWILIO_PHONE_NUMBER,
        to: to,
      });
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  static async sendVerificationSMS(phoneNumber: string, verificationCode: string): Promise<void> {
    const message = `🎮 Tic Tac Toe Game - Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`;
    await this.sendSMS(phoneNumber, message);
  }

  static async sendGameNotificationSMS(phoneNumber: string, message: string): Promise<void> {
    const formattedMessage = `🎮 Tic Tac Toe Game - ${message}`;
    await this.sendSMS(phoneNumber, formattedMessage);
  }

  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      return `+1${cleaned}`; // Default to US
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      return `+${cleaned}`;
    }
    
    return cleaned;
  }

  static isValidPhoneNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
}

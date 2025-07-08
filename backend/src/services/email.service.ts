import nodemailer from 'nodemailer';
import { config } from '../config';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  static initialize() {
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_PORT === 465,
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS,
      },
    });
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!this.transporter) {
        this.initialize();
      }

      await this.transporter.sendMail({
        from: config.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  static async sendVerificationEmail(email: string, verificationCode: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .verification-code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; margin: 20px 0; letter-spacing: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Tic Tac Toe Game</h1>
              <h2>Email Verification</h2>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>Thank you for signing up for our Tic Tac Toe game! To complete your registration, please verify your email address using the code below:</p>
              
              <div class="verification-code">${verificationCode}</div>
              
              <p>This verification code will expire in 10 minutes for security reasons.</p>
              
              <p>If you didn't create an account with us, please ignore this email.</p>
              
              <p>Best regards,<br>The Tic Tac Toe Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🎮 Verify Your Email - Tic Tac Toe Game',
      html,
      text: `Your verification code is: ${verificationCode}. This code will expire in 10 minutes.`,
    });
  }

  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Tic Tac Toe Game</h1>
              <h2>Password Reset</h2>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              
              <a href="${resetUrl}" class="button">Reset Password</a>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p>${resetUrl}</p>
              
              <p>This link will expire in 1 hour for security reasons.</p>
              
              <p>If you didn't request a password reset, please ignore this email.</p>
              
              <p>Best regards,<br>The Tic Tac Toe Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: '🔒 Reset Your Password - Tic Tac Toe Game',
      html,
      text: `Reset your password by visiting: ${resetUrl}. This link will expire in 1 hour.`,
    });
  }

  static async sendGameUpdateEmail(email: string, gameResult: string, opponent: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Game Update</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .result { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
            .win { color: #4caf50; }
            .lose { color: #f44336; }
            .draw { color: #ff9800; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Tic Tac Toe Game</h1>
              <h2>Game Update</h2>
            </div>
            <div class="content">
              <p>Hello!</p>
              <p>Your recent game against <strong>${opponent}</strong> has ended:</p>
              
              <div class="result ${gameResult.toLowerCase()}">${gameResult.toUpperCase()}</div>
              
              <p>Thanks for playing! Ready for another match?</p>
              
              <p>Best regards,<br>The Tic Tac Toe Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: `🎮 Game Result: ${gameResult} - Tic Tac Toe Game`,
      html,
      text: `Your game against ${opponent} has ended: ${gameResult}`,
    });
  }
}

import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
import rateLimit from 'express-rate-limit';
import User from '../../../models/user.model';

// Limit to 3 resend attempts per 15 minutes per IP
export const resendVerificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many verification requests. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw createError.badRequest('Email is required');
    }

    const sanitizedEmail = email.trim().toLowerCase();

    if (!AuthUtils.isValidEmail(sanitizedEmail)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    if (AuthUtils.isSuspiciousEmail(sanitizedEmail)) {
      throw createError.badRequest('Invalid email format');
    }

    const user = await User.findOne({ email: sanitizedEmail });

    // Security: Always return same success response for non-existent users
    const genericSuccess = {
      success: true,
      message: 'If the email is registered and not verified, a verification email has been sent'
    };

    if (!user) {
      return res.json(genericSuccess);
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const now = new Date();
    const lastRequest = user.lastVerificationRequest;
    const cooldownMs = 60 * 1000; // 1 minute cooldown

    if (lastRequest && now.getTime() - lastRequest.getTime() < cooldownMs) {
      throw createError.tooManyRequests('Please wait at least 1 minute before requesting another verification email');
    }

    const verificationCode = AuthUtils.generateVerificationCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 mins

    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpiry = expiry;
    user.lastVerificationRequest = now;

    await user.save();

    try {
      await EmailService.sendVerificationEmail(sanitizedEmail, verificationCode);
    } catch (emailErr) {
      console.error('Verification email failed:', emailErr);

      // Reset fields if email fails
      user.emailVerificationToken = undefined;
      user.emailVerificationExpiry = undefined;
      user.lastVerificationRequest = undefined;
      await user.save();

      throw createError.serviceUnavailable('Failed to send verification email. Please try again later.');
    }

    return res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (err) {
    // Fallback: if error is known, send it; else, return generic error
    if (
      typeof err === 'object' &&
      err !== null &&
      'statusCode' in err &&
      'message' in err
    ) {
      throw err;
    }

    console.error('Resend verification error:', err);
    throw createError.internal('Verification email process failed');
  }
});

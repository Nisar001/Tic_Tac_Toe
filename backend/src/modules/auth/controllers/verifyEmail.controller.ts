import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { email, verificationCode } = req.body;

    // Input presence validation
    if (!email || !verificationCode) {
      throw createError.badRequest('Email and verification code are required');
    }

    // Email format validation
    const sanitizedEmail = email.trim().toLowerCase();
    if (!AuthUtils.isValidEmail(sanitizedEmail)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    // Verification code format
    const code = verificationCode.toString().trim();
    if (!/^\d{6}$/.test(code)) {
      throw createError.badRequest('Verification code must be a 6-digit number');
    }

    // Find user with unexpired verification token
    const user = await User.findOne({
      email: sanitizedEmail,
      emailVerificationToken: code,
      emailVerificationExpiry: { $gt: new Date() }
    });

    if (!user) {
      throw createError.badRequest('Invalid or expired verification code');
    }

    // Already verified
    if (user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'Email is already verified'
      });
    }

    // Mark as verified and clean up fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.lastVerificationRequest = undefined;

    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    throw createError.internal('Failed to verify email. Please try again.');
  }
});

import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logError, logInfo, logWarn } from '../../../utils/logger';
import User from '../../../models/user.model';

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    const { email, verificationCode } = req.body;

    // Enhanced input validation
    if (!email || !verificationCode) {
      throw createError.badRequest('Email and verification code are required');
    }

    if (typeof email !== 'string' || typeof verificationCode !== 'string') {
      throw createError.badRequest('Email and verification code must be strings');
    }

    // Email format validation
    const sanitizedEmail = email.trim().toLowerCase();
    if (!AuthUtils.isValidEmail(sanitizedEmail)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    // Verification code format validation
    const code = verificationCode.toString().trim();
    if (!/^\d{6}$/.test(code)) {
      throw createError.badRequest('Verification code must be a 6-digit number');
    }

    // Find user with unexpired verification token
    const user = await User.findOne({
      email: sanitizedEmail,
      emailVerificationToken: code,
      emailVerificationExpiry: { $gt: new Date() }
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      logWarn(`Invalid or expired verification attempt for email: ${sanitizedEmail} from IP: ${clientIP}`);
      throw createError.badRequest('Invalid or expired verification code');
    }

    // Check if already verified
    if (user.isEmailVerified) {
      logInfo(`Email verification attempt for already verified account: ${sanitizedEmail}`);
      return res.json({
        success: true,
        message: 'Email is already verified',
        data: {
          alreadyVerified: true
        }
      });
    }

    // Mark as verified and clean up verification fields
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.lastVerificationRequest = undefined;

    try {
      await user.save();
      logInfo(`Email verified successfully for user: ${user.username} (${sanitizedEmail}) from IP: ${clientIP}`);
    } catch (saveError) {
      logError(`Failed to save email verification for user ${user._id}: ${saveError}`);
      throw createError.internal('Email verification failed. Please try again.');
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Email verification completed in ${duration}ms for user: ${user.username}`);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        verifiedAt: new Date(),
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Email verification failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

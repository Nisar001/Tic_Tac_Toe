import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
import rateLimit from 'express-rate-limit';
import User from '../../../models/user.model';

// Rate limit: 3 password reset requests per hour per IP
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
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

    const successMessage = 'If the email exists, a password reset link has been sent';

    const user = await User.findOne({ email: sanitizedEmail });

    if (!user) {
      return res.json({ success: true, message: successMessage });
    }

    // Optional: prevent reset for deleted/blocked accounts
    if (user.isDeleted || user.isBlocked) {
      return res.json({ success: true, message: successMessage });
    }

    const now = new Date();
    const lastReset = user.lastPasswordResetRequest;
    const timeSinceLast = lastReset ? now.getTime() - lastReset.getTime() : Infinity;

    if (timeSinceLast < 5 * 60 * 1000) {
      return res.json({ success: true, message: successMessage });
    }

    const resetToken = AuthUtils.generateSecureToken(64);
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpiry = resetExpiry;
    user.lastPasswordResetRequest = now;

    await user.save();

    try {
      await EmailService.sendPasswordResetEmail(sanitizedEmail, resetToken);
    } catch (emailErr) {


      user.passwordResetToken = undefined;
      user.passwordResetTokenExpiry = undefined;
      user.lastPasswordResetRequest = undefined;
      await user.save();

      throw createError.serviceUnavailable('Failed to send reset email. Please try again later.');
    }

    return res.json({ success: true, message: successMessage });
  } catch (err) {
    throw createError.internal((err as Error).message || 'Password reset failed');
  }
});

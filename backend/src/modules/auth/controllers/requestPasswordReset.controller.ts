import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
const User = require('../../../models/user.model');

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw createError.badRequest('Email is required');
  }

  if (!AuthUtils.isValidEmail(email)) {
    throw createError.badRequest('Please provide a valid email address');
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
    return;
  }

  const resetToken = AuthUtils.generateSecureToken();
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpiry = resetExpiry;

  await user.save();

  await EmailService.sendPasswordResetEmail(email, resetToken);

  res.json({
    success: true,
    message: 'If the email exists, a password reset link has been sent'
  });
});

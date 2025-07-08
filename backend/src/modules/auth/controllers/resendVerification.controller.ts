import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
const User = require('../../../models/user.model');

export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    throw createError.badRequest('Email is required');
  }

  if (!AuthUtils.isValidEmail(email)) {
    throw createError.badRequest('Please provide a valid email address');
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw createError.notFound('User not found');
  }

  if (user.isEmailVerified) {
    throw createError.badRequest('Email is already verified');
  }

  const verificationCode = AuthUtils.generateVerificationCode();
  const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.emailVerificationToken = verificationCode;
  user.emailVerificationExpiry = verificationExpiry;

  await user.save();

  await EmailService.sendVerificationEmail(email, verificationCode);

  res.json({
    success: true,
    message: 'Verification email sent successfully'
  });
});

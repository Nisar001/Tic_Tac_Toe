import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
const User = require('../../../models/user.model');

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    throw createError.badRequest('Email and verification code are required');
  }

  if (!AuthUtils.isValidEmail(email)) {
    throw createError.badRequest('Please provide a valid email address');
  }

  if (!/^\\d{6}$/.test(verificationCode)) {
    throw createError.badRequest('Verification code must be 6 digits');
  }

  const user = await User.findOne({
    email,
    emailVerificationToken: verificationCode,
    emailVerificationExpiry: { $gt: new Date() }
  });

  if (!user) {
    throw createError.badRequest('Invalid or expired verification code');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save();

  res.json({
    success: true,
    message: 'Email verified successfully'
  });
});

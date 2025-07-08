import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
import { config } from '../../../config';
const User = require('../../../models/user.model');

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, phoneNumber, dateOfBirth } = req.body;

  if (!username || !email || !password) {
    throw createError.badRequest('Username, email, and password are required');
  }

  if (username.length < 3 || username.length > 20) {
    throw createError.badRequest('Username must be between 3 and 20 characters');
  }

  if (!AuthUtils.isValidEmail(email)) {
    throw createError.badRequest('Please provide a valid email address');
  }

  if (!AuthUtils.isValidPassword(password)) {
    throw createError.badRequest('Password must be at least 6 characters with letters and numbers');
  }

  if (phoneNumber && !AuthUtils.isValidPhoneNumber(phoneNumber)) {
    throw createError.badRequest('Please provide a valid phone number');
  }

  if (dateOfBirth) {
    const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
    if (age < 13) {
      throw createError.badRequest('You must be at least 13 years old to register');
    }
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw createError.conflict('Email is already registered');
    }
    if (existingUser.username === username) {
      throw createError.conflict('Username is already taken');
    }
  }

  const hashedPassword = await AuthUtils.hashPassword(password);
  const verificationCode = AuthUtils.generateVerificationCode();
  const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = new User({
    username,
    email,
    password: hashedPassword,
    phoneNumber,
    dateOfBirth,
    emailVerificationToken: verificationCode,
    emailVerificationExpiry: verificationExpiry,
    energy: config.ENERGY_CONFIG.MAX_ENERGY,
    lastEnergyUpdate: new Date(),
    level: 1,
    totalXP: 0
  });

  await user.save();

  try {
    await EmailService.sendVerificationEmail(email, verificationCode);
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email.',
    data: {
      userId: user._id,
      email: user.email,
      username: user.username,
      verificationSent: true
    }
  });
});

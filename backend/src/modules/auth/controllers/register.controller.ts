import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
import { config } from '../../../config';
import User from '../../../models/user.model';

// Rate limit: 5 registration attempts per IP per hour
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { username, email, password, phoneNumber, dateOfBirth } = req.body;

    // Required fields check
    if (!username || !email || !password) {
      throw createError.badRequest('Username, email, and password are required');
    }

    // Sanitize and validate inputs
    const sanitizedUsername = AuthUtils.validateAndSanitizeInput(username, 20);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhoneNumber = phoneNumber
      ? AuthUtils.validateAndSanitizeInput(phoneNumber, 20)
      : undefined;

    const usernameValidation = AuthUtils.isValidUsernameSecure(sanitizedUsername);
    if (!usernameValidation.valid) {
      throw createError.badRequest(usernameValidation.reason!);
    }

    if (!AuthUtils.isValidEmail(sanitizedEmail)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    if (AuthUtils.isSuspiciousEmail(sanitizedEmail)) {
      throw createError.badRequest('Invalid email format');
    }

    if (!AuthUtils.isValidPassword(password)) {
      throw createError.badRequest('Password must be at least 6 characters with letters and numbers');
    }

    if (AuthUtils.isCommonPassword(password)) {
      throw createError.badRequest('Password is too common. Please choose a stronger password');
    }

    if (sanitizedPhoneNumber && !AuthUtils.isValidPhoneNumber(sanitizedPhoneNumber)) {
      throw createError.badRequest('Please provide a valid phone number');
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) {
        throw createError.badRequest('Please provide a valid date of birth');
      }

      const age = new Date().getFullYear() - birthDate.getFullYear();
      if (age < 13) {
        throw createError.badRequest('You must be at least 13 years old to register');
      }
      if (age > 150) {
        throw createError.badRequest('Please provide a valid date of birth');
      }
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email: sanitizedEmail }, { username: sanitizedUsername }]
    });

    if (existingUser) {
      if (existingUser.email === sanitizedEmail) {
        throw createError.conflict('Email is already registered');
      }
      if (existingUser.username === sanitizedUsername) {
        throw createError.conflict('Username is already taken');
      }
    }

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Generate verification code
    const verificationCode = AuthUtils.generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: hashedPassword,
      provider: 'manual',
      phoneNumber: sanitizedPhoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      emailVerificationToken: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      energy: config.ENERGY_CONFIG?.MAX_ENERGY || 100,
      lastEnergyUpdate: new Date(),
      level: 1,
      totalXP: 0,
      registrationIP: req.ip,
      registrationUserAgent: req.get('User-Agent')
    });

    await user.save();

    // Send verification email (non-blocking)
    try {
      await EmailService.sendVerificationEmail(sanitizedEmail, verificationCode);
    } catch (emailError) {
      console.error(`Failed to send verification email to ${sanitizedEmail}:`, emailError);
      // Don’t throw here; registration succeeds, email can be retried
    }

    // Response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        userId: user._id,
        email: user.email,
        username: user.username,
        verificationSent: true
      }
    });
  } catch (error) {
    throw createError.internal((error as Error).message || 'Registration failed');
  }
});

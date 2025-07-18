import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { EmailService } from '../../../services/email.service';
import { config } from '../../../config';
import User from '../../../models/user.model';
import { logError, logInfo, logWarn } from '../../../utils/logger';

// Production-ready rate limit: Stricter for registration
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 3 : 10, // 3 in prod, 10 in dev
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after an hour.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful registrations
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  try {
    const { username, email, password, confirmPassword, phoneNumber, dateOfBirth } = req.body;

    // Enhanced input validation
    if (!username || !email || !password) {
      logWarn(`Registration attempt with missing fields from IP: ${clientIP}`);
      throw createError.badRequest('Username, email, and password are required');
    }

    // Type validation
    if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      logWarn(`Registration attempt with invalid types from IP: ${clientIP}`);
      throw createError.badRequest('Username, email, and password must be strings');
    }

    // Password confirmation validation
    if (confirmPassword && password !== confirmPassword) {
      throw createError.badRequest('Passwords do not match');
    }

    // Enhanced input sanitization
    const sanitizedUsername = AuthUtils.validateAndSanitizeInput(username.trim(), 20);
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPhoneNumber = phoneNumber
      ? AuthUtils.validateAndSanitizeInput(phoneNumber.trim(), 20)
      : undefined;

    // Enhanced username validation
    const usernameValidation = AuthUtils.isValidUsernameSecure(sanitizedUsername);
    if (!usernameValidation.valid) {
      throw createError.badRequest(usernameValidation.reason!);
    }

    // Enhanced email validation
    if (!AuthUtils.isValidEmail(sanitizedEmail)) {
      throw createError.badRequest('Please provide a valid email address');
    }

    if (AuthUtils.isSuspiciousEmail(sanitizedEmail)) {
      logWarn(`Suspicious email registration attempt: ${sanitizedEmail} from IP: ${clientIP}`);
      throw createError.badRequest('Email address not allowed');
    }

    // Enhanced password validation
    if (!AuthUtils.isValidPassword(password)) {
      throw createError.badRequest('Password must be at least 6 characters with letters and numbers');
    }

    if (AuthUtils.isCommonPassword(password)) {
      throw createError.badRequest('Password is too common. Please choose a stronger password');
    }

    // Phone number validation if provided
    if (sanitizedPhoneNumber && !AuthUtils.isValidPhoneNumber(sanitizedPhoneNumber)) {
      throw createError.badRequest('Please provide a valid phone number');
    }

    // Enhanced date of birth validation
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      if (isNaN(birthDate.getTime())) {
        throw createError.badRequest('Please provide a valid date of birth');
      }

      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // More precise age calculation
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 : age;

      if (actualAge < 13) {
        throw createError.badRequest('You must be at least 13 years old to register');
      }
      if (actualAge > 150 || birthDate > today) {
        throw createError.badRequest('Please provide a valid date of birth');
      }
    }

    // Enhanced duplicate user check with better error handling
    const existingUser = await User.findOne({
      $or: [
        { email: sanitizedEmail },
        { username: sanitizedUsername }
      ]
    }).select('email username isDeleted');

    if (existingUser) {
      // Check if user is soft deleted
      if (existingUser.isDeleted) {
        logInfo(`Attempt to register with deleted account: ${sanitizedEmail}`);
        throw createError.conflict('This account has been deactivated. Please contact support.');
      }

      if (existingUser.email === sanitizedEmail) {
        logWarn(`Duplicate email registration attempt: ${sanitizedEmail} from IP: ${clientIP}`);
        throw createError.conflict('Email is already registered');
      }
      if (existingUser.username === sanitizedUsername) {
        logWarn(`Duplicate username registration attempt: ${sanitizedUsername} from IP: ${clientIP}`);
        throw createError.conflict('Username is already taken');
      }
    }

    // Enhanced password hashing with error handling
    let hashedPassword: string;
    try {
      hashedPassword = await AuthUtils.hashPassword(password);
    } catch (hashError) {
      logError(`Password hashing failed during registration: ${hashError}`);
      throw createError.internal('Registration failed. Please try again.');
    }

    // Generate verification code
    const verificationCode = AuthUtils.generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user with enhanced error handling
    const user = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: hashedPassword,
      provider: 'manual',
      phoneNumber: sanitizedPhoneNumber,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      emailVerificationToken: verificationCode,
      emailVerificationExpiry: verificationExpiry,
      lives: config.LIVES_CONFIG?.MAX_LIVES || 15,
      maxLives: config.LIVES_CONFIG?.MAX_LIVES || 15,
      lastLivesUpdate: new Date(),
      lastLivesRegenTime: new Date(),
      level: 1,
      totalXP: 0,
      registrationIP: clientIP,
      registrationUserAgent: userAgent,
      isEmailVerified: config.FEATURES.EMAIL_VERIFICATION_REQUIRED ? false : true
    });

    try {
      await user.save();
      logInfo(`User registered successfully: ${sanitizedUsername} (${sanitizedEmail})`);
    } catch (saveError: any) {
      logError(`User save failed during registration: ${saveError.message}`);
      throw createError.internal('Registration failed. Please try again.');
    }

    // Send verification email only if required
    let emailSent = false;
    if (config.FEATURES.EMAIL_VERIFICATION_REQUIRED) {
      try {
        await EmailService.sendVerificationEmail(sanitizedEmail, verificationCode);
        emailSent = true;
        logInfo(`Verification email sent to: ${sanitizedEmail}`);
      } catch (emailError) {
        logError(`Failed to send verification email to ${sanitizedEmail}: ${emailError}`);
        // Don't fail registration if email service is down
      }
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Registration completed in ${duration}ms for user: ${sanitizedUsername}`);

    // Enhanced response
    res.status(201).json({
      success: true,
      message: config.FEATURES.EMAIL_VERIFICATION_REQUIRED 
        ? 'User registered successfully. Please check your email for verification.'
        : 'User registered successfully.',
      data: {
        user: {
          _id: user._id,
          userId: user._id,
          email: user.email,
          username: user.username,
          isEmailVerified: user.isEmailVerified,
          level: user.level,
          lives: user.lives,
          maxLives: user.maxLives
        },
        verificationRequired: config.FEATURES.EMAIL_VERIFICATION_REQUIRED,
        verificationSent: emailSent
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Registration failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

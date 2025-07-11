import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import User from '../../../models/user.model';

// Rate limiting for profile updates - 10 requests per hour
export const updateProfileRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many profile update attempts. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    // Check if account is active
    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    const allowedUpdates = ['username', 'bio', 'avatar', 'phoneNumber', 'dateOfBirth'];
    const updates = Object.keys(req.body);

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      const invalidFields = updates.filter(update => !allowedUpdates.includes(update));
      throw createError.badRequest(`Invalid fields: ${invalidFields.join(', ')}`);
    }

    const sanitizedData: Partial<Record<string, any>> = {};

    // Username
    if ('username' in req.body) {
      if (typeof req.body.username !== 'string') {
        throw createError.badRequest('Username must be a string');
      }

      const sanitizedUsername = AuthUtils.validateAndSanitizeInput(req.body.username, 20);
      const usernameValidation = AuthUtils.isValidUsernameSecure(sanitizedUsername);

      if (!usernameValidation.valid) {
        throw createError.badRequest(usernameValidation.reason || 'Invalid username');
      }

      if (sanitizedUsername !== req.user.username) {
        const existing = await User.findOne({
          username: sanitizedUsername,
          _id: { $ne: req.user._id },
          isDeleted: { $ne: true }
        });

        if (existing) {
          throw createError.conflict('Username is already taken');
        }
      }

      sanitizedData.username = sanitizedUsername;
    }

    // Bio
    if ('bio' in req.body) {
      if (typeof req.body.bio !== 'string') {
        throw createError.badRequest('Bio must be a string');
      }
      sanitizedData.bio = AuthUtils.validateAndSanitizeInput(req.body.bio, 500);
    }

    // Avatar
    if ('avatar' in req.body) {
      if (typeof req.body.avatar !== 'string') {
        throw createError.badRequest('Avatar must be a string URL');
      }
      const avatar = AuthUtils.validateAndSanitizeInput(req.body.avatar, 255);
      if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(avatar)) {
        throw createError.badRequest('Avatar must be a valid image URL');
      }
      sanitizedData.avatar = avatar;
    }

    // Phone number
    if ('phoneNumber' in req.body) {
      if (typeof req.body.phoneNumber !== 'string') {
        throw createError.badRequest('Phone number must be a string');
      }
      const sanitizedPhone = AuthUtils.validateAndSanitizeInput(req.body.phoneNumber, 20);
      if (sanitizedPhone && !AuthUtils.isValidPhoneNumber(sanitizedPhone)) {
        throw createError.badRequest('Invalid phone number format');
      }
      sanitizedData.phoneNumber = sanitizedPhone;
    }

    // Date of Birth
    if ('dateOfBirth' in req.body) {
      const dob = new Date(req.body.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw createError.badRequest('Invalid date of birth');
      }

      const now = new Date();
      const thirteenYearsAgo = new Date();
      thirteenYearsAgo.setFullYear(now.getFullYear() - 13);

      if (dob > now) {
        throw createError.badRequest('Date of birth cannot be in the future');
      }

      if (dob > thirteenYearsAgo) {
        throw createError.badRequest('User must be at least 13 years old');
      }

      sanitizedData.dateOfBirth = dob;
    }

    // Apply updates
    Object.assign(req.user, sanitizedData);
    req.user.lastProfileUpdate = new Date();

    await req.user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          avatar: req.user.avatar,
          bio: req.user.bio,
          phoneNumber: req.user.phoneNumber,
          dateOfBirth: req.user.dateOfBirth
        }
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    throw createError.internal('Failed to update profile');
  }
});

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
import User from '../../../models/user.model';

// Enhanced rate limiting for profile updates
export const updateProfileRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 8 : 15, // 8 in prod, 15 in dev
  message: {
    success: false,
    message: 'Too many profile update attempts. Please try again later.',
    code: 'UPDATE_PROFILE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Profile update attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Profile update attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Profile update attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    // Enhanced input validation
    const allowedUpdates = ['username', 'bio', 'avatar', 'phoneNumber', 'dateOfBirth'];
    const updates = Object.keys(req.body);

    if (updates.length === 0) {
      throw createError.badRequest('No fields provided for update');
    }

    const isValidOperation = updates.every(update => allowedUpdates.includes(update));
    if (!isValidOperation) {
      const invalidFields = updates.filter(update => !allowedUpdates.includes(update));
      logWarn(`Profile update with invalid fields from user ${req.user.email}: ${invalidFields.join(', ')} from IP: ${clientIP}`);
      throw createError.badRequest(`Invalid fields: ${invalidFields.join(', ')}`);
    }

    const sanitizedData: Partial<Record<string, any>> = {};
    const changes: string[] = [];

    // Enhanced username validation
    if ('username' in req.body) {
      if (typeof req.body.username !== 'string') {
        throw createError.badRequest('Username must be a string');
      }

      const sanitizedUsername = AuthUtils.validateAndSanitizeInput(req.body.username, 20);
      const usernameValidation = AuthUtils.isValidUsernameSecure(sanitizedUsername);

      if (!usernameValidation.valid) {
        logWarn(`Profile update with invalid username from user ${req.user.email}: ${usernameValidation.reason} from IP: ${clientIP}`);
        throw createError.badRequest(usernameValidation.reason || 'Invalid username');
      }

      if (sanitizedUsername !== req.user.username) {
        const existing = await User.findOne({
          username: sanitizedUsername,
          _id: { $ne: req.user._id },
          isDeleted: { $ne: true }
        });

        if (existing) {
          logWarn(`Profile update with duplicate username from user ${req.user.email}: ${sanitizedUsername} from IP: ${clientIP}`);
          throw createError.conflict('Username is already taken');
        }

        changes.push(`username: ${req.user.username} -> ${sanitizedUsername}`);
        sanitizedData.username = sanitizedUsername;
      }
    }

    // Enhanced bio validation
    if ('bio' in req.body) {
      if (typeof req.body.bio !== 'string') {
        throw createError.badRequest('Bio must be a string');
      }
      const sanitizedBio = AuthUtils.validateAndSanitizeInput(req.body.bio, 500);
      if (sanitizedBio !== req.user.bio) {
        changes.push('bio updated');
        sanitizedData.bio = sanitizedBio;
      }
    }

    // Enhanced avatar validation
    if ('avatar' in req.body) {
      if (typeof req.body.avatar !== 'string') {
        throw createError.badRequest('Avatar must be a string URL');
      }
      const avatar = AuthUtils.validateAndSanitizeInput(req.body.avatar, 255);
      
      // Enhanced URL validation
      if (avatar && !/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(avatar)) {
        throw createError.badRequest('Avatar must be a valid image URL (jpg, jpeg, png, gif, webp)');
      }
      
      if (avatar !== req.user.avatar) {
        changes.push('avatar updated');
        sanitizedData.avatar = avatar;
      }
    }

    // Enhanced phone number validation
    if ('phoneNumber' in req.body) {
      if (req.body.phoneNumber !== null && typeof req.body.phoneNumber !== 'string') {
        throw createError.badRequest('Phone number must be a string or null');
      }
      
      const sanitizedPhone = req.body.phoneNumber ? 
        AuthUtils.validateAndSanitizeInput(req.body.phoneNumber, 20) : null;
      
      if (sanitizedPhone && !AuthUtils.isValidPhoneNumber(sanitizedPhone)) {
        throw createError.badRequest('Invalid phone number format');
      }
      
      if (sanitizedPhone !== req.user.phoneNumber) {
        changes.push('phone number updated');
        sanitizedData.phoneNumber = sanitizedPhone;
      }
    }

    // Enhanced date of birth validation
    if ('dateOfBirth' in req.body) {
      if (req.body.dateOfBirth === null) {
        if (req.user.dateOfBirth) {
          changes.push('date of birth removed');
          sanitizedData.dateOfBirth = null;
        }
      } else {
        const dob = new Date(req.body.dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw createError.badRequest('Invalid date of birth format');
        }

        const now = new Date();
        const thirteenYearsAgo = new Date();
        thirteenYearsAgo.setFullYear(now.getFullYear() - 13);
        const oneHundredYearsAgo = new Date();
        oneHundredYearsAgo.setFullYear(now.getFullYear() - 100);

        if (dob > now) {
          throw createError.badRequest('Date of birth cannot be in the future');
        }

        if (dob > thirteenYearsAgo) {
          throw createError.badRequest('User must be at least 13 years old');
        }

        if (dob < oneHundredYearsAgo) {
          throw createError.badRequest('Invalid date of birth - too far in the past');
        }

        if (!req.user.dateOfBirth || dob.getTime() !== req.user.dateOfBirth.getTime()) {
          changes.push('date of birth updated');
          sanitizedData.dateOfBirth = dob;
        }
      }
    }

    // Check if any changes were made
    if (changes.length === 0) {
      return res.json({
        success: true,
        message: 'No changes detected',
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
    }

    // Apply updates with enhanced tracking
    Object.assign(req.user, sanitizedData);
    req.user.lastProfileUpdate = new Date();

    try {
      await req.user.save({ validateBeforeSave: false });
      
      // Enhanced logging
      logInfo(`Profile updated for user: ${req.user.username} - Changes: [${changes.join(', ')}] from IP: ${clientIP}`);
      
      // Performance logging
      const duration = Date.now() - startTime;
      logInfo(`Profile update completed in ${duration}ms for user: ${req.user.username} from IP: ${clientIP}`);

    } catch (saveError) {
      logError(`Failed to save profile update for user ${req.user._id}: ${saveError}`);
      throw createError.internal('Failed to update profile. Please try again.');
    }

    // Enhanced response
    res.json({
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
          dateOfBirth: req.user.dateOfBirth,
          lastProfileUpdate: req.user.lastProfileUpdate
        },
        changes: changes,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Profile update failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

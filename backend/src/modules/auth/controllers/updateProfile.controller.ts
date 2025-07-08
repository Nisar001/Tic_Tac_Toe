import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
const User = require('../../../models/user.model');

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const allowedUpdates = ['username', 'bio', 'avatar', 'phoneNumber', 'dateOfBirth'];
  const updates = Object.keys(req.body);
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    throw createError.badRequest('Invalid updates');
  }

  if (req.body.username && req.body.username !== req.user.username) {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      throw createError.conflict('Username is already taken');
    }
  }

  updates.forEach(update => {
    (req.user as any)[update] = req.body[update];
  });

  await req.user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar,
        bio: req.user.bio
      }
    }
  });
});

import { Request, Response } from 'express';
import FriendRequestModel from '../../../../models/friendRequest.model';
import UserModel, { IUser } from '../../../../models/user.model';
import { logInfo, logError } from '../../../../utils/logger';
import mongoose from 'mongoose';

// Block user
export const blockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { userId: targetUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.blockedUsers) user.blockedUsers = [];
    const isAlreadyBlocked = user.blockedUsers.some((blockedId: mongoose.Types.ObjectId) => blockedId.toString() === targetUserId.toString());
    if (isAlreadyBlocked) {
      return res.status(400).json({ success: false, message: 'User is already blocked' });
    }
    user.blockedUsers.push(new mongoose.Types.ObjectId(targetUserId));
    await user.save();
    await FriendRequestModel.deleteMany({ $or: [ { sender: userId, receiver: targetUserId }, { sender: targetUserId, receiver: userId } ] });
    logInfo(`User ${userId} blocked User ${targetUserId}`);
    res.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    logError(`Error blocking user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to block user', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Unblock user
export const unblockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { userId: targetUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.blockedUsers) user.blockedUsers = [];
    const initialLength = user.blockedUsers.length;
    user.blockedUsers = user.blockedUsers.filter((blockedId: mongoose.Types.ObjectId) => blockedId.toString() !== targetUserId.toString());
    if (user.blockedUsers.length === initialLength) {
      return res.status(400).json({ success: false, message: 'User is not blocked' });
    }
    await user.save();
    logInfo(`User ${userId} unblocked User ${targetUserId}`);
    res.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    logError(`Error unblocking user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to unblock user', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get blocked users
export const getBlockedUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const user = await UserModel.findById(userId).populate('blockedUsers', 'username email avatar');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const blockedUsers = user.blockedUsers || [];
    logInfo(`Retrieved ${blockedUsers.length} blocked users for User ${userId}`);
    res.json({ success: true, message: 'Blocked users retrieved successfully', data: blockedUsers });
  } catch (error) {
    logError(`Error retrieving blocked users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve blocked users', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

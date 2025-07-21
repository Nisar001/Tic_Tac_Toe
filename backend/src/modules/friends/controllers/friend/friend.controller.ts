import { Request, Response } from 'express';
import FriendRequestModel from '../../../../models/friendRequest.model';
import UserModel, { IUser } from '../../../../models/user.model';
import { logInfo, logError } from '../../../../utils/logger';
import mongoose from 'mongoose';

// Get friends (accepted)
export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const showAll = req.query.all === 'true';

    if (showAll) {
      // Return all users except self, only public fields (no email, no sensitive info)
      const users = await UserModel.find({ _id: { $ne: userId } })
        .select('username avatar level energySystem');
      logInfo(`Returned all users (except self, public fields only) for User ${userId}`);
      return res.json({
        success: true,
        message: 'All users (except self, public fields only) retrieved successfully',
        data: users
      });
    }

    // Find all accepted friend requests where the UserModel is either sender or receiver
    const friendRequests = await FriendRequestModel.find({
      $or: [
        { sender: userId, status: 'accepted' },
        { receiver: userId, status: 'accepted' }
      ]
    }).populate('sender', 'username email avatar level energySystem')
      .populate('receiver', 'username email avatar level energySystem');

    // Extract friends from the requests
    const friends = friendRequests.map((request: any) => {
      const isSender = request.sender._id.toString() === userId.toString();
      return isSender ? request.receiver : request.sender;
    });

    logInfo(`Retrieved ${friends.length} friends for User ${userId}`);
    res.json({
      success: true,
      message: 'Friends retrieved successfully',
      data: friends
    });
  } catch (error) {
    logError(`Error retrieving friends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve friends',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Remove friend
export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { friendId } = req.params;

    // Validate friendId
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid friend ID'
      });
    }

    // Find and delete the friendship
    const friendship = await FriendRequestModel.findOneAndDelete({
      $or: [
        { sender: userId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }

    logInfo(`Friendship removed between ${userId} and ${friendId}`);

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    logError(`Error removing friend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

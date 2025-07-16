import { Request, Response } from 'express';
import FriendRequestModel from '../../../models/friendRequest.model';
import UserModel, { IUser } from '../../../models/user.model';
import { logInfo, logError } from '../../../utils/logger';
import mongoose from 'mongoose';

export const getFriends = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;

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

    logInfo(`Retrieved ${friends.length} friends for User \$\{userId}`);
    
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

export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const senderId = (req.user as IUser)._id;
    const { receiverId, message } = req.body;

    // Validate receiverId
    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid receiver ID'
      });
    }

    // Check if receiver exists
    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'UserModel not found'
      });
    }

    // Check if sender is trying to send request to themselves
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }

    // Check if they are already friends
    const existingFriendship = await FriendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: 'accepted' },
        { sender: receiverId, receiver: senderId, status: 'accepted' }
      ]
    });

    if (existingFriendship) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this UserModel'
      });
    }

    // Check if there's already a pending request
    const existingRequest = await FriendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: 'pending' },
        { sender: receiverId, receiver: senderId, status: 'pending' }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A friend request already exists between you and this UserModel'
      });
    }

    // Create new friend request
    const friendRequest = new FriendRequestModel({
      sender: senderId,
      receiver: receiverId,
      message: message || undefined
    });

    await friendRequest.save();
    await friendRequest.populate('sender', 'username email avatar');
    await friendRequest.populate('receiver', 'username email avatar');

    logInfo(`Friend request sent from ${senderId} to ${receiverId}`);

    res.status(201).json({
      success: true,
      message: 'Friend request sent successfully',
      data: FriendRequestModel
    });
  } catch (error) {
    logError(`Error sending friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getFriendRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;

    // Get sent requests
    const sentRequests = await FriendRequestModel.find({
      sender: userId,
      status: 'pending'
    }).populate('receiver', 'username email avatar level energySystem')
      .sort({ createdAt: -1 });

    // Get received requests
    const receivedRequests = await FriendRequestModel.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'username email avatar level energySystem')
      .sort({ createdAt: -1 });

    logInfo(`Retrieved ${sentRequests.length} sent and ${receivedRequests.length} received friend requests for User \$\{userId}`);

    res.json({
      success: true,
      message: 'Friend requests retrieved successfully',
      data: {
        sent: sentRequests,
        received: receivedRequests
      }
    });
  } catch (error) {
    logError(`Error retrieving friend requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve friend requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;

    // Validate requestId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
    }

    // Find the friend request
    const friendRequest = await FriendRequestModel.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found or already processed'
      });
    }

    // Update status to accepted
    friendRequest.status = 'accepted';
    await friendRequest.save();

    await friendRequest.populate('sender', 'username email avatar');
    await friendRequest.populate('receiver', 'username email avatar');

    logInfo(`Friend request ${requestId} accepted by User \$\{userId}`);

    res.json({
      success: true,
      message: 'Friend request accepted successfully',
      data: FriendRequestModel
    });
  } catch (error) {
    logError(`Error accepting friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const rejectFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;

    // Validate requestId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
    }

    // Find the friend request
    const friendRequest = await FriendRequestModel.findOne({
      _id: requestId,
      receiver: userId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found or already processed'
      });
    }

    // Update status to declined
    friendRequest.status = 'declined';
    await friendRequest.save();

    logInfo(`Friend request ${requestId} rejected by User \$\{userId}`);

    res.json({
      success: true,
      message: 'Friend request rejected successfully'
    });
  } catch (error) {
    logError(`Error rejecting friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to reject friend request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const cancelFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;

    // Validate requestId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
    }

    // Find and delete the friend request
    const friendRequest = await FriendRequestModel.findOneAndDelete({
      _id: requestId,
      sender: userId,
      status: 'pending'
    });

    if (!FriendRequestModel) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found or cannot be cancelled'
      });
    }

    logInfo(`Friend request ${requestId} cancelled by User \$\{userId}`);

    res.json({
      success: true,
      message: 'Friend request cancelled successfully'
    });
  } catch (error) {
    logError(`Error cancelling friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel friend request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

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

export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const userId = (req.user as IUser)._id;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchQuery = q.trim();
    if (searchQuery.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Search for users by username or email (partial match, case insensitive)
    const users = await UserModel.find({
      _id: { $ne: userId }, // Exclude current UserModel
      $or: [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ],
      isVerified: true // Only show verified users
    })
    .select('username email avatar level energySystem')
    .limit(20)
    .sort({ username: 1 });

    logInfo(`UserModel search for "${searchQuery}" returned ${users.length} results`);

    res.json({
      success: true,
      message: 'Users found successfully',
      data: users
    });
  } catch (error) {
    logError(`Error searching users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { userId: targetUserId } = req.params;

    // Validate targetUserId
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UserModel ID'
      });
    }

    // Check if target UserModel exists
    const targetUser = await UserModel.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'UserModel not found'
      });
    }

    // Cannot block yourself
    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
      });
    }

    // Add to blocked users array if not already blocked
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    const isAlreadyBlocked = user.blockedUsers.some(
      (blockedId: mongoose.Types.ObjectId) => blockedId.toString() === targetUserId.toString()
    );

    if (isAlreadyBlocked) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    user.blockedUsers.push(new mongoose.Types.ObjectId(targetUserId));
    await user.save();

    // Remove any existing friendship
    await FriendRequestModel.deleteMany({
      $or: [
        { sender: userId, receiver: targetUserId },
        { sender: targetUserId, receiver: userId }
      ]
    });

    logInfo(`User \$\{userId} blocked User \$\{targetUserId}`);

    res.json({
      success: true,
      message: 'UserModel blocked successfully'
    });
  } catch (error) {
    logError(`Error blocking UserModel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to block UserModel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const unblockUser = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { userId: targetUserId } = req.params;

    // Validate targetUserId
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UserModel ID'
      });
    }

    // Remove from blocked users array
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    const initialLength = user.blockedUsers.length;
    user.blockedUsers = user.blockedUsers.filter(
      (blockedId: mongoose.Types.ObjectId) => blockedId.toString() !== targetUserId.toString()
    );

    if (user.blockedUsers.length === initialLength) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    await user.save();

    logInfo(`User ${userId} unblocked User ${targetUserId}`);

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    logError(`Error unblocking UserModel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock UserModel',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getBlockedUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;

    const user = await UserModel.findById(userId).populate('blockedUsers', 'username email avatar');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const blockedUsers = user.blockedUsers || [];

    logInfo(`Retrieved ${blockedUsers.length} blocked users for User ${userId}`);

    res.json({
      success: true,
      message: 'Blocked users retrieved successfully',
      data: blockedUsers
    });
  } catch (error) {
    logError(`Error retrieving blocked users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blocked users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

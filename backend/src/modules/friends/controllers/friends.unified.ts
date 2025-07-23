/**
 * Unified Friends Controller
 * Handles all friend-related operations properly
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import FriendRequestModel, { IFriendRequest } from '../../../models/friendRequest.model';
import UserModel, { IUser } from '../../../models/user.model';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { logInfo, logError, logWarn } from '../../../utils/logger';

// Response interface
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Get all friends for the authenticated user
 */
export const getFriends = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find accepted friend requests where user is involved
    const friendships = await FriendRequestModel.find({
      $or: [
        { sender: userId, status: 'accepted' },
        { receiver: userId, status: 'accepted' }
      ]
    })
    .populate('sender', 'username email avatar isOnline lastSeen')
    .populate('receiver', 'username email avatar isOnline lastSeen')
    .sort({ updatedAt: -1 });

    // Extract friend data
    const friends = friendships.map((friendship: any) => {
      const friend = friendship.sender._id.toString() === userId.toString() 
        ? friendship.receiver 
        : friendship.sender;
      
      return {
        id: friend._id,
        username: friend.username,
        email: friend.email,
        avatar: friend.avatar || '/default-avatar.png',
        isOnline: friend.isOnline || false,
        lastSeen: friend.lastSeen,
        friendSince: friendship.updatedAt
      };
    });

    logInfo(`Retrieved ${friends.length} friends for user ${userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Friends retrieved successfully',
      data: {
        friends,
        total: friends.length
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error getting friends: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve friends',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Get pending friend requests (received by the user)
 */
export const getPendingRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const requests = await FriendRequestModel.find({
      receiver: userId,
      status: 'pending'
    })
    .populate('sender', 'username email avatar')
    .sort({ createdAt: -1 });

    const formattedRequests = requests.map((request: any) => ({
      id: request._id,
      senderId: request.sender._id,
      senderUsername: request.sender.username,
      senderEmail: request.sender.email,
      senderAvatar: request.sender.avatar || '/default-avatar.png',
      message: request.message || '',
      createdAt: request.createdAt
    }));

    logInfo(`Retrieved ${formattedRequests.length} pending requests for user ${userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Pending requests retrieved successfully',
      data: {
        requests: formattedRequests,
        total: formattedRequests.length
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error getting pending requests: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve pending requests',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Send a friend request
 */
export const sendFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
      return;
    }

    const { receiverId, message } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Check if sending to self
    if (senderId === receiverId) {
      res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
      return;
    }

    // Check if receiver exists
    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Check if friendship already exists
    const existingFriendship = await FriendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        res.status(400).json({
          success: false,
          message: 'You are already friends with this user'
        });
        return;
      } else if (existingFriendship.status === 'pending') {
        res.status(400).json({
          success: false,
          message: 'Friend request already sent or received'
        });
        return;
      }
    }

    // Create new friend request
    const friendRequest = new FriendRequestModel({
      sender: senderId,
      receiver: receiverId,
      message: message || '',
      status: 'pending'
    });

    await friendRequest.save();

    logInfo(`Friend request sent from ${senderId} to ${receiverId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Friend request sent successfully',
      data: {
        requestId: friendRequest._id,
        receiverUsername: receiver.username
      }
    };

    res.status(201).json(response);
  } catch (error: any) {
    logError(`Error sending friend request: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to send friend request',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
      return;
    }

    const friendRequest = await FriendRequestModel.findById(requestId)
      .populate('sender', 'username')
      .populate('receiver', 'username');

    if (!friendRequest) {
      res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
      return;
    }

    // Check if the user is the receiver of the request
    if (friendRequest.receiver._id.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only accept requests sent to you'
      });
      return;
    }

    if (friendRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Friend request is not pending'
      });
      return;
    }

    // Update request status
    friendRequest.status = 'accepted';
    await friendRequest.save();

    logInfo(`Friend request ${requestId} accepted by user ${userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Friend request accepted successfully',
      data: {
        requestId: friendRequest._id,
        friendUsername: (friendRequest.sender as any).username
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error accepting friend request: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to accept friend request',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
      return;
    }

    const friendRequest = await FriendRequestModel.findById(requestId);

    if (!friendRequest) {
      res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
      return;
    }

    // Check if the user is the receiver of the request
    if (friendRequest.receiver.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only reject requests sent to you'
      });
      return;
    }

    if (friendRequest.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Friend request is not pending'
      });
      return;
    }

    // Update request status
    friendRequest.status = 'declined';
    await friendRequest.save();

    logInfo(`Friend request ${requestId} rejected by user ${userId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Friend request rejected successfully',
      data: {
        requestId: friendRequest._id
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error rejecting friend request: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to reject friend request',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Remove a friend (unfriend)
 */
export const removeFriend = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { friendId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid friend ID'
      });
      return;
    }

    // Find the friendship record
    const friendship = await FriendRequestModel.findOne({
      $or: [
        { sender: userId, receiver: friendId, status: 'accepted' },
        { sender: friendId, receiver: userId, status: 'accepted' }
      ]
    });

    if (!friendship) {
      res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
      return;
    }

    // Remove the friendship
    await FriendRequestModel.findByIdAndDelete(friendship._id);

    logInfo(`Friendship removed between ${userId} and ${friendId}`);

    const response: ApiResponse = {
      success: true,
      message: 'Friend removed successfully',
      data: {
        removedFriendId: friendId
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error removing friend: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to remove friend',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Search for users to add as friends
 */
export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q: query, limit = 10 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters long'
      });
      return;
    }

    const searchLimit = Math.min(parseInt(limit as string) || 10, 50);

    // Find users matching the search query
    const users = await UserModel.find({
      _id: { $ne: userId }, // Exclude current user
      $or: [
        { username: { $regex: query.trim(), $options: 'i' } },
        { email: { $regex: query.trim(), $options: 'i' } }
      ]
    })
    .select('username email avatar isOnline')
    .limit(searchLimit)
    .lean();

    // Get existing friend relationships
    const existingRelationships = await FriendRequestModel.find({
      $or: [
        { sender: userId, receiver: { $in: users.map(u => u._id) } },
        { sender: { $in: users.map(u => u._id) }, receiver: userId }
      ]
    }).lean();

    // Add relationship status to users
    const usersWithStatus = users.map(user => {
      const relationship = existingRelationships.find(rel =>
        (rel.sender.toString() === userId && rel.receiver.toString() === user._id.toString()) ||
        (rel.receiver.toString() === userId && rel.sender.toString() === user._id.toString())
      );

      let relationshipStatus = 'none';
      if (relationship) {
        if (relationship.status === 'accepted') {
          relationshipStatus = 'friend';
        } else if (relationship.status === 'pending') {
          relationshipStatus = relationship.sender.toString() === userId ? 'request_sent' : 'request_received';
        }
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar || '/default-avatar.png',
        isOnline: user.isOnline || false,
        relationshipStatus
      };
    });

    logInfo(`Search for "${query}" returned ${usersWithStatus.length} users`);

    const response: ApiResponse = {
      success: true,
      message: 'Users found successfully',
      data: {
        users: usersWithStatus,
        total: usersWithStatus.length,
        query: query.trim()
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error searching users: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to search users',
      error: error.message
    };
    res.status(500).json(response);
  }
};

/**
 * Get sent friend requests (for debugging/admin purposes)
 */
export const getSentRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const sentRequests = await FriendRequestModel.find({
      sender: userId,
      status: 'pending'
    })
    .populate('receiver', 'username email avatar')
    .sort({ createdAt: -1 });

    const formattedRequests = sentRequests.map((request: any) => ({
      id: request._id,
      receiverId: request.receiver._id,
      receiverUsername: request.receiver.username,
      receiverEmail: request.receiver.email,
      receiverAvatar: request.receiver.avatar || '/default-avatar.png',
      message: request.message || '',
      createdAt: request.createdAt
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Sent requests retrieved successfully',
      data: {
        requests: formattedRequests,
        total: formattedRequests.length
      }
    };

    res.status(200).json(response);
  } catch (error: any) {
    logError(`Error getting sent requests: ${error.message}`);
    
    const response: ApiResponse = {
      success: false,
      message: 'Failed to retrieve sent requests',
      error: error.message
    };
    res.status(500).json(response);
  }
};

import { Request, Response } from 'express';
import FriendRequestModel from '../../../../models/friendRequest.model';
import UserModel, { IUser } from '../../../../models/user.model';
import { logInfo, logError } from '../../../../utils/logger';
import mongoose from 'mongoose';

// Send friend request
export const sendFriendRequest = async (req: Request, res: Response) => {
  try {
    const senderId = (req.user as IUser)._id;
    const { receiverId, message } = req.body;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ success: false, message: 'Invalid receiver ID' });
    }
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });
    }
    const receiver = await UserModel.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingFriendship = await FriendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: 'accepted' },
        { sender: receiverId, receiver: senderId, status: 'accepted' }
      ]
    });
    if (existingFriendship) {
      return res.status(400).json({ success: false, message: 'You are already friends with this user' });
    }
    const existingRequest = await FriendRequestModel.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: 'pending' },
        { sender: receiverId, receiver: senderId, status: 'pending' }
      ]
    });
    if (existingRequest) {
      return res.status(400).json({ success: false, message: 'A friend request already exists between you and this user' });
    }
    const friendRequest = new FriendRequestModel({ sender: senderId, receiver: receiverId, message: message || undefined });
    await friendRequest.save();
    await friendRequest.populate('sender', 'username email avatar');
    await friendRequest.populate('receiver', 'username email avatar');
    logInfo(`Friend request sent from ${senderId} to ${receiverId}`);
    res.status(201).json({ success: true, message: 'Friend request sent successfully', data: friendRequest });
  } catch (error) {
    logError(`Error sending friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to send friend request', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Get friend requests (sent/received)
export const getFriendRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const sentRequestsRaw = await FriendRequestModel.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'username email avatar level energySystem')
      .sort({ createdAt: -1 });
    const receivedRequestsRaw = await FriendRequestModel.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'username email avatar level energySystem')
      .sort({ createdAt: -1 });
    const sentRequests = sentRequestsRaw.map((req: any) => ({
      id: req._id.toString(), sender: req.sender, recipient: req.receiver, status: req.status, sentAt: req.createdAt, respondedAt: req.updatedAt, message: req.message || '',
    }));
    const receivedRequests = receivedRequestsRaw.map((req: any) => ({
      id: req._id.toString(), sender: req.sender, recipient: req.receiver, status: req.status, sentAt: req.createdAt, respondedAt: req.updatedAt, message: req.message || '',
    }));
    logInfo(`Retrieved ${sentRequests.length} sent and ${receivedRequests.length} received friend requests for User ${userId}`);
    res.json({ success: true, message: 'Friend requests retrieved successfully', data: { sent: sentRequests, received: receivedRequests } });
  } catch (error) {
    logError(`Error retrieving friend requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to retrieve friend requests', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    const friendRequest = await FriendRequestModel.findOne({ _id: requestId, receiver: userId, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found or already processed' });
    }
    friendRequest.status = 'accepted';
    await friendRequest.save();
    await friendRequest.populate('sender', 'username email avatar');
    await friendRequest.populate('receiver', 'username email avatar');
    logInfo(`Friend request ${requestId} accepted by User ${userId}`);
    res.json({ success: true, message: 'Friend request accepted successfully', data: friendRequest });
  } catch (error) {
    logError(`Error accepting friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to accept friend request', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    const friendRequest = await FriendRequestModel.findOne({ _id: requestId, receiver: userId, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found or already processed' });
    }
    friendRequest.status = 'declined';
    await friendRequest.save();
    logInfo(`Friend request ${requestId} rejected by User ${userId}`);
    res.json({ success: true, message: 'Friend request rejected successfully' });
  } catch (error) {
    logError(`Error rejecting friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to reject friend request', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Cancel sent friend request
export const cancelFriendRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { requestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ success: false, message: 'Invalid request ID' });
    }
    const friendRequest = await FriendRequestModel.findOneAndDelete({ _id: requestId, sender: userId, status: 'pending' });
    if (!friendRequest) {
      return res.status(404).json({ success: false, message: 'Friend request not found or cannot be cancelled' });
    }
    logInfo(`Friend request ${requestId} cancelled by User ${userId}`);
    res.json({ success: true, message: 'Friend request cancelled successfully' });
  } catch (error) {
    logError(`Error cancelling friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({ success: false, message: 'Failed to cancel friend request', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

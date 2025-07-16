import { Request, Response } from 'express';
import { Notification } from '../../../models/notification.model';
import { IUser } from '../../../models/user.model';
import { logInfo, logError } from '../../../utils/logger';
import mongoose from 'mongoose';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query: any = { recipient: userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    logInfo(`Retrieved ${notifications.length} notifications for user ${userId}`);

    res.json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        },
        unreadCount
      }
    });
  } catch (error) {
    logError(`Error retrieving notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const unreadCount = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: {
        unreadCount
      }
    });
  } catch (error) {
    logError(`Error getting unread count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { notificationId } = req.params;

    // Validate notificationId
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notification.isRead) {
      notification.markAsRead();
      await notification.save();
    }

    logInfo(`Notification ${notificationId} marked as read by user ${userId}`);

    res.json({
      success: true,
      message: 'Notification marked as read successfully',
      data: notification
    });
  } catch (error) {
    logError(`Error marking notification as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    await Notification.markAllAsRead(userId);

    logInfo(`All notifications marked as read for user ${userId}`);

    res.json({
      success: true,
      message: 'All notifications marked as read successfully'
    });
  } catch (error) {
    logError(`Error marking all notifications as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    const { notificationId } = req.params;

    // Validate notificationId
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID'
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    logInfo(`Notification ${notificationId} deleted by user ${userId}`);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    logError(`Error deleting notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const deleteAllRead = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as IUser)._id;
    
    const result = await Notification.deleteMany({
      recipient: userId,
      isRead: true
    });

    logInfo(`${result.deletedCount || 0} read notifications deleted for user ${userId}`);

    res.json({
      success: true,
      message: `${result.deletedCount || 0} read notifications deleted successfully`,
      data: {
        deletedCount: result.deletedCount || 0
      }
    });
  } catch (error) {
    logError(`Error deleting read notifications: ${error instanceof Error ? error.message : 'Unknown error'}`);
    res.status(500).json({
      success: false,
      message: 'Failed to delete read notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};



// Helper function to create notifications for specific events
export const createGameInviteNotification = async (
  recipientId: mongoose.Types.ObjectId,
  senderUsername: string,
  gameId: string
) => {
  try {
    await Notification.createNotification(
      recipientId,
      'game_invite',
      'Game Invitation',
      `${senderUsername} invited you to play a game`,
      { gameId, senderUsername }
    );
  } catch (error) {
    logError(`Error creating game invite notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createFriendRequestNotification = async (
  recipientId: mongoose.Types.ObjectId,
  senderUsername: string,
  requestId: string
) => {
  try {
    await Notification.createNotification(
      recipientId,
      'friend_request',
      'Friend Request',
      `${senderUsername} sent you a friend request`,
      { requestId, senderUsername }
    );
  } catch (error) {
    logError(`Error creating friend request notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const createGameResultNotification = async (
  recipientId: mongoose.Types.ObjectId,
  result: 'win' | 'loss' | 'draw',
  opponentUsername: string,
  gameId: string
) => {
  try {
    const titleMap = {
      win: 'Victory!',
      loss: 'Game Over',
      draw: 'Draw Game'
    };

    const messageMap = {
      win: `You won against ${opponentUsername}!`,
      loss: `You lost against ${opponentUsername}`,
      draw: `Your game against ${opponentUsername} ended in a draw`
    };

    await Notification.createNotification(
      recipientId,
      'game_result',
      titleMap[result],
      messageMap[result],
      { result, opponentUsername, gameId }
    );
  } catch (error) {
    logError(`Error creating game result notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

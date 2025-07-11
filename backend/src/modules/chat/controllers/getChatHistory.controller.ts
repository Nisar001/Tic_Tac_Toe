import { Request, Response } from 'express';
import { socketManager } from '../../../server';
import { createError } from '../../../middlewares/error.middleware';

// Import the IUser type from its definition file
import { IUser } from '../../../models/user.model'; // Adjust the path as needed

// Ensure `req.user` is typed (if using a custom `AuthenticatedRequest`)
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const getChatHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate roomId
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required and must be a string'
      });
    }

    // Validate socket manager
    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager is not initialized'
      });
    }

    const chatSocket = socketManager.getChatSocket?.();
    if (!chatSocket || typeof chatSocket.getChatRoomInfo !== 'function') {
      return res.status(500).json({
        success: false,
        message: 'Chat socket is not available'
      });
    }

    const chatRoom = chatSocket.getChatRoomInfo(roomId);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    // Permission check
    if (
      chatRoom.type !== 'global' &&
      (!Array.isArray(chatRoom.participants) || !chatRoom.participants.includes(userId))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    // Validate pagination params
    const limitNum = Math.max(1, parseInt(limit as string, 10));
    const offsetNum = Math.max(0, parseInt(offset as string, 10));

    const allMessages = Array.isArray(chatRoom.messages) ? chatRoom.messages : [];
    const totalMessages = allMessages.length;

    const slicedMessages = allMessages.slice(
      Math.max(0, totalMessages - limitNum - offsetNum),
      totalMessages - offsetNum
    );

    res.json({
      success: true,
      data: {
        roomId,
        messages: slicedMessages,
        hasMore: totalMessages > limitNum + offsetNum,
        totalMessages,
        participantCount: chatRoom.participants?.length || 0
      }
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching chat history'
    });
  }
};

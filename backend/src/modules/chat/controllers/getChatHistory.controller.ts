import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    const chatSocket = socketManager.getChatSocket();
    const chatRoom = chatSocket.getChatRoomInfo(roomId);

    if (!chatRoom) {
      return res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
    }

    if (chatRoom.type !== 'global' && !chatRoom.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat room'
      });
    }

    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);

    const messages = chatRoom.messages.slice(
      Math.max(0, chatRoom.messages.length - limitNum - offsetNum),
      chatRoom.messages.length - offsetNum
    );

    res.json({
      success: true,
      data: {
        roomId,
        messages,
        hasMore: chatRoom.messages.length > limitNum + offsetNum,
        totalMessages: chatRoom.messages.length,
        participantCount: chatRoom.participants.length
      }
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history'
    });
  }
};

import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const leaveChatRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
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

    const authManager = socketManager.getAuthManager();
    const userSocket = authManager.getSocketByUserId(userId);

    if (userSocket) {
      const chatSocket = socketManager.getChatSocket();
      chatSocket.handleLeaveChat(userSocket, { roomId });
    }

    res.json({
      success: true,
      message: 'Left chat room successfully'
    });

  } catch (error) {
    console.error('Leave chat room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave chat room'
    });
  }
};

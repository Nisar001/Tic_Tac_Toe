import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roomId || !message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Room ID and message are required'
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 500 characters)'
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

    if (!userSocket) {
      return res.status(400).json({
        success: false,
        message: 'You must be connected via WebSocket to send messages'
      });
    }

    const chatSocket = socketManager.getChatSocket();
    chatSocket.handleChatMessage(userSocket, { roomId, message });

    res.json({
      success: true,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const getChatRoomUsers = async (req: Request, res: Response) => {
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

    const authManager = socketManager.getAuthManager();
    const onlineUsers = authManager.getOnlineUsers();

    const roomUsers = onlineUsers.filter(user => 
      chatRoom.participants.includes(user.id)
    );

    res.json({
      success: true,
      data: {
        roomId,
        users: roomUsers,
        onlineCount: roomUsers.length,
        totalParticipants: chatRoom.participants.length
      }
    });

  } catch (error) {
    console.error('Get chat room users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat room users'
    });
  }
};

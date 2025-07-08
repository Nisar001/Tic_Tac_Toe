import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const getChatRooms = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    const chatSocket = socketManager.getChatSocket();
    const allRooms = chatSocket.getAllChatRooms();

    const accessibleRooms = allRooms
      .filter(room => 
        room.type === 'global' || 
        room.participants.includes(userId)
      )
      .map(room => ({
        id: room.id,
        name: room.name,
        type: room.type,
        participantCount: room.participants.length,
        lastActivity: room.lastActivity,
        hasUnreadMessages: false
      }));

    res.json({
      success: true,
      data: {
        rooms: accessibleRooms,
        totalRooms: accessibleRooms.length
      }
    });

  } catch (error) {
    console.error('Get chat rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat rooms'
    });
  }
};

import { Request, Response } from 'express';
import { socketManager } from '../../../server';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import ChatMessage from '../../../models/chatMessage.model';

export const getChatHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, gameId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  const userId = req.user?._id?.toString();

  // Validate authentication
  if (!userId) {
    throw createError.unauthorized('Authentication required');
  }

  // Support both roomId and gameId parameters for backward compatibility
  const chatRoomId = roomId || gameId;

  // Validate roomId/gameId
  if (!chatRoomId || typeof chatRoomId !== 'string') {
    throw createError.badRequest('Room ID or Game ID is required and must be a string');
  }

  // Enhanced input validation
  const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
  const offsetNum = Math.max(0, parseInt(offset as string, 10) || 0);

  // Primary method: Try database first for consistency
  try {
    const messages = await ChatMessage.find({ 
      $or: [
        { roomId: chatRoomId },
        { gameId: chatRoomId },
        { room: chatRoomId }
      ]
    })
      .populate('sender', 'username avatar')
      .sort({ timestamp: -1, createdAt: -1 })
      .limit(limitNum)
      .skip(offsetNum);

    const totalCount = await ChatMessage.countDocuments({
      $or: [
        { roomId: chatRoomId },
        { gameId: chatRoomId },
        { room: chatRoomId }
      ]
    });

    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      sender: msg.sender,
      message: msg.message,
      messageType: msg.messageType || 'text',
      timestamp: msg.timestamp || msg.createdAt,
      isRead: msg.isRead || false
    }));

    return res.json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: {
        roomId: chatRoomId,
        messages: formattedMessages,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: totalCount,
          hasMore: (offsetNum + limitNum) < totalCount
        }
      }
    });
  } catch (dbError) {
    // Fallback to socket manager if database fails
    if (!socketManager) {
      throw createError.internal('Chat service unavailable');
    }

    const chatSocket = socketManager.getChatSocket?.();
    if (!chatSocket || typeof chatSocket.getChatRoomInfo !== 'function') {
      throw createError.internal('Chat socket service unavailable');
    }

    const chatRoom = chatSocket.getChatRoomInfo(chatRoomId);

    if (!chatRoom) {
      throw createError.notFound('Chat room not found');
    }

    // Permission check for socket-based rooms
    if (
      chatRoom.type !== 'global' &&
      (!Array.isArray(chatRoom.participants) || !chatRoom.participants.includes(userId))
    ) {
      throw createError.forbidden('Access denied to this chat room');
    }

    const allMessages = Array.isArray(chatRoom.messages) ? chatRoom.messages : [];
    const totalMessages = allMessages.length;

    const slicedMessages = allMessages.slice(
      Math.max(0, totalMessages - limitNum - offsetNum),
      totalMessages - offsetNum
    );

    res.json({
      success: true,
      message: 'Chat history retrieved successfully (Socket mode)',
      data: {
        roomId: chatRoomId,
        messages: slicedMessages,
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: totalMessages,
          hasMore: totalMessages > limitNum + offsetNum
        },
        participantCount: chatRoom.participants?.length || 0
      }
    });
  }
});

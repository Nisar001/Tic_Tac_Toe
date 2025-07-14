import { Request, Response } from 'express';
import { socketManager } from '../../../server';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import ChatMessage from '../../../models/chatMessage.model';

export const getChatHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { limit = 50, offset = 0 } = req.query;
  const userId = req.user?.id;

  // Validate authentication
  if (!userId) {
    throw createError.unauthorized('Authentication required');
  }

  // Validate roomId
  if (!roomId || typeof roomId !== 'string') {
    throw createError.badRequest('Room ID is required and must be a string');
  }

  // Validate socket manager and add REST fallback
  if (!socketManager) {
    // REST fallback: Query database directly
    try {
      const messages = await ChatMessage.find({ roomId })
        .populate('senderId', 'username')
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      return res.json({
        success: true,
        message: 'Chat history retrieved successfully (Database mode)',
        data: {
          roomId,
          messages: messages.reverse(), // Reverse to get chronological order
          total: messages.length,
          note: 'Retrieved from database - limited room validation'
        }
      });
    } catch (error) {
      throw createError.internal('Failed to retrieve chat history from database');
    }
  }

  const chatSocket = socketManager.getChatSocket?.();
  if (!chatSocket || typeof chatSocket.getChatRoomInfo !== 'function') {
    // REST fallback: Query database directly
    try {
      const messages = await ChatMessage.find({ roomId })
        .populate('senderId', 'username')
        .sort({ timestamp: -1 })
        .limit(Number(limit))
        .skip(Number(offset));

      return res.json({
        success: true,
        message: 'Chat history retrieved successfully (Database fallback)',
        data: {
          roomId,
          messages: messages.reverse(), // Reverse to get chronological order
          total: messages.length,
          note: 'Retrieved from database - limited room validation'
        }
      });
    } catch (error) {
      throw createError.internal('Failed to retrieve chat history from database');
    }
  }

  const chatRoom = chatSocket.getChatRoomInfo(roomId);

  if (!chatRoom) {
    throw createError.notFound('Chat room not found');
  }

  // Permission check
  if (
    chatRoom.type !== 'global' &&
    (!Array.isArray(chatRoom.participants) || !chatRoom.participants.includes(userId))
  ) {
    throw createError.forbidden('Access denied to this chat room');
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
});

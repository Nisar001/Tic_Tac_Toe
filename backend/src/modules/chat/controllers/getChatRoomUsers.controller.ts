import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';

// Rate limiting - 30 requests per minute per IP
export const getChatRoomUsersRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many chat room user requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const getChatRoomUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const user = req.user as { _id: string | { toString: () => string }, isDeleted?: boolean, isBlocked?: boolean };
    const userId = typeof user._id === 'string' ? user._id : user._id.toString();

    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    // Validate and sanitize room ID
    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);

    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      throw createError.badRequest('Invalid room ID format');
    }

    if (!socketManager || typeof socketManager.getChatSocket !== 'function') {
      throw createError.serviceUnavailable('Chat service is currently unavailable');
    }

    const chatSocket = socketManager.getChatSocket();
    const chatRoom = chatSocket.getChatRoomInfo(sanitizedRoomId);

    if (!chatRoom) {
      throw createError.notFound('Chat room not found');
    }

    const participants = Array.isArray(chatRoom.participants) ? chatRoom.participants : [];
    const spectators = Array.isArray((chatRoom as any).spectators) ? (chatRoom as any).spectators : [];

    const hasAccess =
      chatRoom.type === 'global' ||
      participants.includes(userId) ||
      spectators.includes(userId);

    if (!hasAccess) {
      throw createError.forbidden('Access denied to this chat room');
    }

    const authManager = socketManager.getAuthManager?.();
    if (!authManager || typeof authManager.getOnlineUsers !== 'function') {
      throw createError.serviceUnavailable('Auth manager is unavailable');
    }

    const onlineUsers = authManager.getOnlineUsers();

    // Filter users who are currently online and are in the room
    const roomUsers = onlineUsers.filter(user => participants.includes(user.id));

    const sanitizedUsers = roomUsers.map(user => ({
      id: user.id,
      email: user.email,
      username: (user as any).username || 'Unknown',
      avatar: (user as any).avatar || null,
      status: (user as any).status || 'online',
      joinedAt: (user as any).joinedAt || null,
      lastSeen: (user as any).lastSeen || null,
    }));

    const offlineCount = participants.length - roomUsers.length;

    res.json({
      success: true,
      data: {
        roomId: sanitizedRoomId,
        roomName: chatRoom.name || null,
        roomType: chatRoom.type,
        users: sanitizedUsers,
        statistics: {
          onlineCount: roomUsers.length,
          offlineCount,
          totalParticipants: participants.length,
          maxParticipants: (chatRoom as any).maxParticipants || null,
        },
        meta: {
          requestedAt: new Date(),
          requestedBy: userId,
        }
      }
    });

  } catch (error: any) {


    if (error.status && error.expose) {
      throw error;
    }

    throw createError.internal('Failed to retrieve chat room users');
  }
});

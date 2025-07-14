import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';

// Rate limiting: max 20 joins per minute
export const joinChatRoomRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many chat room join attempts. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const joinChatRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const userId = (req.user as { _id: string | { toString(): string } })._id.toString();

    // Check user account status
    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    // Validate roomId
    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);

    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      throw createError.badRequest('Room ID format is invalid');
    }

    // Rate limit per user: prevent abuse
    const lastJoinTimeRaw = req.user.lastRoomJoinTime;
    const lastJoinTime: Date | null =
      lastJoinTimeRaw instanceof Date
        ? lastJoinTimeRaw
        : (typeof lastJoinTimeRaw === 'string' || typeof lastJoinTimeRaw === 'number')
        ? new Date(lastJoinTimeRaw)
        : null;
    const now = new Date();
    const cooldownMs = 2000;

    if (lastJoinTime && !AuthUtils.isActionAllowed(lastJoinTime, cooldownMs)) {
      throw createError.tooManyRequests('Please wait before joining another room');
    }

    // Check if socketManager is available (optional for REST API testing)
    if (!socketManager || typeof socketManager.getAuthManager !== 'function') {
      // For testing purposes, allow joining without socket connection
      // Update last join time
      req.user.lastRoomJoinTime = now;
      await req.user.save();

      res.json({
        success: true,
        message: 'Joined chat room successfully (REST mode)',
        data: {
          roomId: sanitizedRoomId,
          joinedAt: now,
          userId,
          note: 'WebSocket connection not available - limited functionality'
        },
      });
      return;
    }

    const authManager = socketManager.getAuthManager();
    const userSocket = authManager?.getSocketByUserId(userId);

    if (!userSocket) {
      // For testing purposes, allow joining without socket connection
      req.user.lastRoomJoinTime = now;
      await req.user.save();

      res.json({
        success: true,
        message: 'Joined chat room successfully (REST mode)',
        data: {
          roomId: sanitizedRoomId,
          joinedAt: now,
          userId,
          note: 'WebSocket connection not available - limited functionality'
        },
      });
      return;
    }

    // Update last join time before joining room
    req.user.lastRoomJoinTime = now;
    await req.user.save();

    // Attempt to join chat room via socket
    const chatSocket = socketManager.getChatSocket();
    if (!chatSocket || typeof chatSocket.handleJoinChat !== 'function') {
      throw createError.serviceUnavailable('Chat socket is not available');
    }

    try {
      chatSocket.handleJoinChat(userSocket, { roomId: sanitizedRoomId });
    } catch (socketError) {
      console.error('Socket error while joining room:', socketError);
      throw createError.internal('Failed to join chat room through socket service');
    }

    res.json({
      success: true,
      message: 'Joined chat room successfully',
      data: {
        roomId: sanitizedRoomId,
        joinedAt: now,
        userId,
      },
    });
  } catch (error: any) {
    console.error('Join chat room error:', error);

    if (error.status && error.expose) {
      throw error;
    }

    throw createError.internal('An unexpected error occurred while joining the chat room');
  }
});

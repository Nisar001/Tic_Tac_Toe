import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';

// Rate limiting for leaving chat rooms - 30 requests per minute
export const leaveChatRoomRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many chat room leave requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const leaveChatRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const userId = (req.user as { _id: { toString: () => string } })._id.toString();

    // Check user account status
    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    // Validate room ID
    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);

    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      throw createError.badRequest('Invalid room ID format');
    }

    // Ensure socketManager is initialized
    if (!socketManager) {
      throw createError.serviceUnavailable('Chat service is currently unavailable');
    }

    const authManager = socketManager.getAuthManager?.();
    const chatSocket = socketManager.getChatSocket?.();

    if (!authManager || !chatSocket) {
      throw createError.serviceUnavailable('Chat service is not fully initialized');
    }

    const userSocket = authManager.getSocketByUserId?.(userId);

    if (userSocket) {
      try {
        chatSocket.handleLeaveChat?.(userSocket, { roomId: sanitizedRoomId });
      } catch (socketError) {
        console.error('Socket error while leaving chat room:', socketError);
        // Proceed: leaving via API shouldn't fail even if socket fails
      }
    } else {
      console.warn(`Socket not found for user ${userId} while leaving room ${sanitizedRoomId}`);
    }

    res.json({
      success: true,
      message: 'Left chat room successfully',
      data: {
        roomId: sanitizedRoomId,
        leftAt: new Date(),
        userId,
      }
    });

  } catch (error: any) {
    console.error('Leave chat room error:', error);
    const fallbackMessage = error?.message || 'Something went wrong while leaving the chat room';
    throw createError.internal(fallbackMessage);
  }
});

import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { socketManager } from '../../../server';

// Rate limiting for sending messages - 60 messages per minute
export const sendMessageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'Too many messages sent. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const { message } = req.body;
    const userId = (req.user as { _id: { toString: () => string } })._id.toString();

    // Check account status
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

    // Validate message
    if (!message || typeof message !== 'string') {
      throw createError.badRequest('Message is required and must be a string');
    }

    const sanitizedMessage = AuthUtils.validateAndSanitizeInput(message, 500).trim();
    if (sanitizedMessage.length === 0) {
      throw createError.badRequest('Message cannot be empty');
    }

    if (sanitizedMessage.length > 500) {
      throw createError.badRequest('Message too long (max 500 characters)');
    }

    const spamPatterns = [
      /(.)\1{4,}/,                        // repeated characters
      /^\s*(.+?)\s*\1+\s*$/i,             // repeated words
      /(https?:\/\/[^\s]+){3,}/i         // too many URLs
    ];
    if (spamPatterns.some(pattern => pattern.test(sanitizedMessage))) {
      throw createError.badRequest('Message appears to be spam');
    }

    // Per-user message cooldown (anti-spam)
    const userLastMessage = req.user.lastMessageTime;
    const userCooldownMs = 1000;
    if (userLastMessage && !AuthUtils.isActionAllowed(userLastMessage, userCooldownMs)) {
      throw createError.tooManyRequests('Please wait before sending another message');
    }

    // Socket manager validation
    if (!socketManager) {
      throw createError.serviceUnavailable('Chat service is currently unavailable');
    }

    const authManager = socketManager.getAuthManager?.();
    const chatSocket = socketManager.getChatSocket?.();

    if (!authManager || !chatSocket) {
      throw createError.serviceUnavailable('Chat system is not initialized properly');
    }

    const userSocket = authManager.getSocketByUserId?.(userId);
    if (!userSocket) {
      throw createError.badRequest('You must be connected via WebSocket to send messages');
    }

    // Save message timestamp
    req.user.lastMessageTime = new Date();
    await req.user.save();

    try {
      chatSocket.handleChatMessage(userSocket, {
        roomId: sanitizedRoomId,
        message: sanitizedMessage
      });
    } catch (socketError) {
      console.error('Socket error while sending message:', socketError);
      throw createError.internal('Failed to send message through chat service');
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageLength: sanitizedMessage.length,
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    throw createError.internal(error.message || 'Something went wrong while sending the message');
  }
});

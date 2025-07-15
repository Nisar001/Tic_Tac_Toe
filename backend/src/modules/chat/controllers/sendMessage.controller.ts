import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';
import ChatMessage from '../../../models/chatMessage.model';

// Import socket manager with fallback handling
let socketManager: any = null;
try {
  socketManager = require('../../../socket/index')?.socketManager || null;
} catch (error) {
  // Socket manager not available, will use REST fallback
  socketManager = null;
}

// Production-ready rate limiting for chat messages
export const sendMessageRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 30 : 60, // 30 in prod, 60 in dev
  message: {
    success: false,
    message: 'Too many messages sent. Please slow down.',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Message send attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Message send attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Message send attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    const { roomId: bodyRoomId } = req.params;
    const { roomId: legacyRoomId, message, messageType = 'text' } = req.body;
    
    // Support both param-based and body-based roomId for backward compatibility
    const roomId = bodyRoomId || legacyRoomId;
    const userId = req.user._id.toString();

    // Enhanced room ID validation
    if (!roomId || typeof roomId !== 'string') {
      logWarn(`Message send attempt with invalid room ID from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);
    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      logWarn(`Message send attempt with malformed room ID: ${roomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Invalid room ID format');
    }

    // Enhanced message validation
    if (!message || typeof message !== 'string') {
      logWarn(`Message send attempt with invalid message from user: ${req.user.username} room: ${sanitizedRoomId} IP: ${clientIP}`);
      throw createError.badRequest('Message is required and must be a string');
    }

    const sanitizedMessage = AuthUtils.validateAndSanitizeInput(message, 1000);
    if (sanitizedMessage.length === 0) {
      throw createError.badRequest('Message cannot be empty after sanitization');
    }

    if (sanitizedMessage.length > 500) {
      throw createError.badRequest('Message is too long (max 500 characters)');
    }

    // Enhanced message type validation
    const validMessageTypes = ['text', 'game', 'system', 'emoji'];
    if (!validMessageTypes.includes(messageType)) {
      logWarn(`Message send attempt with invalid type: ${messageType} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest(`Invalid message type. Must be one of: ${validMessageTypes.join(', ')}`);
    }

    // Content filtering for inappropriate content
    const inappropriatePatterns = [
      /\b(spam|scam|phishing)\b/i,
      /\b(fuck|shit|damn|ass|bitch)\b/i, // Basic profanity filter
      /(https?:\/\/[^\s]+)/g // Links (can be suspicious)
    ];

    let contentWarning = false;
    for (const pattern of inappropriatePatterns) {
      if (pattern.test(sanitizedMessage)) {
        contentWarning = true;
        logWarn(`Potentially inappropriate message from user: ${req.user.username} in room: ${sanitizedRoomId} IP: ${clientIP}`);
        break;
      }
    }

    // Check for message spam (same message repeated)
    if (messageType === 'text') {
      const recentMessages = await ChatMessage.find({
        room: sanitizedRoomId,
        sender: userId,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
      }).limit(5);

      const sameMessageCount = recentMessages.filter(msg => 
        msg.message.toLowerCase().trim() === sanitizedMessage.toLowerCase().trim()
      ).length;

      if (sameMessageCount >= 3) {
        logWarn(`Spam detection: repeated message from user: ${req.user.username} in room: ${sanitizedRoomId} IP: ${clientIP}`);
        throw createError.tooManyRequests('Please avoid sending the same message repeatedly');
      }
    }

    // Create message object with enhanced metadata
    const messageData = {
      gameId: new mongoose.Types.ObjectId(), // Placeholder game ID
      sender: userId,
      message: sanitizedMessage,
      messageType,
      timestamp: new Date(),
      isRead: false
    };

    // Save message to database with error handling
    let savedMessage;
    try {
      savedMessage = await ChatMessage.create(messageData);
      await savedMessage.populate('sender', 'username avatar');
    } catch (saveError) {
      logError(`Failed to save message for user ${userId} in room ${sanitizedRoomId}: ${saveError}`);
      throw createError.internal('Failed to save message. Please try again.');
    }

    // Prepare response data
    const responseMessage = {
      _id: savedMessage._id,
      gameId: savedMessage.gameId,
      sender: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar
      },
      message: savedMessage.message,
      messageType: savedMessage.messageType,
      timestamp: savedMessage.timestamp,
      createdAt: savedMessage.createdAt
    };

    // Try to emit via socket with enhanced error handling
    if (socketManager && typeof socketManager.emitToRoom === 'function') {
      try {
        socketManager.emitToRoom(sanitizedRoomId, 'new_message', responseMessage);
        logInfo(`Message sent via socket to room: ${sanitizedRoomId} from user: ${req.user.username}`);
      } catch (socketError) {
        logError(`Socket error while sending message to room ${sanitizedRoomId}: ${socketError}`);
        // Continue with REST response - socket failure shouldn't break the flow
      }
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Message sent in ${duration}ms: user ${req.user.username} to room ${sanitizedRoomId} from IP: ${clientIP}`);

    // Enhanced response
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: responseMessage,
        room: sanitizedRoomId,
        timestamp: new Date().toISOString(),
        warnings: contentWarning ? ['Content may contain inappropriate material'] : []
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Send message failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

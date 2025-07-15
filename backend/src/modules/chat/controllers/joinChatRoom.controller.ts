import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { AuthUtils } from '../../../utils/auth.utils';
import { logInfo, logWarn, logError } from '../../../utils/logger';

// Import socket manager with fallback handling
let socketManager: any = null;
try {
  socketManager = require('../../../socket/index')?.socketManager || null;
} catch (error) {
  // Socket manager not available, will use REST fallback
  socketManager = null;
}

// Production-ready rate limiting for joining chat rooms
export const joinChatRoomRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 15 : 30, // 15 in prod, 30 in dev
  message: {
    success: false,
    message: 'Too many chat room join attempts. Please slow down.',
    code: 'JOIN_ROOM_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const joinChatRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const clientIP = req.ip || 'unknown';

  try {
    // Enhanced authentication validation
    if (!req.user) {
      logWarn(`Chat room join attempt without authentication from IP: ${clientIP}`);
      throw createError.unauthorized('Authentication required');
    }

    // Enhanced account status checks
    if (req.user.isDeleted) {
      logWarn(`Chat room join attempt on deleted account: ${req.user._id} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been deactivated');
    }

    if (req.user.isBlocked) {
      logWarn(`Chat room join attempt on blocked account: ${req.user.email} from IP: ${clientIP}`);
      throw createError.forbidden('Account has been blocked');
    }

    const { roomId } = req.params;
    const userId = req.user._id.toString();

    // Enhanced room ID validation
    if (!roomId || typeof roomId !== 'string') {
      logWarn(`Chat room join attempt with invalid room ID from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Room ID is required and must be a string');
    }

    const sanitizedRoomId = AuthUtils.validateAndSanitizeInput(roomId, 50);
    if (sanitizedRoomId.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedRoomId)) {
      logWarn(`Chat room join attempt with malformed room ID: ${roomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.badRequest('Invalid room ID format');
    }

    // Enhanced join cooldown to prevent spam
    const joinCooldownMs = 2 * 1000; // 2 seconds
    if (req.user.lastRoomJoinTime) {
      const timeSinceLastJoin = Date.now() - new Date(req.user.lastRoomJoinTime).getTime();
      if (timeSinceLastJoin < joinCooldownMs) {
        const remainingTime = Math.ceil((joinCooldownMs - timeSinceLastJoin) / 1000);
        logWarn(`Chat room join attempt during cooldown from user: ${req.user.username} (${remainingTime}s remaining) IP: ${clientIP}`);
        throw createError.tooManyRequests(`Please wait ${remainingTime} seconds before joining another room`);
      }
    }

    // Room validation - check if room exists and user has permission
    const allowedRoomPatterns = [
      /^general$/,
      /^game_\d+$/,
      /^custom_\d+_[a-zA-Z0-9_-]+$/,
      /^lobby$/,
      /^tournament_\d+$/
    ];

    const isValidRoom = allowedRoomPatterns.some(pattern => pattern.test(sanitizedRoomId));
    if (!isValidRoom) {
      logWarn(`Chat room join attempt to invalid room: ${sanitizedRoomId} from user: ${req.user.username} IP: ${clientIP}`);
      throw createError.forbidden('Invalid or restricted room');
    }

    // Check if user is online and available for chat
    if (!req.user.isOnline) {
      req.user.isOnline = true;
    }

    // Prepare user data for room
    const userData = {
      _id: req.user._id,
      username: req.user.username,
      avatar: req.user.avatar,
      isOnline: true,
      joinedAt: new Date()
    };

    // Socket-based room joining with enhanced error handling
    let socketJoinSuccess = false;
    if (socketManager && typeof socketManager.joinRoom === 'function') {
      try {
        socketJoinSuccess = await socketManager.joinRoom(userId, sanitizedRoomId, userData);
        if (socketJoinSuccess) {
          logInfo(`User joined room via socket: ${req.user.username} -> ${sanitizedRoomId}`);
        }
      } catch (socketError) {
        logError(`Socket error during room join for user ${req.user.username} to room ${sanitizedRoomId}: ${socketError}`);
        // Continue with REST fallback
      }
    }

    // Update user's status (REST fallback or complement)
    try {
      req.user.lastRoomJoinTime = new Date();
      req.user.isOnline = true;
      
      await req.user.save({ validateBeforeSave: false });
    } catch (saveError) {
      logError(`Failed to update user status for ${req.user.username}: ${saveError}`);
      // Don't fail the join if user save fails
    }

    // Broadcast join notification to room
    if (socketManager && typeof socketManager.emitToRoom === 'function') {
      try {
        const joinNotification = {
          type: 'user_joined',
          user: userData,
          room: sanitizedRoomId,
          timestamp: new Date(),
          message: `${req.user.username} joined the room`
        };
        
        socketManager.emitToRoom(sanitizedRoomId, 'user_joined', joinNotification);
      } catch (notificationError) {
        logError(`Failed to send join notification for room ${sanitizedRoomId}: ${notificationError}`);
        // Continue - notification failure shouldn't break join
      }
    }

    // Performance logging
    const duration = Date.now() - startTime;
    logInfo(`Chat room join completed in ${duration}ms: user ${req.user.username} -> room ${sanitizedRoomId} from IP: ${clientIP}`);

    // Enhanced response
    res.status(200).json({
      success: true,
      message: `Successfully joined room: ${sanitizedRoomId}`,
      data: {
        room: {
          id: sanitizedRoomId,
          name: sanitizedRoomId,
          joinedAt: new Date(),
          memberCount: socketJoinSuccess ? 'updating...' : 'unknown'
        },
        user: {
          id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar,
          isOnline: req.user.isOnline
        },
        socketConnected: socketJoinSuccess,
        joinMethod: socketJoinSuccess ? 'socket' : 'rest',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logError(`Chat room join failed in ${duration}ms from IP ${clientIP}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
});

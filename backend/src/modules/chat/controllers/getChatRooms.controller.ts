import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import { socketManager } from '../../../server';

// Rate limiting: max 30 chat room fetches per minute per IP
export const getChatRoomsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Too many chat room requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const getChatRooms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const userId = (req.user as { _id: string | { toString(): string } })._id.toString();

    if (req.user.isDeleted || req.user.isBlocked) {
      throw createError.forbidden('Account is not active');
    }

    const { type, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw createError.badRequest('Page must be a positive number');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      throw createError.badRequest('Limit must be a number between 1 and 50');
    }

    const validTypes = ['global', 'private', 'game', 'direct'];
    const roomTypeFilter = type ? (type as string).toLowerCase() : undefined;

    if (roomTypeFilter && !validTypes.includes(roomTypeFilter)) {
      throw createError.badRequest(`Invalid room type. Must be one of: ${validTypes.join(', ')}`);
    }

    if (!socketManager || typeof socketManager.getChatSocket !== 'function') {
      throw createError.serviceUnavailable('Chat service is not available');
    }

    const chatSocket = socketManager.getChatSocket();
    const allRooms = chatSocket.getAllChatRooms?.() || [];

    const accessibleRooms = allRooms.filter(room => {
      const isGlobal = room.type === 'global';
      const isParticipant = Array.isArray(room.participants) && room.participants.includes(userId);
      const isSpectator = room.type === 'game' && Array.isArray((room as any).spectators) && (room as any).spectators.includes(userId);

      const typeMatches = roomTypeFilter ? room.type === roomTypeFilter : true;
      return (isGlobal || isParticipant || isSpectator) && typeMatches;
    });

    // Pagination
    const totalRooms = accessibleRooms.length;
    const totalPages = Math.ceil(totalRooms / limitNum);
    const skip = (pageNum - 1) * limitNum;
    const paginatedRooms = accessibleRooms.slice(skip, skip + limitNum);

    // Map for response
    const formattedRooms = paginatedRooms.map(room => ({
      id: room.id,
      name: room.name,
      type: room.type,
      participantCount: Array.isArray(room.participants) ? room.participants.length : 0,
      lastActivity: room.lastActivity || null,
      description: (room as any).description || null,
      isPrivate: Boolean((room as any).isPrivate),
      hasUnreadMessages: false, // Placeholder for future implementation
      maxParticipants: (room as any).maxParticipants || null,
      createdAt: room.createdAt || null,
      createdBy: (room as any).createdBy || null,
    }));

    res.json({
      success: true,
      data: {
        rooms: formattedRooms,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRooms,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1,
        },
        meta: {
          filter: {
            type: roomTypeFilter || 'all',
          },
          generatedAt: new Date(),
        },
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat rooms'
    });
  }
});

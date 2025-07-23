/**
 * Simple Socket.io Chat System
 * Integrates with existing chat structure
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import ChatMessage from '../../../models/chatMessage.model';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { logInfo, logError, logWarn } from '../../../utils/logger';
import { validationResult } from 'express-validator';

// Simple room storage for Socket.io
interface SimpleRoom {
  id: string;
  name: string;
  participants: string[];
  gameId?: string;
  createdAt: Date;
}

class SimpleRoomManager {
  private static instance: SimpleRoomManager;
  private rooms: Map<string, SimpleRoom> = new Map();

  static getInstance(): SimpleRoomManager {
    if (!SimpleRoomManager.instance) {
      SimpleRoomManager.instance = new SimpleRoomManager();
    }
    return SimpleRoomManager.instance;
  }

  createRoom(name: string, creatorId: string, gameId?: string): SimpleRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room: SimpleRoom = {
      id: roomId,
      name,
      participants: [creatorId],
      gameId,
      createdAt: new Date()
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): SimpleRoom | undefined {
    return this.rooms.get(roomId);
  }

  getAvailableRooms(): SimpleRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.participants.length < 2
    );
  }

  joinRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.participants.length >= 2) {
      return false;
    }
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
    }
    return true;
  }

  leaveRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    room.participants = room.participants.filter(id => id !== userId);
    
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
    }
    return true;
  }

  getUserRooms(userId: string): SimpleRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.participants.includes(userId)
    );
  }
}

const roomManager = SimpleRoomManager.getInstance();

/**
 * Create a chat room
 */
export const createSimpleRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
      return;
    }

    const { name, gameId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const room = roomManager.createRoom(name.trim(), userId, gameId);

    // Notify via Socket.io if available
    try {
      const io = require('../../../socket/index').getSocketManager()?.getIO();
      if (io) {
        io.emit('room-created', {
          roomId: room.id,
          name: room.name,
          createdBy: userId,
          gameId: room.gameId
        });
      }
    } catch (socketError) {
      logWarn('Socket.io not available for room creation notification');
    }

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: {
        roomId: room.id,
        name: room.name,
        participantCount: room.participants.length,
        gameId: room.gameId
      }
    });

  } catch (error) {
    logError(`Error creating chat room: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room'
    });
  }
};

/**
 * Get available rooms
 */
export const getAvailableRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const availableRooms = roomManager.getAvailableRooms();
    
    res.status(200).json({
      success: true,
      message: 'Available rooms retrieved successfully',
      data: {
        rooms: availableRooms.map(room => ({
          roomId: room.id,
          name: room.name,
          participantCount: room.participants.length,
          maxParticipants: 2,
          gameId: room.gameId,
          canJoin: !room.participants.includes(userId)
        }))
      }
    });

  } catch (error) {
    logError(`Error getting available rooms: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get available rooms'
    });
  }
};

/**
 * Join a room
 */
export const joinSimpleRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const success = roomManager.joinRoom(roomId, userId);
    if (!success) {
      res.status(400).json({
        success: false,
        message: 'Failed to join room - room may be full or not found'
      });
      return;
    }

    // Notify via Socket.io
    try {
      const io = require('../../../socket/index').getSocketManager()?.getIO();
      if (io) {
        io.to(roomId).emit('user-joined', {
          roomId,
          userId,
          timestamp: new Date()
        });
      }
    } catch (socketError) {
      logWarn('Socket.io not available for join notification');
    }

    res.status(200).json({
      success: true,
      message: 'Successfully joined room',
      data: { roomId }
    });

  } catch (error) {
    logError(`Error joining room: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
};

/**
 * Send message using Socket.io
 */
export const sendSocketMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
      return;
    }

    const { message, roomId, gameId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    let targetRoomId = roomId;

    // If sending to game, validate game access
    if (gameId) {
      const game = await Game.findById(gameId);
      if (!game) {
        res.status(404).json({
          success: false,
          message: 'Game not found'
        });
        return;
      }

      const isPlayer1 = game.players?.player1?.toString() === userId;
      const isPlayer2 = game.players?.player2?.toString() === userId;

      if (!isPlayer1 && !isPlayer2) {
        res.status(403).json({
          success: false,
          message: 'You are not part of this game'
        });
        return;
      }

      targetRoomId = `game_${gameId}`;
    }

    // Validate room access if roomId provided
    if (roomId && !gameId) {
      const room = roomManager.getRoom(roomId);
      if (!room || !room.participants.includes(userId)) {
        res.status(403).json({
          success: false,
          message: 'You are not part of this room'
        });
        return;
      }
    }

    // Save message to database
    const chatMessage = new ChatMessage({
      gameId: gameId || undefined,
      sender: userId,
      message: message.trim(),
      messageType: 'text',
      timestamp: new Date()
    });

    await chatMessage.save();
    await chatMessage.populate('sender', 'username avatar');

    // Broadcast via Socket.io
    try {
      const io = require('../../../socket/index').getSocketManager()?.getIO();
      if (io) {
        const messageData = {
          id: chatMessage._id,
          sender: {
            id: userId,
            username: (chatMessage.sender as any).username,
            avatar: (chatMessage.sender as any).avatar
          },
          message: chatMessage.message,
          timestamp: chatMessage.timestamp,
          roomId: targetRoomId,
          gameId: gameId || null
        };

        io.to(targetRoomId).emit('new-message', messageData);
      }
    } catch (socketError) {
      logWarn('Socket.io not available for message broadcasting');
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: chatMessage._id,
        roomId: targetRoomId,
        timestamp: chatMessage.timestamp
      }
    });

  } catch (error) {
    logError(`Error sending message: ${error}`);
    res.status(500).json({
      success: false,
      message: 'Failed to send message'
    });
  }
};

export { roomManager };

export default {
  createSimpleRoom,
  getAvailableRooms,
  joinSimpleRoom,
  sendSocketMessage,
  roomManager
};

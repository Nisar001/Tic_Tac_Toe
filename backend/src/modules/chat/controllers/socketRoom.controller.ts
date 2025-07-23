/**
 * Complete Socket.io Chat Room Controller
 * Implements all requirements for 2-user private rooms and game chat
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import ChatMessage from '../../../models/chatMessage.model';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { logInfo, logError, logWarn } from '../../../utils/logger';
import { validationResult } from 'express-validator';

// Enhanced room interface for complete functionality
interface ChatRoom {
  id: string;
  name: string;
  participants: {
    userId: string;
    username: string;
    joinedAt: Date;
    isOnline: boolean;
  }[];
  gameId?: string;
  createdAt: Date;
  lastActivity: Date;
  isPrivate: boolean;
  maxParticipants: number;
}

// Singleton Room Manager with Socket.io integration
class SocketChatRoomManager {
  private static instance: SocketChatRoomManager;
  private rooms: Map<string, ChatRoom> = new Map();
  private userToRooms: Map<string, Set<string>> = new Map();

  static getInstance(): SocketChatRoomManager {
    if (!SocketChatRoomManager.instance) {
      SocketChatRoomManager.instance = new SocketChatRoomManager();
    }
    return SocketChatRoomManager.instance;
  }

  /**
   * Create a new chat room (max 2 users as per requirements)
   */
  createRoom(name: string, creatorId: string, creatorUsername: string, gameId?: string): ChatRoom {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room: ChatRoom = {
      id: roomId,
      name: name.trim(),
      participants: [{
        userId: creatorId,
        username: creatorUsername,
        joinedAt: new Date(),
        isOnline: true
      }],
      gameId,
      createdAt: new Date(),
      lastActivity: new Date(),
      isPrivate: true,
      maxParticipants: 2 // YOUR REQUIREMENT: Only 2 users per room
    };

    this.rooms.set(roomId, room);
    
    // Track user to room mapping
    if (!this.userToRooms.has(creatorId)) {
      this.userToRooms.set(creatorId, new Set());
    }
    this.userToRooms.get(creatorId)!.add(roomId);

    logInfo(`Room created: ${roomId} by ${creatorUsername} (${creatorId})`);
    return room;
  }

  /**
   * Get rooms available for joining (YOUR REQUIREMENT: Show rooms until 2 users joined)
   */
  getAvailableRooms(): ChatRoom[] {
    return Array.from(this.rooms.values()).filter(
      room => room.participants.length < room.maxParticipants // Only show rooms with space
    );
  }

  /**
   * Get all rooms (including full ones) for admin/debug
   */
  getAllRooms(): ChatRoom[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Join a room (YOUR REQUIREMENT: Only 2 users maximum)
   */
  joinRoom(roomId: string, userId: string, username: string): { success: boolean; message: string; room?: ChatRoom } {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // Check if room is full (YOUR REQUIREMENT: Max 2 users)
    if (room.participants.length >= room.maxParticipants) {
      return { success: false, message: 'Room is full (maximum 2 users)' };
    }

    // Check if user already in room
    const alreadyInRoom = room.participants.some(p => p.userId === userId);
    if (alreadyInRoom) {
      return { success: false, message: 'You are already in this room' };
    }

    // Add user to room
    room.participants.push({
      userId,
      username,
      joinedAt: new Date(),
      isOnline: true
    });
    room.lastActivity = new Date();

    // Track user to room mapping
    if (!this.userToRooms.has(userId)) {
      this.userToRooms.set(userId, new Set());
    }
    this.userToRooms.get(userId)!.add(roomId);

    logInfo(`User ${username} (${userId}) joined room ${roomId}`);
    
    return { success: true, message: 'Successfully joined room', room };
  }

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string): { success: boolean; message: string } {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    // Remove user from room
    room.participants = room.participants.filter(p => p.userId !== userId);
    room.lastActivity = new Date();

    // Remove from user tracking
    this.userToRooms.get(userId)?.delete(roomId);

    // Delete room if empty
    if (room.participants.length === 0) {
      this.rooms.delete(roomId);
      logInfo(`Room ${roomId} deleted (empty)`);
    }

    logInfo(`User ${userId} left room ${roomId}`);
    return { success: true, message: 'Successfully left room' };
  }

  /**
   * Get user's rooms
   */
  getUserRooms(userId: string): ChatRoom[] {
    const userRoomIds = this.userToRooms.get(userId) || new Set();
    return Array.from(userRoomIds)
      .map(roomId => this.rooms.get(roomId))
      .filter(room => room !== undefined) as ChatRoom[];
  }

  /**
   * Get room details
   */
  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Create or get game-specific chat room
   */
  createGameRoom(gameId: string, player1Id: string, player1Username: string, player2Id?: string, player2Username?: string): ChatRoom {
    const existingRoom = Array.from(this.rooms.values()).find(room => room.gameId === gameId);
    
    if (existingRoom) {
      return existingRoom;
    }

    const roomName = `Game Chat - ${gameId.substring(0, 8)}`;
    const room = this.createRoom(roomName, player1Id, player1Username, gameId);

    // Add player2 if provided
    if (player2Id && player2Username) {
      this.joinRoom(room.id, player2Id, player2Username);
    }

    return room;
  }

  /**
   * Update user online status
   */
  updateUserStatus(userId: string, isOnline: boolean): void {
    const userRoomIds = this.userToRooms.get(userId) || new Set();
    
    userRoomIds.forEach(roomId => {
      const room = this.rooms.get(roomId);
      if (room) {
        const participant = room.participants.find(p => p.userId === userId);
        if (participant) {
          participant.isOnline = isOnline;
        }
      }
    });
  }
}

const roomManager = SocketChatRoomManager.getInstance();

/**
 * Create a new chat room
 */
export const createChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Create the room
    const room = roomManager.createRoom(name, userId, username, gameId);

    // Emit real-time update via Socket.io
    try {
      const io = (global as any).socketIO;
      if (io) {
        // Broadcast new room to all users
        io.emit('roomCreated', {
          room: {
            id: room.id,
            name: room.name,
            participantCount: room.participants.length,
            maxParticipants: room.maxParticipants,
            createdAt: room.createdAt,
            gameId: room.gameId
          }
        });

        // Join the creator to the Socket.io room
        const creatorSocket = io.sockets.sockets.get(userId);
        if (creatorSocket) {
          creatorSocket.join(room.id);
        }
      }
    } catch (socketError) {
      logWarn(`Socket.io notification failed: ${socketError}`);
    }

    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: {
        room: {
          id: room.id,
          name: room.name,
          participants: room.participants,
          gameId: room.gameId,
          createdAt: room.createdAt,
          maxParticipants: room.maxParticipants
        }
      }
    });
  } catch (error: any) {
    logError(`Error creating chat room: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create chat room',
      error: error.message
    });
  }
};

/**
 * Get available rooms (YOUR REQUIREMENT: Only show rooms with space)
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

    // Get rooms with available space (less than 2 users)
    const availableRooms = roomManager.getAvailableRooms();
    
    // Format rooms for response
    const formattedRooms = availableRooms.map(room => ({
      id: room.id,
      name: room.name,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      participants: room.participants.map(p => ({
        username: p.username,
        isOnline: p.isOnline
      })),
      createdAt: room.createdAt,
      gameId: room.gameId,
      canJoin: !room.participants.some(p => p.userId === userId) // Can't join if already in
    }));

    res.status(200).json({
      success: true,
      message: 'Available rooms retrieved successfully',
      data: {
        rooms: formattedRooms,
        total: formattedRooms.length
      }
    });
  } catch (error: any) {
    logError(`Error getting available rooms: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get available rooms',
      error: error.message
    });
  }
};

/**
 * Join a chat room
 */
export const joinChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const result = roomManager.joinRoom(roomId, userId, username);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
    }

    // Emit real-time updates via Socket.io
    try {
      const io = (global as any).socketIO;
      if (io) {
        // Join the Socket.io room
        const userSocket = Object.values(io.sockets.sockets).find((s: any) => s.userId === userId);
        if (userSocket) {
          (userSocket as any).join(roomId);
        }

        // Notify room participants
        io.to(roomId).emit('userJoined', {
          roomId,
          user: { userId, username },
          participantCount: result.room!.participants.length
        });

        // If room is now full (2 users), hide it from available rooms
        if (result.room!.participants.length >= result.room!.maxParticipants) {
          io.emit('roomFull', { roomId });
        }
      }
    } catch (socketError) {
      logWarn(`Socket.io notification failed: ${socketError}`);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        room: {
          id: result.room!.id,
          name: result.room!.name,
          participants: result.room!.participants,
          participantCount: result.room!.participants.length,
          maxParticipants: result.room!.maxParticipants,
          gameId: result.room!.gameId
        }
      }
    });
  } catch (error: any) {
    logError(`Error joining chat room: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to join chat room',
      error: error.message
    });
  }
};

/**
 * Leave a chat room
 */
export const leaveChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const result = roomManager.leaveRoom(roomId, userId);

    // Emit real-time updates via Socket.io
    try {
      const io = (global as any).socketIO;
      if (io) {
        // Leave the Socket.io room
        const userSocket = Object.values(io.sockets.sockets).find((s: any) => s.userId === userId);
        if (userSocket) {
          (userSocket as any).leave(roomId);
        }

        // Notify remaining participants
        io.to(roomId).emit('userLeft', {
          roomId,
          userId,
          message: 'User left the room'
        });

        // Room is now available again (less than 2 users)
        const room = roomManager.getRoom(roomId);
        if (room && room.participants.length < room.maxParticipants) {
          io.emit('roomAvailable', { 
            roomId,
            room: {
              id: room.id,
              name: room.name,
              participantCount: room.participants.length,
              maxParticipants: room.maxParticipants
            }
          });
        }
      }
    } catch (socketError) {
      logWarn(`Socket.io notification failed: ${socketError}`);
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    logError(`Error leaving chat room: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to leave chat room',
      error: error.message
    });
  }
};

/**
 * Get user's current rooms
 */
export const getUserRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    const userRooms = roomManager.getUserRooms(userId);
    
    const formattedRooms = userRooms.map(room => ({
      id: room.id,
      name: room.name,
      participants: room.participants,
      participantCount: room.participants.length,
      maxParticipants: room.maxParticipants,
      lastActivity: room.lastActivity,
      gameId: room.gameId
    }));

    res.status(200).json({
      success: true,
      message: 'User rooms retrieved successfully',
      data: {
        rooms: formattedRooms,
        total: formattedRooms.length
      }
    });
  } catch (error: any) {
    logError(`Error getting user rooms: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get user rooms',
      error: error.message
    });
  }
};

/**
 * Create or join game-specific chat room
 */
export const createGameChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { gameId } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Verify game exists and user is part of it
    const game = await Game.findById(gameId).populate('players.player1 players.player2');
    
    if (!game) {
      res.status(404).json({
        success: false,
        message: 'Game not found'
      });
      return;
    }

    // Check if user is part of the game
    const isPlayer1 = game.players?.player1?._id.toString() === userId;
    const isPlayer2 = game.players?.player2?._id.toString() === userId;

    if (!isPlayer1 && !isPlayer2) {
      res.status(403).json({
        success: false,
        message: 'You are not part of this game'
      });
      return;
    }

    // Create or get game chat room
    const player1 = game.players?.player1 as any;
    const player2 = game.players?.player2 as any;
    
    const room = roomManager.createGameRoom(
      gameId,
      player1?._id.toString(),
      player1?.username,
      player2?._id.toString(),
      player2?.username
    );

    res.status(200).json({
      success: true,
      message: 'Game chat room ready',
      data: {
        room: {
          id: room.id,
          name: room.name,
          participants: room.participants,
          gameId: room.gameId,
          createdAt: room.createdAt
        }
      }
    });
  } catch (error: any) {
    logError(`Error creating game chat room: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create game chat room',
      error: error.message
    });
  }
};

// Export room manager for Socket.io integration
export { roomManager as socketChatRoomManager };

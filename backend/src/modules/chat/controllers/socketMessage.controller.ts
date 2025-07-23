/**
 * Socket.io Real-time Message Controller
 * Handles real-time messaging with complete Socket.io integration
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import ChatMessage from '../../../models/chatMessage.model';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { logInfo, logError, logWarn } from '../../../utils/logger';
import { validationResult } from 'express-validator';
import { socketChatRoomManager } from './socketRoom.controller';

/**
 * Send a real-time message via Socket.io
 */
export const sendRealtimeMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const { roomId, message, messageType = 'text', gameId } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Get room details
    const room = socketChatRoomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
      return;
    }

    // Check if user is in the room
    const isInRoom = room.participants.some(p => p.userId === userId);
    if (!isInRoom) {
      res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
      return;
    }

    // If it's a game room, validate game access
    if (room.gameId) {
      const game = await Game.findById(room.gameId);
      if (!game) {
        res.status(404).json({
          success: false,
          message: 'Associated game not found'
        });
        return;
      }

      // Check if user is part of the game
      const isPlayer1 = game.players?.player1?.toString() === userId;
      const isPlayer2 = game.players?.player2?.toString() === userId;

      if (!isPlayer1 && !isPlayer2) {
        res.status(403).json({
          success: false,
          message: 'You are not part of this game'
        });
        return;
      }
    }

    // Create and save the message to database
    const chatMessage = new ChatMessage({
      gameId: room.gameId || gameId,
      sender: userId,
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      isRead: false,
      roomId: roomId // Add room reference
    });

    await chatMessage.save();
    await chatMessage.populate('sender', 'username avatar level');

    // Prepare message data for Socket.io broadcast
    const messageData = {
      id: chatMessage._id,
      roomId,
      gameId: room.gameId,
      sender: {
        id: userId,
        username,
        avatar: req.user?.avatar || '/default-avatar.png'
      },
      message: message.trim(),
      messageType,
      timestamp: new Date(),
      isRead: false
    };

    // Emit real-time message via Socket.io
    let messageSent = false;
    try {
      const io = (global as any).socketIO;
      if (io) {
        // Send to specific room (only the 2 participants)
        io.to(roomId).emit('newMessage', messageData);
        
        // Send notification to offline users if any
        const offlineParticipants = room.participants.filter(p => !p.isOnline && p.userId !== userId);
        offlineParticipants.forEach(participant => {
          io.emit('messageNotification', {
            recipientId: participant.userId,
            roomId,
            roomName: room.name,
            senderUsername: username,
            messagePreview: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            timestamp: new Date()
          });
        });

        // If it's a game room, also emit to game channel
        if (room.gameId) {
          io.to(`game_${room.gameId}`).emit('gameMessage', {
            ...messageData,
            gameId: room.gameId
          });
        }

        messageSent = true;
        logInfo(`Real-time message sent to room ${roomId} by ${username}`);
      }
    } catch (socketError: any) {
      logWarn(`Socket.io message delivery failed: ${socketError.message}`);
    }

    // Update room activity
    if (room) {
      room.lastActivity = new Date();
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: chatMessage._id,
        roomId,
        timestamp: messageData.timestamp,
        realtimeDelivered: messageSent,
        participants: room.participants.length
      }
    });
  } catch (error: any) {
    logError(`Error sending real-time message: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
};

/**
 * Get chat messages for a room
 */
export const getRoomMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Verify user is in the room
    const room = socketChatRoomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
      return;
    }

    const isInRoom = room.participants.some(p => p.userId === userId);
    if (!isInRoom) {
      res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
      return;
    }

    // Get messages from database
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const messages = await ChatMessage.find({
      $or: [
        { roomId: roomId },
        { gameId: room.gameId }
      ]
    })
    .populate('sender', 'username avatar level')
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

    // Format messages
    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id,
      sender: {
        id: msg.sender._id,
        username: (msg.sender as any).username,
        avatar: (msg.sender as any).avatar || '/default-avatar.png'
      },
      message: msg.message,
      messageType: msg.messageType,
      timestamp: msg.timestamp,
      isRead: msg.isRead
    }));

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        $or: [
          { roomId: roomId },
          { gameId: room.gameId }
        ],
        sender: { $ne: userId },
        isRead: false
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: formattedMessages,
        roomId,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: formattedMessages.length,
          hasMore: formattedMessages.length === limitNum
        }
      }
    });
  } catch (error: any) {
    logError(`Error getting room messages: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
};

/**
 * Get game chat messages (for in-game chat)
 */
export const getGameMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { gameId } = req.params;
    const { limit = 50 } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Verify game exists and user is part of it
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

    // Get game messages
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

    const messages = await ChatMessage.find({ gameId })
      .populate('sender', 'username avatar level')
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .lean();

    const formattedMessages = messages.reverse().map(msg => ({
      id: msg._id,
      sender: {
        id: msg.sender._id,
        username: (msg.sender as any).username,
        avatar: (msg.sender as any).avatar || '/default-avatar.png'
      },
      message: msg.message,
      messageType: msg.messageType,
      timestamp: msg.timestamp,
      isRead: msg.isRead
    }));

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        gameId,
        sender: { $ne: userId },
        isRead: false
      },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: 'Game messages retrieved successfully',
      data: {
        messages: formattedMessages,
        gameId,
        total: formattedMessages.length
      }
    });
  } catch (error: any) {
    logError(`Error getting game messages: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get game messages',
      error: error.message
    });
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, gameId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    let query: any = {
      sender: { $ne: userId },
      isRead: false
    };

    if (roomId) {
      query.roomId = roomId;
    } else if (gameId) {
      query.gameId = gameId;
    } else {
      res.status(400).json({
        success: false,
        message: 'Either roomId or gameId is required'
      });
      return;
    }

    const result = await ChatMessage.updateMany(query, { isRead: true });

    // Emit read receipt via Socket.io
    try {
      const io = (global as any).socketIO;
      if (io && roomId) {
        io.to(roomId).emit('messagesRead', {
          roomId,
          readBy: userId,
          timestamp: new Date()
        });
      }
    } catch (socketError: any) {
      logWarn(`Socket.io read receipt failed: ${socketError.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: {
        messagesUpdated: result.modifiedCount
      }
    });
  } catch (error: any) {
    logError(`Error marking messages as read: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
};

/**
 * Send typing indicator
 */
export const sendTypingIndicator = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, isTyping } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username;

    if (!userId || !username) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Verify user is in the room
    const room = socketChatRoomManager.getRoom(roomId);
    if (!room) {
      res.status(404).json({
        success: false,
        message: 'Chat room not found'
      });
      return;
    }

    const isInRoom = room.participants.some(p => p.userId === userId);
    if (!isInRoom) {
      res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
      return;
    }

    // Emit typing indicator via Socket.io
    try {
      const io = (global as any).socketIO;
      if (io) {
        io.to(roomId).emit('userTyping', {
          roomId,
          userId,
          username,
          isTyping,
          timestamp: new Date()
        });
      }
    } catch (socketError: any) {
      logWarn(`Socket.io typing indicator failed: ${socketError.message}`);
    }

    res.status(200).json({
      success: true,
      message: 'Typing indicator sent'
    });
  } catch (error: any) {
    logError(`Error sending typing indicator: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send typing indicator',
      error: error.message
    });
  }
};

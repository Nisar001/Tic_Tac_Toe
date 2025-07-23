import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { Types } from 'mongoose';

/**
 * Create a new game room
 */
export const createGameRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { gameMode = 'classic', isPrivate = false, password } = req.body;
  const userId = req.user._id;

  // Validate user exists and can play
  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('User not found');
  }

  // Check if user has enough lives
  if (user.lives < 1) {
    throw createError.badRequest('Insufficient lives to start a game');
  }

  // Check if user is already in an active game
  const activeGame = await Game.findOne({
    $or: [
      { 'players.player1': userId },
      { 'players.player2': userId }
    ],
    status: { $in: ['waiting', 'active'] }
  });

  if (activeGame) {
    return res.status(200).json({
      success: true,
      message: 'You are already in an active game',
      data: {
        gameId: activeGame.gameId,
        roomId: activeGame.room,
        status: activeGame.status
      }
    });
  }

  // Generate room ID
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create new game
  const newGame = new Game({
    gameId: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    gameMode,
    isPrivate,
    password: isPrivate && password ? password : undefined,
    creatorId: userId,
    players: {
      player1: userId,
      player2: null
    },
    board: [
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ],
    currentPlayer: 'X',
    status: 'waiting',
    room: roomId,
    moves: [],
    startedAt: new Date(),
    xpAwarded: false
  });

  await newGame.save();

  res.status(201).json({
    success: true,
    message: 'Game room created successfully',
    data: {
      gameId: newGame.gameId,
      roomId: newGame.room,
      gameMode: newGame.gameMode,
      isPrivate: newGame.isPrivate,
      status: newGame.status,
      createdAt: newGame.createdAt,
      playerSymbol: 'X'
    }
  });
});

/**
 * Join an existing game room
 */
export const joinGameRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { roomId } = req.params;
  const { password } = req.body;
  const userId = req.user._id;

  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  // Find the game
  const game = await Game.findOne({ room: roomId });
  if (!game) {
    throw createError.notFound('Game room not found');
  }

  // Check if game is joinable
  if (game.status !== 'waiting') {
    throw createError.badRequest('Game is not available for joining');
  }

  // Check if user is already in the game
  if (game.players.player1?.toString() === userId.toString()) {
    return res.status(200).json({
      success: true,
      message: 'Already in this game as player 1',
      data: {
        gameId: game.gameId,
        roomId: game.room,
        playerSymbol: 'X',
        status: game.status
      }
    });
  }

  // Check if room is full
  if (game.players.player2) {
    throw createError.badRequest('Game room is full');
  }

  // Check password for private games
  if (game.isPrivate && game.password && game.password !== password) {
    throw createError.unauthorized('Invalid password for private game');
  }

  // Validate user can play
  const user = await User.findById(userId);
  if (!user) {
    throw createError.notFound('User not found');
  }

  if (user.lives < 1) {
    throw createError.badRequest('Insufficient lives to join game');
  }

  // Check if user is already in another active game
  const userActiveGame = await Game.findOne({
    $or: [
      { 'players.player1': userId },
      { 'players.player2': userId }
    ],
    status: { $in: ['waiting', 'active'] },
    _id: { $ne: game._id }
  });

  if (userActiveGame) {
    throw createError.badRequest('You are already in another active game');
  }

  // Join the game
  game.players.player2 = new Types.ObjectId(userId);
  game.status = 'active';
  await game.save();

  res.status(200).json({
    success: true,
    message: 'Successfully joined the game',
    data: {
      gameId: game.gameId,
      roomId: game.room,
      playerSymbol: 'O',
      status: game.status,
      opponent: {
        id: game.players.player1,
        symbol: 'X'
      }
    }
  });
});

/**
 * Get available game rooms
 */
export const getAvailableRooms = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { page = 1, limit = 10, gameMode } = req.query;
  
  const query: any = {
    status: 'waiting',
    isPrivate: false
  };
  
  if (gameMode) {
    query.gameMode = gameMode;
  }

  const options = {
    page: Number(page),
    limit: Number(limit),
    sort: { createdAt: -1 },
    populate: [
      {
        path: 'players.player1',
        select: 'username level avatar'
      },
      {
        path: 'creatorId',
        select: 'username level avatar'
      }
    ]
  };

  const games = await Game.aggregate([
    { $match: query },
    {
      $lookup: {
        from: 'users',
        localField: 'players.player1',
        foreignField: '_id',
        as: 'creator'
      }
    },
    {
      $project: {
        gameId: 1,
        room: 1,
        gameMode: 1,
        createdAt: 1,
        creator: { $arrayElemAt: ['$creator', 0] },
        creatorInfo: {
          username: { $arrayElemAt: ['$creator.username', 0] },
          level: { $arrayElemAt: ['$creator.level', 0] },
          avatar: { $arrayElemAt: ['$creator.avatar', 0] }
        }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (Number(page) - 1) * Number(limit) },
    { $limit: Number(limit) }
  ]);

  const total = await Game.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      rooms: games.map(game => ({
        gameId: game.gameId,
        roomId: game.room,
        gameMode: game.gameMode,
        creator: game.creatorInfo,
        createdAt: game.createdAt
      })),
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    }
  });
});

/**
 * Get game room details
 */
export const getGameRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  const game = await Game.findOne({ room: roomId })
    .populate('players.player1', 'username level avatar')
    .populate('players.player2', 'username level avatar')
    .populate('winner', 'username')
    .select('-password');

  if (!game) {
    throw createError.notFound('Game room not found');
  }

  res.status(200).json({
    success: true,
    data: {
      gameId: game.gameId,
      roomId: game.room,
      gameMode: game.gameMode,
      status: game.status,
      board: game.board,
      currentPlayer: game.currentPlayer,
      players: {
        player1: game.players.player1,
        player2: game.players.player2
      },
      winner: game.winner,
      result: game.result,
      moves: game.moves,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      isPrivate: game.isPrivate
    }
  });
});

/**
 * Leave game room
 */
export const leaveGameRoom = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { roomId } = req.params;
  const userId = req.user._id;

  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  const game = await Game.findOne({ room: roomId });
  if (!game) {
    throw createError.notFound('Game room not found');
  }

  // Check if user is in the game
  const isPlayer1 = game.players.player1?.toString() === userId.toString();
  const isPlayer2 = game.players.player2?.toString() === userId.toString();

  if (!isPlayer1 && !isPlayer2) {
    throw createError.badRequest('You are not in this game');
  }

  // Handle leaving based on game status
  if (game.status === 'waiting') {
    // If it's waiting and user is the only player, delete the game
    if (isPlayer1 && !game.players.player2) {
      await Game.findByIdAndDelete(game._id);
      return res.status(200).json({
        success: true,
        message: 'Game room deleted successfully'
      });
    }
    
    // If it's waiting and there are two players, remove the leaving player
    if (isPlayer1) {
      game.players.player1 = game.players.player2;
      game.players.player2 = null as any;
    } else {
      game.players.player2 = null as any;
    }
    
    await game.save();
    
    return res.status(200).json({
      success: true,
      message: 'Left game room successfully'
    });
  }

  if (game.status === 'active') {
    // Mark as abandoned and declare other player winner
    game.status = 'completed';
    game.result = 'abandoned';
    game.endedAt = new Date();
    
    if (isPlayer1) {
      game.winner = game.players.player2;
    } else {
      game.winner = game.players.player1;
    }
    
    await game.save();
    
    // Update stats for both players (handled in socket layer)
    
    return res.status(200).json({
      success: true,
      message: 'Game forfeited. Opponent wins by forfeit.'
    });
  }

  // Game is already completed
  res.status(200).json({
    success: true,
    message: 'Left completed game'
  });
});

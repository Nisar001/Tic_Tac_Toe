import { Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import Game from '../../../models/game.model';

/**
 * Get current game state
 */
export const getGameState = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { gameId } = req.params;
  const userId = req.user._id;

  if (!gameId) {
    throw createError.badRequest('Game ID is required');
  }

  // Find the game
  const game = await Game.findById(gameId)
    .populate('players.player1', 'username avatar level')
    .populate('players.player2', 'username avatar level');

  if (!game) {
    throw createError.notFound('Game not found');
  }

  // Check if user is part of this game
  const isPlayer1 = game.players?.player1?._id.toString() === userId.toString();
  const isPlayer2 = game.players?.player2?._id.toString() === userId.toString();

  if (!isPlayer1 && !isPlayer2) {
    throw createError.forbidden('You are not part of this game');
  }

  // Determine current player symbol
  const userSymbol = isPlayer1 ? 'X' : 'O';
  const opponentSymbol = isPlayer1 ? 'O' : 'X';

  // Calculate game duration
  let gameDuration = 0;
  if (game.startedAt) {
    const endTime = game.endedAt || new Date();
    gameDuration = Math.floor((endTime.getTime() - game.startedAt.getTime()) / 1000);
  }

  // Prepare response
  const gameState = {
    id: game._id,
    room: game.room,
    status: game.status,
    result: game.result,
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    players: {
      player1: game.players?.player1 ? {
        id: game.players.player1._id,
        username: (game.players.player1 as any).username,
        avatar: (game.players.player1 as any).avatar,
        level: (game.players.player1 as any).level,
        symbol: 'X'
      } : null,
      player2: game.players?.player2 ? {
        id: game.players.player2._id,
        username: (game.players.player2 as any).username,
        avatar: (game.players.player2 as any).avatar,
        level: (game.players.player2 as any).level,
        symbol: 'O'
      } : null
    },
    moves: game.moves || [],
    userInfo: {
      symbol: userSymbol,
      isCurrentPlayer: game.currentPlayer === userSymbol,
      canMove: game.status === 'active' && game.currentPlayer === userSymbol
    },
    gameInfo: {
      duration: gameDuration,
      moveCount: Array.isArray(game.moves) ? game.moves.length : 0,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      endedAt: game.endedAt
    }
  };

  res.json({
    success: true,
    message: 'Game state retrieved successfully',
    data: gameState
  });
});

/**
 * Get multiple games state for user
 */
export const getUserActiveGames = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const userId = req.user._id;

  // Find all active games for user
  const activeGames = await Game.find({
    $or: [
      { 'players.player1': userId },
      { 'players.player2': userId }
    ],
    status: { $in: ['waiting', 'active'] }
  })
  .populate('players.player1', 'username avatar level')
  .populate('players.player2', 'username avatar level')
  .sort({ lastMoveAt: -1, createdAt: -1 });

  const gamesData = activeGames.map(game => {
    const isPlayer1 = game.players?.player1?._id.toString() === userId.toString();
    const userSymbol = isPlayer1 ? 'X' : 'O';

    return {
      id: game._id,
      room: game.room,
      status: game.status,
      currentPlayer: game.currentPlayer,
      userSymbol,
      isUserTurn: game.currentPlayer === userSymbol,
      opponent: isPlayer1 ? 
        (game.players?.player2 ? {
          id: game.players.player2._id,
          username: (game.players.player2 as any).username,
          avatar: (game.players.player2 as any).avatar,
          level: (game.players.player2 as any).level
        } : null) :
        (game.players?.player1 ? {
          id: game.players.player1._id,
          username: (game.players.player1 as any).username,
          avatar: (game.players.player1 as any).avatar,
          level: (game.players.player1 as any).level
        } : null),
      createdAt: game.createdAt
    };
  });

  res.json({
    success: true,
    message: 'Active games retrieved successfully',
    data: {
      games: gamesData,
      totalActive: gamesData.length
    }
  });
});

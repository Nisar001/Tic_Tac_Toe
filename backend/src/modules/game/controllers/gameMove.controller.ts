import { Request, Response } from 'express';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';
import Game from '../../../models/game.model';
import User from '../../../models/user.model';
import { Types } from 'mongoose';

/**
 * Make a move in the game
 */
export const makeGameMove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { roomId } = req.params;
  const { row, col } = req.body;
  const userId = req.user._id;

  // Validate input
  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  if (typeof row !== 'number' || typeof col !== 'number') {
    throw createError.badRequest('Row and column must be numbers');
  }

  if (row < 0 || row > 2 || col < 0 || col > 2) {
    throw createError.badRequest('Row and column must be between 0 and 2');
  }

  // Find the game with version for optimistic locking
  const game = await Game.findOne({ room: roomId });
  if (!game) {
    throw createError.notFound('Game not found');
  }

  // Store original version for race condition check
  const originalVersion = game.__v;

  // Check if game is active
  if (game.status !== 'active') {
    throw createError.badRequest('Game is not active');
  }

  // Check if user is a player in this game
  const isPlayer1 = game.players.player1?.toString() === userId.toString();
  const isPlayer2 = game.players.player2?.toString() === userId.toString();

  if (!isPlayer1 && !isPlayer2) {
    throw createError.forbidden('You are not a player in this game');
  }

  // Determine player symbol
  const playerSymbol = isPlayer1 ? 'X' : 'O';

  // Check if it's the player's turn
  if (game.currentPlayer !== playerSymbol) {
    throw createError.badRequest('It is not your turn');
  }

  // Check if the position is empty
  if (game.board[row][col] !== null) {
    throw createError.badRequest('Position is already occupied');
  }

  // Make the move
  game.board[row][col] = playerSymbol;
  game.moves.push({
    player: new Types.ObjectId(userId),
    position: { row, col },
    symbol: playerSymbol,
    timestamp: new Date()
  });

  // Check for winner
  const winner = checkWinner(game.board);
  let gameResult = null;
  let isGameFinished = false;

  if (winner) {
    game.status = 'completed';
    game.result = 'win';
    game.winner = isPlayer1 ? game.players.player1 : game.players.player2;
    game.endedAt = new Date();
    isGameFinished = true;
    gameResult = 'win';
  } else if (isBoardFull(game.board)) {
    game.status = 'completed';
    game.result = 'draw';
    game.endedAt = new Date();
    isGameFinished = true;
    gameResult = 'draw';
  } else {
    // Switch turn
    game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';
  }

  await game.save();

  // Update user stats if game is finished
  if (isGameFinished) {
    await updatePlayerStats(game);
  }

  res.status(200).json({
    success: true,
    message: isGameFinished ? 'Game completed' : 'Move made successfully',
    data: {
      gameId: game.gameId,
      roomId: game.room,
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
      result: gameResult,
      winner: game.winner,
      moves: game.moves,
      isGameFinished,
      lastMove: {
        player: userId,
        symbol: playerSymbol,
        position: { row, col }
      }
    }
  });
});

/**
 * Forfeit the game
 */
export const forfeitGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    throw createError.notFound('Game not found');
  }

  if (game.status !== 'active') {
    throw createError.badRequest('Cannot forfeit a non-active game');
  }

  // Check if user is a player
  const isPlayer1 = game.players.player1?.toString() === userId.toString();
  const isPlayer2 = game.players.player2?.toString() === userId.toString();

  if (!isPlayer1 && !isPlayer2) {
    throw createError.forbidden('You are not a player in this game');
  }

  // Set winner as the other player
  game.status = 'completed';
  game.result = 'abandoned';
  game.winner = isPlayer1 ? game.players.player2 : game.players.player1;
  game.endedAt = new Date();

  await game.save();

  // Update player stats
  await updatePlayerStats(game);

  res.status(200).json({
    success: true,
    message: 'Game forfeited successfully',
    data: {
      gameId: game.gameId,
      roomId: game.room,
      status: game.status,
      result: game.result,
      winner: game.winner
    }
  });
});

/**
 * Get current game state
 */
export const getGameState = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  const game = await Game.findOne({ room: roomId })
    .populate('players.player1', 'username level avatar')
    .populate('players.player2', 'username level avatar')
    .populate('winner', 'username');

  if (!game) {
    throw createError.notFound('Game not found');
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
        X: game.players.player1,
        O: game.players.player2
      },
      winner: game.winner,
      result: game.result,
      moves: game.moves,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      moveCount: game.moves.length
    }
  });
});

// Helper function to check for winner
function checkWinner(board: (string | null)[][]): string | null {
  // Check rows
  for (let i = 0; i < 3; i++) {
    if (board[i][0] && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
      return board[i][0];
    }
  }

  // Check columns
  for (let j = 0; j < 3; j++) {
    if (board[0][j] && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
      return board[0][j];
    }
  }

  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }

  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }

  return null;
}

// Helper function to check if board is full
function isBoardFull(board: (string | null)[][]): boolean {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === null) {
        return false;
      }
    }
  }
  return true;
}

// Helper function to update player stats
async function updatePlayerStats(game: any) {
  try {
    const player1 = await User.findById(game.players.player1);
    const player2 = await User.findById(game.players.player2);

    if (!player1 || !player2) return;

    // Initialize stats if they don't exist
    if (!player1.stats) {
      player1.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 };
    }
    if (!player2.stats) {
      player2.stats = { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 };
    }

    // Update games played
    player1.stats.gamesPlayed++;
    player2.stats.gamesPlayed++;

    // Update win/loss/draw counts
    if (game.result === 'draw') {
      player1.stats.draws++;
      player2.stats.draws++;
    } else if (game.result === 'win' || game.result === 'abandoned') {
      const winnerId = game.winner?.toString();
      if (winnerId === player1._id.toString()) {
        player1.stats.wins++;
        player2.stats.losses++;
      } else {
        player2.stats.wins++;
        player1.stats.losses++;
      }
    }

    // Calculate win rates
    player1.stats.winRate = player1.stats.gamesPlayed > 0 
      ? Math.round((player1.stats.wins / player1.stats.gamesPlayed) * 100) 
      : 0;
    player2.stats.winRate = player2.stats.gamesPlayed > 0 
      ? Math.round((player2.stats.wins / player2.stats.gamesPlayed) * 100) 
      : 0;

    // Award XP and level up logic
    if (game.result === 'draw') {
      // Both players get small XP for draw
      player1.xp += 5;
      player2.xp += 5;
    } else if (game.result === 'win') {
      const winnerId = game.winner?.toString();
      if (winnerId === player1._id.toString()) {
        player1.xp += 15; // Winner gets more XP
        player2.xp += 3;  // Loser gets small XP
      } else {
        player2.xp += 15;
        player1.xp += 3;
      }
    } else if (game.result === 'abandoned') {
      // Only winner gets XP in case of forfeit
      const winnerId = game.winner?.toString();
      if (winnerId === player1._id.toString()) {
        player1.xp += 10;
      } else {
        player2.xp += 10;
      }
    }

    // Level up logic (100 XP per level)
    const newLevel1 = Math.floor(player1.xp / 100) + 1;
    const newLevel2 = Math.floor(player2.xp / 100) + 1;

    if (newLevel1 > player1.level) {
      player1.level = newLevel1;
    }
    if (newLevel2 > player2.level) {
      player2.level = newLevel2;
    }

    // Consume lives (1 life per game)
    if (player1.lives > 0) player1.lives--;
    if (player2.lives > 0) player2.lives--;

    // Update last activity
    player1.lastSeen = new Date();
    player2.lastSeen = new Date();

    await player1.save();
    await player2.save();

    // Mark XP as awarded in game
    game.xpAwarded = true;
    await game.save();

  } catch (error) {
    // Log error but don't throw - stats update shouldn't fail the game
  }
}

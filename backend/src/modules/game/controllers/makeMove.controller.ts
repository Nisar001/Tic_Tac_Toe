import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Game from '../../../models/game.model';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const makeMove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw createError.unauthorized('Authentication required');
  }

  const { roomId } = req.params;
  const { position, player, row: inputRow, col: inputCol } = req.body;
  const userId = (req.user as { _id: { toString: () => string } })._id.toString();

  if (!roomId || typeof roomId !== 'string') {
    throw createError.badRequest('Room ID is required and must be a string');
  }

  // Support both position (0-8) and row/col format
  let movePosition: number;
  if (position !== undefined) {
    if (typeof position !== 'number' || position < 0 || position > 8) {
      throw createError.badRequest('Position must be a number between 0 and 8');
    }
    movePosition = position;
  } else if (inputRow !== undefined && inputCol !== undefined) {
    if (typeof inputRow !== 'number' || typeof inputCol !== 'number') {
      throw createError.badRequest('Row and column must be numbers');
    }
    if (inputRow < 0 || inputRow > 2 || inputCol < 0 || inputCol > 2) {
      throw createError.badRequest('Row and column must be between 0 and 2');
    }
    movePosition = inputRow * 3 + inputCol;
  } else {
    throw createError.badRequest('Either position or row/col must be provided');
  }

  // Load game
  const game = await Game.findOne({ room: roomId });
  if (!game) {
    throw createError.notFound('Game not found');
  }

  // Check if user is a valid player
  const player1Id = game.players?.player1?.toString();
  const player2Id = game.players?.player2?.toString();
  const isPlayer = [player1Id, player2Id].includes(userId);

  if (!isPlayer) {
    throw createError.forbidden('You are not a player in this game');
  }

  // Validate game state
  if (game.status !== 'active') {
    throw createError.badRequest('Game is not active');
  }

  // Check if it's the player's turn
  const currentPlayerId = game.currentPlayer?.toString();
  if (currentPlayerId !== userId) {
    throw createError.badRequest('It is not your turn');
  }

  // Convert position to row/col for 2D board
  const row = Math.floor(movePosition / 3);
  const col = movePosition % 3;

  // Check if position is valid and empty
  if (!game.board || !Array.isArray(game.board) || row < 0 || row > 2 || col < 0 || col > 2) {
    throw createError.badRequest('Invalid move: position out of bounds');
  }
  
  if (game.board[row][col] !== null) {
    throw createError.badRequest('Invalid move: position already occupied');
  }

  // Make the move
  const playerSymbol: 'X' | 'O' = player1Id === userId ? 'X' : 'O';
  game.board[row][col] = playerSymbol;

  // Add move to moves array
  game.moves.push({
    player: new mongoose.Types.ObjectId(userId),
    position: { row, col },
    symbol: playerSymbol,
    timestamp: new Date()
  });

  // Check for win condition using 2D board
  const winPatterns = [
    // rows
    [[0, 0], [0, 1], [0, 2]],
    [[1, 0], [1, 1], [1, 2]],
    [[2, 0], [2, 1], [2, 2]],
    // columns
    [[0, 0], [1, 0], [2, 0]],
    [[0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 2], [2, 2]],
    // diagonals
    [[0, 0], [1, 1], [2, 2]],
    [[0, 2], [1, 1], [2, 0]]
  ];

  let gameWon = false;
  for (const pattern of winPatterns) {
    if (pattern.every(([r, c]) => game.board[r][c] === playerSymbol)) {
      game.status = 'completed';
      game.winner = new mongoose.Types.ObjectId(userId);
      game.result = 'win';
      gameWon = true;
      break;
    }
  }

  // Check for draw - all cells filled
  if (!gameWon && game.board.every(row => row.every(cell => cell !== null))) {
    game.status = 'completed';
    game.result = 'draw';
  }

  // Switch turns if game is still active
  if (game.status === 'active') {
    game.currentPlayer = player1Id === userId ? 'O' : 'X';
  }
  await game.save();

  res.status(200).json({
    success: true,
    message: 'Move successful',
    game: {
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
      winner: game.winner,
      result: game.result,
      moves: game.moves
    }
  });
});

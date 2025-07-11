import { Request, Response } from 'express';
import Game from '../../../models/game.model';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';
import { AuthenticatedRequest } from '../../../middlewares/auth.middleware';

export const makeMove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      throw createError.unauthorized('Authentication required');
    }

    const { roomId } = req.params;
    const { row, col } = req.body;
    const userId = (req.user as { _id: { toString: () => string } })._id.toString();

    if (!roomId || typeof roomId !== 'string') {
      throw createError.badRequest('Room ID is required and must be a string');
    }

    if (typeof row !== 'number' || typeof col !== 'number') {
      throw createError.badRequest('Row and column must be numbers');
    }

    // Load game
    const game = await Game.findOne({ room: roomId });
    if (!game) {
      throw createError.notFound('Game not found');
    }

    // Check if game has method for making moves
    if (typeof game.makeMove !== 'function') {
      throw createError.internal('Game logic not implemented for move handling');
    }

    // Check if user is a valid player
    const player1Id = game.players?.player1?.toString();
    const player2Id = game.players?.player2?.toString();
    const isPlayer = [player1Id, player2Id].includes(userId);

    if (!isPlayer) {
      throw createError.forbidden('You are not a player in this game');
    }

    // Attempt to make the move
    const moveSuccess = game.makeMove(userId, row, col);
    if (!moveSuccess) {
      throw createError.badRequest('Invalid move');
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
  } catch (error) {
    console.error('Error in makeMove:', error);
    throw createError.internal('Failed to process move');
  }
});

import { Request, Response } from 'express';
import { socketManager } from '../../../server';
import { asyncHandler, createError } from '../../../middlewares/error.middleware';

export const getGameState = asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  if (!roomId) {
    throw createError.badRequest('Room ID is required');
  }

  if (typeof roomId !== 'string' || roomId.length < 10) {
    throw createError.badRequest('Invalid room ID format');
  }

  if (!socketManager) {
    throw createError.serviceUnavailable('Socket manager not initialized');
  }

  const gameSocket = socketManager.getGameSocket();
  const activeGames = gameSocket.getActiveGames();
  const game = activeGames.find(g => g.id === roomId);

  if (!game) {
    throw createError.notFound('Game not found');
  }

  res.json({
    success: true,
    data: {
      roomId: game.id,
      board: game.board,
      currentPlayer: game.currentPlayer,
      status: game.status,
      winner: game.winner,
      winningLine: game.winningLine,
      players: game.players,
      moveCount: game.moveCount,
      spectatorCount: game.spectators.length,
      createdAt: game.createdAt,
      lastMoveAt: game.lastMoveAt
    }
  });
});

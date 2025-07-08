import { Request, Response } from 'express';
import { socketManager } from '../../../server';

export const getActiveGames = async (req: Request, res: Response) => {
  try {
    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized'
      });
    }

    const gameSocket = socketManager.getGameSocket();
    const activeGames = gameSocket.getActiveGames();

    const gamesData = activeGames.map(game => ({
      roomId: game.id,
      status: game.status,
      players: {
        X: {
          username: game.players.X.username
        },
        O: {
          username: game.players.O.username
        }
      },
      moveCount: game.moveCount,
      spectatorCount: game.spectators.length,
      createdAt: game.createdAt,
      canSpectate: game.status === 'active'
    }));

    res.json({
      success: true,
      data: {
        games: gamesData,
        totalActiveGames: activeGames.length
      }
    });

  } catch (error) {
    console.error('Get active games error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active games'
    });
  }
};

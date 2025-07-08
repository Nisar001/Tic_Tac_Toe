import { Request, Response } from 'express';
import { socketManager } from '../../../server';

/**
 * Create a custom game
 */
export const createCustomGame = async (req: Request, res: Response) => {
  try {
    const { gameConfig } = req.body;

    if (!gameConfig) {
      return res.status(400).json({
        success: false,
        message: 'Game configuration is required',
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized',
      });
    }

    const gameSocket = socketManager.getGameSocket();

    if (!gameSocket.createCustomGame) {
      return res.status(500).json({
        success: false,
        message: 'createCustomGame method not implemented',
      });
    }

    const newGame = gameSocket.createCustomGame(gameConfig);

    res.status(201).json({
      success: true,
      data: newGame,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

import { Request, Response } from 'express';
import { socketManager } from '../../../server';

/**
 * Get user game stats
 */
export const getUserGameStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (!socketManager) {
      return res.status(500).json({
        success: false,
        message: 'Socket manager not initialized',
      });
    }

    const gameSocket = socketManager.getGameSocket();

    if (!gameSocket.getUserGameStats) {
      return res.status(500).json({
        success: false,
        message: 'getUserGameStats method not implemented',
      });
    }

    const userStats = gameSocket.getUserGameStats(userId);

    res.status(200).json({
      success: true,
      data: userStats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

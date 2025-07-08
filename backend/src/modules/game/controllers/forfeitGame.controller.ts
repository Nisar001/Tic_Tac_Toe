import { Request, Response } from 'express';

/**
 * Forfeit a game
 */
export const forfeitGame = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }

    // Mock forfeit logic
    res.status(200).json({
      success: true,
      message: `Game with room ID ${roomId} forfeited.`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

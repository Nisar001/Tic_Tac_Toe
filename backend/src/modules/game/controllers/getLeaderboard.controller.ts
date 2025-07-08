import { Request, Response } from 'express';

/**
 * Get leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    // Mock leaderboard data
    const leaderboard = [
      { rank: 1, username: 'Player1', score: 100 },
      { rank: 2, username: 'Player2', score: 90 },
      { rank: 3, username: 'Player3', score: 80 }
    ];

    res.status(200).json({
      success: true,
      data: leaderboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

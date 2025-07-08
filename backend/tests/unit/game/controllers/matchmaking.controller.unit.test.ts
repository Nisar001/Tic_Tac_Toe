import { joinQueue, leaveQueue } from '../../../../src/modules/game/controllers/matchmaking.controller';
import { Request, Response } from 'express';
import { IUser } from '../../../../src/types';

const mockSocketManager = {
  getAuthManager: jest.fn(() => ({
    getSocketByUserId: jest.fn((userId: string) => ({ id: userId })),
  })),
  getMatchmakingSocket: jest.fn(() => ({
    handleFindMatch: jest.fn(),
    handleCancelMatchmaking: jest.fn(),
  })),
};

jest.mock('../../../../src/server', () => ({
  socketManager: mockSocketManager,
}));

const mockMatchmakingManager = {
  isPlayerInQueue: jest.fn(() => false),
  removeFromQueue: jest.fn(() => true),
};

jest.mock('../../../../src/utils/matchmaking.utils', () => ({
  MatchmakingManager: mockMatchmakingManager,
}));

describe('Matchmaking Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = {
      user: {
        id: '123',
        email: 'test@example.com' as string,
        username: 'testuser',
        provider: 'manual',
        level: 1,
        energy: 100,
        xp: 0,
        maxEnergy: 100,
        energyUpdatedAt: new Date(),
        isOnline: true,
        lastSeen: new Date(),
        friends: [],
        friendRequests: { sent: [], received: [] },
        stats: { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, winRate: 0 },
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _id: 'mockObjectId',
      } as Partial<IUser>,
      body: { gameMode: 'classic' },
    };
    statusMock = jest.fn(() => res);
    jsonMock = jest.fn();
    res = { status: statusMock, json: jsonMock };
  });

  describe('joinQueue', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await joinQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });

    it('should return 400 for invalid game mode', async () => {
      req.body.gameMode = 'invalid';

      await joinQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid game mode',
      });
    });

    it('should return 400 if user has insufficient energy', async () => {
      jest.spyOn(mockMatchmakingManager, 'isPlayerInQueue').mockReturnValueOnce(false);

      await joinQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient energy to join queue',
      });
    });

    it('should return 200 if user joins queue successfully', async () => {
      await joinQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Joined matchmaking queue successfully',
      });
    });
  });

  describe('leaveQueue', () => {
    it('should return 401 if user is not authenticated', async () => {
      req.user = undefined;

      await leaveQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
      });
    });

    it('should return 200 if user leaves queue successfully', async () => {
      await leaveQueue(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Left matchmaking queue successfully',
      });
    });
  });
});

import { getUserGameStats } from '../../../../src/modules/game/controllers/getUserGameStats.controller';
import { Request, Response } from 'express';

const mockSocketManager = {
  getGameSocket: jest.fn(() => ({
    getUserGameStats: jest.fn((userId: string) => ({
      gamesPlayed: 10,
      wins: 5,
      losses: 5,
    })),
  })),
};

jest.mock('../../../../src/server', () => ({
  socketManager: mockSocketManager,
}));

describe('getUserGameStats Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = { params: { userId: '123' } };
    statusMock = jest.fn(() => res);
    jsonMock = jest.fn();
    res = { status: statusMock, json: jsonMock };
  });

  it('should return 400 if userId is not provided', async () => {
    req.params = {};

    await getUserGameStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'User ID is required',
    });
  });

  it('should return 500 if socketManager is not initialized', async () => {
    jest.spyOn(mockSocketManager, 'getGameSocket').mockReturnValueOnce({
      getUserGameStats: jest.fn((userId: string) => ({ gamesPlayed: 0, wins: 0, losses: 0 })),
    });

    await getUserGameStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'Socket manager not initialized',
    });
  });

  it('should return 500 if getUserGameStats method is not implemented', async () => {
    jest.spyOn(mockSocketManager.getGameSocket(), 'getUserGameStats').mockImplementationOnce(() => {
      throw new Error('getUserGameStats method not implemented');
    });

    await getUserGameStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'getUserGameStats method not implemented',
    });
  });

  it('should return 200 with user stats if everything is valid', async () => {
    await getUserGameStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: {
        gamesPlayed: 10,
        wins: 5,
        losses: 5,
      },
    });
  });

  it('should return 500 if an error occurs', async () => {
    jest.spyOn(mockSocketManager.getGameSocket(), 'getUserGameStats').mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    await getUserGameStats(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: 'Unexpected error',
    });
  });
});

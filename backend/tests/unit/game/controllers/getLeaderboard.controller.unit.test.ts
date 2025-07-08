// Unit tests for getLeaderboard.controller.ts
import { getLeaderboard } from '../../../../src/modules/game/controllers/getLeaderboard.controller';
import { Request, Response } from 'express';

describe('Get Leaderboard Controller', () => {
  it('should retrieve leaderboard successfully', async () => {
    const req = {
      query: { limit: '10' },
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      sendStatus: jest.fn(),
      links: jest.fn(),
      send: jest.fn(),
      jsonp: jest.fn(),
    } as unknown as Response;
    const next = jest.fn();

    await getLeaderboard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ leaderboard: [] });
  });
});
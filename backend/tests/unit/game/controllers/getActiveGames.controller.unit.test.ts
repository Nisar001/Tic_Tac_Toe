// Unit tests for getActiveGames.controller.ts
import { getActiveGames } from '../../../../src/modules/game/controllers/getActiveGames.controller';
import { Request, Response } from 'express';

describe('Get Active Games Controller', () => {
  it('should retrieve active games successfully', async () => {
    const req = {
      user: { id: 'userId' },
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

    await getActiveGames(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ games: [] });
  });
});
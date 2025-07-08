// Unit tests for getGameState.controller.ts
import { getGameState } from '../../../../src/modules/game/controllers/getGameState.controller';
import { Request, Response } from 'express';

describe('Get Game State Controller', () => {
  it('should retrieve game state successfully', async () => {
    const req = {
      params: { gameId: 'gameId' },
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

    await getGameState(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ state: {} });
  });
});
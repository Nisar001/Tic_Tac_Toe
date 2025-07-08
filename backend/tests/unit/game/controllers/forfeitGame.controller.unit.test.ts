// Unit tests for forfeitGame.controller.ts
import { forfeitGame } from '../../../../src/modules/game/controllers/forfeitGame.controller';
import { Request, Response } from 'express';

describe('Forfeit Game Controller', () => {
  it('should forfeit a game successfully', async () => {
    const req = {
      params: { gameId: 'gameId' },
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

    await forfeitGame(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Game forfeited successfully' });
  });
});
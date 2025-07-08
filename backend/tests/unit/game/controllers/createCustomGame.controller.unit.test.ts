// Unit tests for createCustomGame.controller.ts
import { createCustomGame } from '../../../../src/modules/game/controllers/createCustomGame.controller';
import { Request, Response } from 'express';

describe('Create Custom Game Controller', () => {
  it('should create a custom game successfully', async () => {
    const req = {
      body: { gameName: 'Custom Game', settings: {} },
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

    await createCustomGame(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Custom game created successfully' });
  });
});
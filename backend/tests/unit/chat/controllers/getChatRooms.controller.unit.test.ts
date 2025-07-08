// Unit tests for getChatRooms.controller.ts
import { getChatRooms } from '../../../../src/modules/chat/controllers/getChatRooms.controller';
import { Request, Response } from 'express';

describe('Get Chat Rooms Controller', () => {
  it('should retrieve chat rooms successfully', async () => {
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

    await getChatRooms(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ rooms: [] });
  });
});
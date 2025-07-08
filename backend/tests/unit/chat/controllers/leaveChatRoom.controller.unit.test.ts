// Unit tests for leaveChatRoom.controller.ts
import { leaveChatRoom } from '../../../../src/modules/chat/controllers/leaveChatRoom.controller';
import { Request, Response } from 'express';

describe('Leave Chat Room Controller', () => {
  it('should leave a chat room successfully', async () => {
    const req = {
      params: { roomId: 'roomId' },
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

    await leaveChatRoom(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Left chat room successfully' });
  });
});
// Unit tests for joinChatRoom.controller.ts
import { joinChatRoom } from '../../../../src/modules/chat/controllers/joinChatRoom.controller';
import { Request, Response } from 'express';

describe('Join Chat Room Controller', () => {
  it('should join a chat room successfully', async () => {
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

    await joinChatRoom(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Joined chat room successfully' });
  });
});
// Unit tests for getChatRoomUsers.controller.ts
import { getChatRoomUsers } from '../../../../src/modules/chat/controllers/getChatRoomUsers.controller';
import { Request, Response } from 'express';

describe('Get Chat Room Users Controller', () => {
  it('should retrieve chat room users successfully', async () => {
    const req = {
      params: { roomId: 'roomId' },
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

    await getChatRoomUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ users: [] });
  });
});
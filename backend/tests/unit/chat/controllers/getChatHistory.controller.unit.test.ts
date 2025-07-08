// Unit tests for getChatHistory.controller.ts
import { getChatHistory } from '../../../../src/modules/chat/controllers/getChatHistory.controller';
import { Request, Response } from 'express';

describe('Get Chat History Controller', () => {
  it('should retrieve chat history successfully', async () => {
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

    await getChatHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ history: [] });
  });
});
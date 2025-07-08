import { sendMessage } from '../../../src/modules/chat/controllers/sendMessage.controller';
import { Request, Response } from 'express';

describe('sendMessage Controller', () => {
  it('should send a message successfully', async () => {
    const req = {
      body: { roomId: 'roomId', message: 'Hello World!' },
      get: jest.fn(),
      header: jest.fn(),
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await sendMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hello World!' }));
  });
});

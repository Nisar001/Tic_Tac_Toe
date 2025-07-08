// Unit tests for getProfile.controller.ts
import { getProfile } from '../../../../src/modules/auth/controllers/getProfile.controller';
import { Request, Response } from 'express';

describe('Get Profile Controller', () => {
  it('should retrieve the user profile successfully', async () => {
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

    await getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: 'userId', name: 'John Doe' });
  });
});

// Unit tests for logout.controller.ts
import { logout } from '../../../../src/modules/auth/controllers/logout.controller';
import { Request, Response } from 'express';

describe('Logout Controller', () => {
  it('should log out the user successfully', async () => {
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

    await logout(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});

// Unit tests for login.controller.ts
import { login } from '../../../../src/modules/auth/controllers/login.controller';
import { Request } from 'express';

describe('Login Controller', () => {
  it('should log in the user successfully', async () => {
    const req = {
      body: { email: 'test@example.com', password: 'password123' },
      get: jest.fn(),
      header: jest.fn(),
      accepts: jest.fn(),
      acceptsCharsets: jest.fn(),
    } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: 'jwtToken' });
  });
});

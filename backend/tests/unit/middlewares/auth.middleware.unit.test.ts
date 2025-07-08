// Unit tests for auth.middleware.ts
import { authenticate } from '../../../src/middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../../../src/utils/auth.utils';
import User from '../../../src/models/user.model';

jest.mock('../../../src/utils/auth.utils');
jest.mock('../../../src/models/user.model');

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn(() => res), json: jest.fn() };
    next = jest.fn();
  });

  it('should return 401 if no token is provided', async () => {
    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access token required',
    });
  });

  it('should return 401 if token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid_token';
    (AuthUtils.verifyAccessToken as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token',
    });
  });

  it('should return 401 if user is not found', async () => {
    req.headers.authorization = 'Bearer valid_token';
    (AuthUtils.verifyAccessToken as jest.Mock).mockReturnValue({ userId: '123' });
    (User.findById as jest.Mock).mockResolvedValue(null);

    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User not found',
    });
  });

  it('should return 401 if email is not verified', async () => {
    req.headers.authorization = 'Bearer valid_token';
    (AuthUtils.verifyAccessToken as jest.Mock).mockReturnValue({ userId: '123' });
    (User.findById as jest.Mock).mockResolvedValue({ isEmailVerified: false });

    await authenticate(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email not verified',
    });
  });

  it('should call next if authentication is successful', async () => {
    req.headers.authorization = 'Bearer valid_token';
    (AuthUtils.verifyAccessToken as jest.Mock).mockReturnValue({ userId: '123' });
    (User.findById as jest.Mock).mockResolvedValue({
      isEmailVerified: true,
      id: '123',
      email: 'test@example.com',
    });

    await authenticate(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});

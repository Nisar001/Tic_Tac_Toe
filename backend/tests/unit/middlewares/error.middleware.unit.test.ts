// Unit tests for error.middleware.ts
import { errorHandler } from '../../../src/middlewares/error.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Error Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockImplementation(() => res as Response),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('should handle validation errors', () => {
    const error = { name: 'ValidationError', errors: { field: { message: 'Invalid field' } } };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation Error',
      details: { errors: { field: 'Invalid field' } },
    });
  });

  it('should handle duplicate key errors', () => {
    const error = { code: 11000, keyValue: { email: 'test@example.com' } };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email address is already registered',
      details: { field: 'email', value: 'test@example.com' },
    });
  });

  it('should handle token errors', () => {
    const error = { name: 'JsonWebTokenError' };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid token',
    });
  });

  it('should handle expired token errors', () => {
    const error = { name: 'TokenExpiredError' };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token expired',
    });
  });

  it('should handle database connection errors', () => {
    const error = { name: 'MongoNetworkError' };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database connection error',
    });
  });

  it('should handle generic errors', () => {
    const error = { message: 'Something went wrong' };

    errorHandler(error as any, req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong',
    });
  });
});

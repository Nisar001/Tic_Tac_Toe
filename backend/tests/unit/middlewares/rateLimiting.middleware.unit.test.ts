// Unit tests for rateLimiting.middleware.ts
import { generalRateLimit, authRateLimit, passwordResetRateLimit, emailVerificationRateLimit, gameCreationRateLimit, chatRateLimit } from '../../../src/middlewares/rateLimiting.middleware';
import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

jest.mock('express-rate-limit', () => jest.fn(() => jest.fn((req, res) => {
  res.status(429).json({
    success: false,
    message: 'Rate limit exceeded',
    retryAfter: 60,
  });
})));

describe('Rate Limiting Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const next = jest.fn();

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockImplementation(() => res as Response),
      json: jest.fn(),
    };
  });

  it('should handle general rate limit exceeded', () => {
    generalRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(60000 / 1000),
    });
  });

  it('should handle auth rate limit exceeded', () => {
    authRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many authentication attempts, please try again later',
      retryAfter: 900,
    });
  });

  it('should handle password reset rate limit exceeded', () => {
    passwordResetRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many password reset requests, please try again later',
      retryAfter: 3600,
    });
  });

  it('should handle email verification rate limit exceeded', () => {
    emailVerificationRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many verification requests, please try again later',
      retryAfter: 300,
    });
  });

  it('should handle game creation rate limit exceeded', () => {
    gameCreationRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many game creation requests, please slow down',
      retryAfter: 60,
    });
  });

  it('should handle chat rate limit exceeded', () => {
    chatRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Too many messages, please slow down',
      retryAfter: 60,
    });
  });
});

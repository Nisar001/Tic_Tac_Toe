// Unit tests for security.middleware.ts
import { corsMiddleware, securityHeaders, customSecurity, validateApiKey, ipWhitelist, requestSizeLimiter, userAgentValidation } from '../../../src/middlewares/security.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Security Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {
        'x-api-key': 'valid_api_key',
        'content-length': '1024',
        'user-agent': 'Mozilla/5.0',
      },
      connection: { remoteAddress: '127.0.0.1' } as any,
      socket: { remoteAddress: '127.0.0.1' } as any,
    };

    res = {
      status: jest.fn().mockImplementation(() => res as Response),
      json: jest.fn(),
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
    next = jest.fn();
  });

  it('should handle CORS middleware', () => {
    corsMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should set security headers', () => {
    customSecurity(req as Request, res as Response, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', '1.0.0');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(next).toHaveBeenCalled();
  });

  it('should validate API key', () => {
    process.env.ADMIN_API_KEY = 'valid_api_key';
    req.headers['x-api-key'] = 'valid_api_key';

    validateApiKey(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject invalid API key', () => {
    process.env.ADMIN_API_KEY = 'valid_api_key';
    req.headers['x-api-key'] = 'invalid_api_key';

    validateApiKey(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or missing API key',
    });
  });

  it('should whitelist IPs', () => {
    const middleware = ipWhitelist(['127.0.0.1']);
    req.connection.remoteAddress = '127.0.0.1';

    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject non-whitelisted IPs', () => {
    const middleware = ipWhitelist(['127.0.0.1']);
    req.connection.remoteAddress = '192.168.1.1';

    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied: IP not whitelisted',
    });
  });

  it('should limit request size', () => {
    const middleware = requestSizeLimiter('1kb');
    req.headers['content-length'] = '1024';

    middleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject oversized requests', () => {
    const middleware = requestSizeLimiter('1kb');
    req.headers['content-length'] = '2048';

    middleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Request body too large. Maximum size allowed: 1kb',
    });
  });

  it('should validate User-Agent header', () => {
    req.headers['user-agent'] = 'Mozilla/5.0';

    userAgentValidation(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject blocked User-Agent header', () => {
    req.headers['user-agent'] = 'curl';

    userAgentValidation(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User-Agent header is required',
    });
  });
});

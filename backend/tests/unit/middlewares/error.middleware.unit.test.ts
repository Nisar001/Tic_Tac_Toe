
import { Request, Response, NextFunction } from 'express';
import { AppError, asyncHandler, catchAsync, createError, databaseErrorHandler, errorHandler, notFoundHandler, securityErrorHandler } from 'middlewares/error.middleware';

/**
 * CustomError type for test compatibility.
 * Extend as needed to match your application's error structure.
 */
type CustomError = Error & {
  statusCode?: number;
  errors?: Record<string, any>;
  code?: number;
  keyValue?: Record<string, any>;
  name?: string;
  path?: string;
  value?: any;
  stack?: string;
};

// Declare shared variables for tests
let req: Partial<Request>;
let res: Partial<Response>;
let next: jest.Mock<any, any>;
let originalNodeEnv: string | undefined;

  beforeEach(() => {
    req = {
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Test User Agent'),
      method: 'GET'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
    
    // Mock console methods
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('errorHandler middleware', () => {
    it('should handle basic errors with default values', () => {
      const error = new Error('Test error') as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error'
      });
    });

    it('should handle errors with custom status code', () => {
      const error = new Error('Bad request') as CustomError;
      error.statusCode = 400;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Bad request'
      });
    });

    it('should handle validation errors', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: {
            message: 'Email is required',
            name: 'ValidatorError',
            kind: 'required',
            path: 'email',
            value: '',
            properties: {
              message: 'Email is required',
              type: 'required',
              path: 'email',
              value: ''
            }
          },
          password: {
            message: 'Password is too short',
            name: 'ValidatorError',
            kind: 'minlength',
            path: 'password',
            value: '',
            properties: {
              message: 'Password is too short',
              type: 'minlength',
              path: 'password',
              value: ''
            }
          }
        }
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation Error',
        details: {
          errors: {
            email: 'Email is required',
            password: 'Password is too short'
          }
        }
      });
    });

    it('should handle CastError', () => {
      const error = {
        name: 'CastError',
        path: 'userId',
        value: 'invalid-id'
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid ID format',
        details: {
          field: 'userId',
          value: 'invalid-id'
        }
      });
    });

    it('should handle duplicate key error with email', () => {
      const error = {
        name: 'MongoError',
        message: 'Duplicate key',
        code: 11000,
        keyValue: { email: 'test@example.com' }
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email address is already registered',
        details: {
          field: 'email',
          value: 'test@example.com'
        }
      });
    });

    it('should handle duplicate key error with username', () => {
      const error = {
        name: 'MongoError',
        message: 'Duplicate key',
        code: 11000,
        keyValue: { username: 'testuser' }
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Username is already taken',
        details: {
          field: 'username',
          value: 'testuser'
        }
      });
    });

    it('should handle duplicate key error with generic field', () => {
      const error = {
        name: 'MongoError',
        message: 'Duplicate key',
        code: 11000,
        keyValue: { gameId: 'game123' }
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'gameId already exists',
        details: {
          field: 'gameId',
          value: 'game123'
        }
      });
    });

    it('should handle JWT errors', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'jwt malformed'
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle token expired errors', () => {
      const error = {
        name: 'TokenExpiredError',
        message: 'jwt expired'
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
    });

    it('should handle MongoDB network errors', () => {
      const error = {
        name: 'MongoNetworkError',
        message: 'connection failed'
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection error'
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error') as CustomError;
      error.stack = 'Error stack trace';
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error',
        stack: 'Error stack trace'
      });
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error') as CustomError;
      error.stack = 'Error stack trace';
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Test error'
      });
    });

    it('should log errors in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error') as CustomError;
      error.stack = 'Error stack trace';
      
      errorHandler(error, req as Request, res as Response, next);

      expect(console.error).toHaveBeenCalledWith('Error Stack:', 'Error stack trace');
      expect(console.error).toHaveBeenCalledWith('Error Details:', error);
    });

    it('should handle errors with no message', () => {
      const error = { name: 'CustomError' } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });
  });

  describe('notFoundHandler middleware', () => {
    it('should create 404 error for undefined routes', () => {
      req.originalUrl = '/nonexistent-route';
      
      notFoundHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /nonexistent-route not found',
          statusCode: 404
        })
      );
    });

    it('should handle routes with query parameters', () => {
      req.originalUrl = '/api/users?page=1&limit=10';
      
      notFoundHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route /api/users?page=1&limit=10 not found',
          statusCode: 404
        })
      );
    });
  });

  describe('asyncHandler middleware', () => {
    it('should execute async function successfully', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(asyncFn);
      
      const reqWithGet = { ...req, get: jest.fn() } as Request;
      await wrappedFn(reqWithGet, res as Response, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async function errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);
      
      const reqWithGet = { ...req, get: jest.fn() } as Request;
      await wrappedFn(reqWithGet, res as Response, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous errors', async () => {
      const error = new Error('Sync error');
      const asyncFn = jest.fn().mockImplementation(() => {
        throw error;
      });
      const wrappedFn = asyncHandler(asyncFn);
      
      await wrappedFn(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('AppError class', () => {
    it('should create AppError with message and status code', () => {
      const error = new AppError('Custom error', 400);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error).toBeInstanceOf(Error);
    });

    it('should use default status code 500', () => {
      const error = new AppError('Server error');

      expect(error.message).toBe('Server error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('createError helpers', () => {
    it('should create badRequest error', () => {
      const error = createError.badRequest('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
    });

    it('should create unauthorized error', () => {
      const error = createError.unauthorized('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(401);
    });

    it('should create forbidden error', () => {
      const error = createError.forbidden('Insufficient permissions');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('should create notFound error', () => {
      const error = createError.notFound('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
    });

    it('should create conflict error', () => {
      const error = createError.conflict('Resource already exists');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
    });

    it('should create tooManyRequests error', () => {
      const error = createError.tooManyRequests('Rate limit exceeded');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(429);
    });

    it('should create internal error', () => {
      const error = createError.internal('Something went wrong');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
    });

    it('should create notImplemented error', () => {
      const error = createError.notImplemented('Feature not available');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Feature not available');
      expect(error.statusCode).toBe(501);
    });

    it('should create serviceUnavailable error', () => {
      const error = createError.serviceUnavailable('Service down');

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Service down');
      expect(error.statusCode).toBe(503);
    });

    it('should use default messages', () => {
      expect(createError.badRequest().message).toBe('Bad Request');
      expect(createError.unauthorized().message).toBe('Unauthorized');
      expect(createError.forbidden().message).toBe('Forbidden');
      expect(createError.notFound().message).toBe('Not Found');
      expect(createError.conflict().message).toBe('Conflict');
      expect(createError.tooManyRequests().message).toBe('Too Many Requests');
      expect(createError.internal().message).toBe('Internal Server Error');
      expect(createError.notImplemented().message).toBe('Not Implemented');
      expect(createError.serviceUnavailable().message).toBe('Service Unavailable');
    });
  });

  describe('catchAsync middleware', () => {
    it('should execute async function successfully', async () => {
      const asyncFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = catchAsync(asyncFn);
      
      const reqWithGet = { ...req, get: jest.fn() } as Request;
      await wrappedFn(reqWithGet, res as Response, next);

      expect(asyncFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch async errors', async () => {
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = catchAsync(asyncFn);
      
      const reqWithGet = { ...req, get: jest.fn() } as Request;
      await wrappedFn(reqWithGet, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('securityErrorHandler middleware', () => {
    it('should log security alerts for 401 errors', () => {
      const error = { statusCode: 401, message: 'Unauthorized access' } as CustomError;
      
      securityErrorHandler(error, req as Request, res as Response, next);

      expect(console.warn).toHaveBeenCalledWith(
        'Security Alert: Unauthorized access',
        expect.objectContaining({
          ip: '127.0.0.1',
          userAgent: 'Test User Agent',
          url: '/test',
          method: 'GET',
          timestamp: expect.any(String)
        })
      );
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should log security alerts for 403 errors', () => {
      const error = { statusCode: 403, message: 'Forbidden access' } as CustomError;
      
      securityErrorHandler(error, req as Request, res as Response, next);

      expect(console.warn).toHaveBeenCalledWith(
        'Security Alert: Forbidden access',
        expect.any(Object)
      );
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should not log for non-security errors', () => {
      const error = { statusCode: 404, message: 'Not found' } as CustomError;
      
      securityErrorHandler(error, req as Request, res as Response, next);

      expect(console.warn).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should pass error to next middleware', () => {
      const error = { statusCode: 500, message: 'Server error' } as CustomError;
      
      securityErrorHandler(error, req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('databaseErrorHandler middleware', () => {
    it('should handle MongoNetworkError', () => {
      const error = {
        name: 'MongoNetworkError',
        message: 'Network error'
      } as CustomError;
      
      databaseErrorHandler(error, req as Request, res as Response, next);

      expect(console.error).toHaveBeenCalledWith('Database connection error:', error);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database service temporarily unavailable',
        retryAfter: 30
      });
    });

    it('should handle MongoTimeoutError', () => {
      const error = {
        name: 'MongoTimeoutError',
        message: 'Timeout error'
      } as CustomError;
      
      databaseErrorHandler(error, req as Request, res as Response, next);

      expect(console.error).toHaveBeenCalledWith('Database connection error:', error);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database service temporarily unavailable',
        retryAfter: 30
      });
    });

    it('should pass non-database errors to next middleware', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed'
      } as CustomError;
      
      databaseErrorHandler(error, req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle validation error with no errors object', () => {
      const error = {
        name: 'ValidationError',
        errors: {}
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation Error',
        details: { errors: {} }
      });
    });

    it('should handle duplicate key error with no keyValue', () => {
      const error = {
        code: 11000,
        keyValue: {}
      } as CustomError;
      
      errorHandler(error, req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'undefined already exists',
        details: {
          field: undefined,
          value: undefined
        }
      });
    });

    it('should handle missing request properties in securityErrorHandler', () => {
      const error = { statusCode: 401, message: 'Unauthorized' } as CustomError;
      const minimalReq = {} as Request;
      
      securityErrorHandler(error, minimalReq, res as Response, next);

      expect(console.warn).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  path?: string;
  value?: any;
  keyValue?: Record<string, any>;
  errors?: Record<string, MongooseError.ValidatorError>;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode ?? 500;
  let message = error.message || 'Internal Server Error';
  let details: Record<string, any> = {};

  // Log full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('💥 Error Stack:', error.stack);
    console.error('🧠 Error Object:', error);
  }

  switch (error.name) {
    case 'ValidationError':
      statusCode = 400;
      message = 'Validation Error';
      details = handleValidationError(error as MongooseError.ValidationError);
      break;
    case 'CastError':
      statusCode = 400;
      message = 'Invalid ID format';
      details = {
        field: (error as any).path,
        value: (error as any).value
      };
      break;
    case 'JsonWebTokenError':
      statusCode = 401;
      message = 'Invalid token';
      break;
    case 'TokenExpiredError':
      statusCode = 401;
      message = 'Token expired';
      break;
    case 'MongoNetworkError':
    case 'MongoTimeoutError':
      statusCode = 503;
      message = 'Database connection error';
      break;
  }

  // Duplicate key error (code 11000)
  if (error.code === 11000) {
    statusCode = 409;
    const dupError = handleDuplicateKeyError(error);
    message = dupError.message;
    details = dupError.details;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(Object.keys(details).length > 0 && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (error: MongooseError.ValidationError) => {
  const errors: Record<string, string> = {};
  for (const field in error.errors) {
    if (Object.prototype.hasOwnProperty.call(error.errors, field)) {
      errors[field] = error.errors[field].message;
    }
  }
  return { errors };
};

/**
 * Handle MongoDB duplicate key errors
 */
const handleDuplicateKeyError = (error: CustomError) => {
  const key = Object.keys(error.keyValue || {})[0];
  const value = error.keyValue?.[key];

  let message = `${key} already exists`;
  if (key === 'email') message = 'Email address is already registered';
  else if (key === 'username') message = 'Username is already taken';

  return {
    message,
    details: { field: key, value }
  };
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error: CustomError = new Error(`Route ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (...args: any[]) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Also alias for async handler
 */
export const catchAsync = asyncHandler;

/**
 * Custom error class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error creators
 */
export const createError = {
  badRequest: (msg = 'Bad Request') => new AppError(msg, 400),
  unauthorized: (msg = 'Unauthorized') => new AppError(msg, 401),
  forbidden: (msg = 'Forbidden') => new AppError(msg, 403),
  notFound: (msg = 'Not Found') => new AppError(msg, 404),
  conflict: (msg = 'Conflict') => new AppError(msg, 409),
  tooManyRequests: (msg = 'Too Many Requests') => new AppError(msg, 429),
  internal: (msg = 'Internal Server Error') => new AppError(msg, 500),
  notImplemented: (msg = 'Not Implemented') => new AppError(msg, 501),
  serviceUnavailable: (msg = 'Service Unavailable') => new AppError(msg, 503)
};

/**
 * Security error handler - logs only, doesn't respond
 */
export const securityErrorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if ([401, 403].includes(error.statusCode ?? 0)) {
    console.warn(`🔐 Security Alert: ${error.message}`, {
      ip: req.ip,
      method: req.method,
      path: req.originalUrl,
      userAgent: req.get('User-Agent'),
      time: new Date().toISOString()
    });
  }

  next(error);
};

/**
 * MongoDB connection issue handler
 */
export const databaseErrorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (['MongoNetworkError', 'MongoTimeoutError'].includes(error.name)) {
    console.error('🛑 Database connection issue:', error);

    res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable',
      retryAfter: 30 // seconds
    });
    return;
  }

  next(error);
};

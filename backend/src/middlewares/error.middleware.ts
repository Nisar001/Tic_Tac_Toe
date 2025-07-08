import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  path?: string;
  value?: any;
  errors?: any;
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
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let details: any = {};

  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Stack:', error.stack);
    console.error('Error Details:', error);
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = handleValidationError(error as MongooseError.ValidationError);
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    details = { field: (error as any).path, value: (error as any).value };
  } else if (error.code === 11000) {
    statusCode = 409;
    const duplicateError = handleDuplicateKeyError(error);
    message = duplicateError.message;
    details = duplicateError.details;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (error.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database connection error';
  }

  // Send error response
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
  
  Object.keys(error.errors).forEach(key => {
    const validatorError = error.errors[key];
    errors[key] = validatorError.message;
  });

  return { errors };
};

/**
 * Handle MongoDB duplicate key errors
 */
const handleDuplicateKeyError = (error: CustomError) => {
  const field = Object.keys((error as any).keyValue)[0];
  const value = (error as any).keyValue[field];
  
  let message = `${field} already exists`;
  
  // Customize message for common fields
  if (field === 'email') {
    message = 'Email address is already registered';
  } else if (field === 'username') {
    message = 'Username is already taken';
  }

  return {
    message,
    details: { field, value }
  };
};

/**
 * Handle 404 errors for undefined routes
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
 * Async error wrapper to catch promise rejections
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
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
  badRequest: (message: string = 'Bad Request') => new AppError(message, 400),
  unauthorized: (message: string = 'Unauthorized') => new AppError(message, 401),
  forbidden: (message: string = 'Forbidden') => new AppError(message, 403),
  notFound: (message: string = 'Not Found') => new AppError(message, 404),
  conflict: (message: string = 'Conflict') => new AppError(message, 409),
  tooManyRequests: (message: string = 'Too Many Requests') => new AppError(message, 429),
  internal: (message: string = 'Internal Server Error') => new AppError(message, 500),
  notImplemented: (message: string = 'Not Implemented') => new AppError(message, 501),
  serviceUnavailable: (message: string = 'Service Unavailable') => new AppError(message, 503)
};

/**
 * Middleware to handle uncaught exceptions in async routes
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Security error handler for suspicious activities
 */
export const securityErrorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log security-related errors
  if (error.statusCode === 401 || error.statusCode === 403) {
    console.warn(`Security Alert: ${error.message}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  next(error);
};

/**
 * Database error handler
 */
export const databaseErrorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle database connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    console.error('Database connection error:', error);
    
    res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable',
      retryAfter: 30
    });
    return;
  }

  next(error);
};

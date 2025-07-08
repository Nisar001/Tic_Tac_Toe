import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

/**
 * General rate limiting middleware
 */
export const generalRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later',
      retryAfter: Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000)
    });
  }
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 900 // 15 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later',
      retryAfter: 900
    });
  }
});

/**
 * Rate limiting for password reset requests
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again later',
    retryAfter: 3600 // 1 hour
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests, please try again later',
      retryAfter: 3600
    });
  }
});

/**
 * Rate limiting for email verification requests
 */
export const emailVerificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 requests per 5 minutes
  message: {
    success: false,
    message: 'Too many verification requests, please try again later',
    retryAfter: 300 // 5 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many verification requests, please try again later',
      retryAfter: 300
    });
  }
});

/**
 * Rate limiting for game creation
 */
export const gameCreationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 games per minute
  message: {
    success: false,
    message: 'Too many game creation requests, please slow down',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many game creation requests, please slow down',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiting for chat messages
 */
export const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: 'Too many messages, please slow down',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many messages, please slow down',
      retryAfter: 60
    });
  }
});

/**
 * Rate limiting for friend requests
 */
export const friendRequestRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 friend requests per hour
  message: {
    success: false,
    message: 'Too many friend requests, please try again later',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many friend requests, please try again later',
      retryAfter: 3600
    });
  }
});

/**
 * Rate limiting for profile updates
 */
export const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 updates per hour
  message: {
    success: false,
    message: 'Too many profile updates, please try again later',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many profile updates, please try again later',
      retryAfter: 3600
    });
  }
});

/**
 * Dynamic rate limiting based on user level
 */
export const createDynamicRateLimit = (baseMax: number, windowMs: number = 60000) => {
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      // Increase rate limit for higher level users
      const user = (req as any).user;
      const userLevel = user?.level || 1;
      const multiplier = Math.min(1 + (userLevel - 1) * 0.1, 2); // Max 2x for high level users
      return Math.floor(baseMax * multiplier);
    },
    message: {
      success: false,
      message: 'Rate limit exceeded, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Rate limit exceeded, please try again later',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

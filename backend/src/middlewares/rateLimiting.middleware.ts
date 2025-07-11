import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../config';

/**
 * Default handler generator
 */
const rateLimitHandler = (retryAfterSeconds: number, message: string) => {
  return (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message,
      retryAfter: retryAfterSeconds
    });
  };
};

/**
 * Default message object generator
 */
const createMessage = (msg: string, retryAfterSeconds: number) => ({
  success: false,
  message: msg,
  retryAfter: retryAfterSeconds
});

/**
 * General rate limiting middleware
 */
export const generalRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT.WINDOW_MS,
  max: config.RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many requests, please try again later',
    Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000)
  ),
  handler: rateLimitHandler(
    Math.ceil(config.RATE_LIMIT.WINDOW_MS / 1000),
    'Too many requests, please try again later'
  )
});

/**
 * Strict rate limiting for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many authentication attempts, please try again later',
    900
  ),
  handler: rateLimitHandler(
    900,
    'Too many authentication attempts, please try again later'
  )
});

/**
 * Password reset request rate limiter
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many password reset requests, please try again later',
    3600
  ),
  handler: rateLimitHandler(
    3600,
    'Too many password reset requests, please try again later'
  )
});

/**
 * Email verification request limiter
 */
export const emailVerificationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many verification requests, please try again later',
    300
  ),
  handler: rateLimitHandler(
    300,
    'Too many verification requests, please try again later'
  )
});

/**
 * Game creation limiter
 */
export const gameCreationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many game creation requests, please slow down',
    60
  ),
  handler: rateLimitHandler(
    60,
    'Too many game creation requests, please slow down'
  )
});

/**
 * Chat message limiter
 */
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many messages, please slow down',
    60
  ),
  handler: rateLimitHandler(
    60,
    'Too many messages, please slow down'
  )
});

/**
 * Friend request limiter
 */
export const friendRequestRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many friend requests, please try again later',
    3600
  ),
  handler: rateLimitHandler(
    3600,
    'Too many friend requests, please try again later'
  )
});

/**
 * Profile update limiter
 */
export const profileUpdateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: createMessage(
    'Too many profile updates, please try again later',
    3600
  ),
  handler: rateLimitHandler(
    3600,
    'Too many profile updates, please try again later'
  )
});

/**
 * Dynamic rate limiter based on user level
 */
export const createDynamicRateLimit = (
  baseMax: number,
  windowMs: number = 60 * 1000
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max: (req: Request): number => {
      const user = (req as any).user;
      const level = typeof user?.level === 'number' ? user.level : 1;
      const multiplier = Math.min(1 + (level - 1) * 0.1, 2);
      return Math.floor(baseMax * multiplier);
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: createMessage(
      'Rate limit exceeded, please try again later',
      Math.ceil(windowMs / 1000)
    ),
    handler: rateLimitHandler(
      Math.ceil(windowMs / 1000),
      'Rate limit exceeded, please try again later'
    )
  });
};

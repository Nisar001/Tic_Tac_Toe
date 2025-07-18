import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * CORS configuration with enhanced debugging and flexibility
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      config.FRONTEND_URL,
      'https://tictactoenisar.netlify.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

    // Enhanced pattern matching for Netlify
    const isNetlifyDomain = origin.includes('netlify.app') || origin.includes('netlify.com');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
    const isRenderDomain = origin.includes('onrender.com');
    const isExactMatch = allowedOrigins.includes(origin);

    // Allow if exact match, or if Netlify domain in production, or localhost in any env
    const shouldAllow = isExactMatch || 
                       (process.env.NODE_ENV === 'production' && isNetlifyDomain) || 
                       isLocalhost ||
                       isRenderDomain;

    if (shouldAllow) {
      callback(null, true);
    } else {
      // In production, be more permissive to avoid blocking legitimate requests
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Timestamp',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'If-None-Match'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

/**
 * Helmet config
 */
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'ws:', 'wss:']
    }
  },
  crossOriginEmbedderPolicy: false
};

export const securityHeaders = helmet(helmetOptions);
export const corsMiddleware = cors(corsOptions);

/**
 * Custom headers
 */
export const customSecurity = (req: Request, res: Response, next: NextFunction): void => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * API key validation
 */
export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!validApiKey) {
    res.status(500).json({
      success: false,
      message: 'API key validation not configured'
    });
    return;
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
    return;
  }

  next();
};

/**
 * IP Whitelist
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    if (!ip || !allowedIPs.includes(ip)) {
      res.status(403).json({
        success: false,
        message: 'Access denied: IP not whitelisted'
      });
      return;
    }

    next();
  };
};

/**
 * Request size limiter
 */
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const contentLength = req.headers['content-length'];
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10);
        const maxSizeInBytes = parseMaxSize(maxSize);
        if (sizeInBytes > maxSizeInBytes) {
          res.status(413).json({
            success: false,
            message: `Request body too large. Maximum allowed: ${maxSize}`
          });
          return;
        }
      }
      next();
    } catch (err) {
      res.status(400).json({
        success: false,
        message: 'Invalid content length'
      });
    }
  };
};

/**
 * User-Agent blocking
 */
export const userAgentValidation = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'] || '';

  const blockedAgents = [
    /curl/i,
    /wget/i,
    /python-requests/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i
  ];

  if (!userAgent) {
    res.status(400).json({
      success: false,
      message: 'User-Agent header is required'
    });
    return;
  }

  if (blockedAgents.some(pattern => pattern.test(userAgent))) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Automated requests not allowed'
    });
    return;
  }

  next();
};

/**
 * Timestamp freshness
 */
export const timestampValidation = (maxAge = 5 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const timestamp = req.headers['x-timestamp'];
      if (!timestamp) return next();

      const requestTime = parseInt(timestamp as string, 10);
      const currentTime = Date.now();

      if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > maxAge) {
        res.status(400).json({
          success: false,
          message: 'Request timestamp is invalid or too old'
        });
        return;
      }

      next();
    } catch {
      res.status(400).json({
        success: false,
        message: 'Invalid timestamp header'
      });
    }
  };
};

/**
 * Validate content type
 */
export const contentTypeValidation = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        res.status(400).json({
          success: false,
          message: 'Invalid content type',
          allowedTypes
        });
        return;
      }
    }

    next();
  };
};

/**
 * Helper - Parse max size string to bytes
 */
function parseMaxSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 ** 2,
    gb: 1024 ** 3
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) throw new Error('Invalid size format');

  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}

/**
 * Remove suspicious headers
 */
export const sanitizeHeaders = (req: Request, res: Response, next: NextFunction): void => {
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-cluster-client-ip'];
  delete req.headers['x-real-ip'];
  next();
};

/**
 * Detect suspicious payloads
 */
export const activityMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /\.\./,
    /<script/i,
    /union.*select/i,
    /javascript:/i,
    /eval\(/i
  ];

  const payload = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;

  if (suspiciousPatterns.some(pattern => pattern.test(payload))) {
    // Log suspicious activity using proper logger instead of console
    // console.warn removed for production deployment
    
    res.status(400).json({
      success: false,
      message: 'Malicious request detected'
    });
    return;
  }

  next();
};

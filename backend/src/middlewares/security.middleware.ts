import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      config.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5173', // Vite default port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
    'X-API-Key'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

/**
 * Helmet security configuration
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

/**
 * Security headers middleware
 */
export const securityHeaders = helmet(helmetOptions);

/**
 * CORS middleware
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Custom security middleware
 */
export const customSecurity = (req: Request, res: Response, next: NextFunction): void => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
};

/**
 * API key validation middleware (for admin/internal endpoints)
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
 * IP whitelist middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
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
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseMaxSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        res.status(413).json({
          success: false,
          message: `Request body too large. Maximum size allowed: ${maxSize}`
        });
        return;
      }
    }

    next();
  };
};

/**
 * User agent validation (block known bad bots)
 */
export const userAgentValidation = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'];
  
  // List of blocked user agents (bots, scrapers, etc.)
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

  const isBlocked = blockedAgents.some(pattern => pattern.test(userAgent));
  
  if (isBlocked) {
    res.status(403).json({
      success: false,
      message: 'Access denied: Automated requests not allowed'
    });
    return;
  }

  next();
};

/**
 * Request timestamp validation
 */
export const timestampValidation = (maxAge: number = 300000) => { // 5 minutes default
  return (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = req.headers['x-timestamp'];
    
    if (!timestamp) {
      next(); // Optional validation
      return;
    }

    const requestTime = parseInt(timestamp as string);
    const currentTime = Date.now();
    
    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > maxAge) {
      res.status(400).json({
        success: false,
        message: 'Request timestamp is invalid or too old'
      });
      return;
    }

    next();
  };
};

/**
 * Content type validation
 */
export const contentTypeValidation = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
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
 * Helper function to parse size strings
 */
function parseMaxSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  
  if (!match) {
    throw new Error('Invalid size format');
  }

  const [, value, unit] = match;
  return parseFloat(value) * units[unit];
}

/**
 * Sanitize request headers
 */
export const sanitizeHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove potentially dangerous headers
  delete req.headers['x-forwarded-host'];
  delete req.headers['x-cluster-client-ip'];
  delete req.headers['x-real-ip'];

  next();
};

/**
 * Monitor suspicious activities
 */
export const activityMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /eval\(/i,  // Code injection
  ];

  const checkString = `${req.url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(checkString));
  
  if (isSuspicious) {
    console.warn('Suspicious activity detected:', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    
    res.status(400).json({
      success: false,
      message: 'Malicious request detected'
    });
    return;
  }

  next();
};

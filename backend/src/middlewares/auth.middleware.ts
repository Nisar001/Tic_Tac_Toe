import { Request, Response, NextFunction } from 'express';
import { AuthUtils } from '../utils/auth.utils';
import User from '../models/user.model';
import { IUser } from '../models/user.model';
import { JWTPayload } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: any; // Will be properly typed after User model is fixed
  token?: string;
}

/**
 * Middleware to authenticate user using JWT token
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
      return;
    }

    const decoded = AuthUtils.verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password') as IUser;

    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
      return;
    }

    if (!user.isEmailVerified) {
      res.status(401).json({ 
        success: false, 
        message: 'Email not verified' 
      });
      return;
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

/**
 * Middleware to authenticate user but not require it
 */
export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthUtils.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = AuthUtils.verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('-password') as IUser;
      
      if (user && user.isEmailVerified) {
        req.user = user;
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional authentication
    next();
  }
};

/**
 * Middleware to check if user has sufficient energy
 */
export const checkEnergy = (energyRequired: number = 1) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    if (req.user.energy < energyRequired) {
      res.status(403).json({ 
        success: false, 
        message: 'Insufficient energy',
        currentEnergy: req.user.energy,
        requiredEnergy: energyRequired
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
    return;
  }

  next();
};

/**
 * Middleware to check minimum level requirement
 */
export const requireLevel = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    if (req.user.level < minLevel) {
      res.status(403).json({ 
        success: false, 
        message: `Level ${minLevel} required`,
        currentLevel: req.user.level,
        requiredLevel: minLevel
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to refresh user data from database
 */
export const refreshUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      next();
      return;
    }

    const refreshedUser = await User.findById(req.user._id).select('-password') as IUser;
    if (refreshedUser) {
      req.user = refreshedUser;
    }

    next();
  } catch (error) {
    console.error('User refresh failed:', error);
    next(); // Continue even if refresh fails
  }
};

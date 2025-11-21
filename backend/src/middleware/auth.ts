import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  hotel_id: string | null;
  department_id: string | null;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      hotel_id: decoded.hotel_id,
      department_id: decoded.department_id,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token. Please login again.',
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
      });
    }

    next();
  };
};

/**
 * Middleware for guest authentication via session token
 */
export const authenticateGuest = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Session token required',
      });
    }

    // Store session token in request for later validation
    req.headers['session-token'] = sessionToken;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Generate JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

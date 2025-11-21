import { Response, NextFunction } from 'express';
import { AuthRequest, UserRole } from '../types';

/**
 * Middleware to ensure tenant isolation
 * Validates that hotel_id in request matches authenticated user's hotel
 * Super admins can access any hotel
 */
export const enforceHotelIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Super admins can access any hotel
    if (user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Extract hotel_id from request (body, params, or query)
    const requestHotelId =
      req.body?.hotel_id || req.params?.hotel_id || req.query?.hotel_id;

    // If no hotel_id in request, use user's hotel_id
    if (!requestHotelId) {
      if (!user.hotel_id) {
        return res.status(400).json({
          success: false,
          error: 'Hotel ID is required',
        });
      }
      // Inject user's hotel_id into request
      req.body.hotel_id = user.hotel_id;
      req.params.hotel_id = user.hotel_id;
      return next();
    }

    // Validate hotel_id matches user's hotel
    if (user.hotel_id && requestHotelId !== user.hotel_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own hotel data.',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Tenant isolation error',
    });
  }
};

/**
 * Middleware to inject hotel_id filter into query parameters
 * This ensures all database queries are automatically filtered by hotel_id
 */
export const injectHotelFilter = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Super admins don't need hotel filter (can access all)
    if (user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    // Ensure hotel_id is present in request context
    if (!user.hotel_id) {
      return res.status(400).json({
        success: false,
        error: 'User must be associated with a hotel',
      });
    }

    // Store hotel_id in request for easy access in route handlers
    req.headers['x-hotel-id'] = user.hotel_id;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Hotel filter injection error',
    });
  }
};

/**
 * Middleware to enforce department isolation for staff
 * Staff can only access tasks assigned to their department
 */
export const enforceDepartmentIsolation = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Only staff need department isolation
    if (user.role !== UserRole.STAFF) {
      return next();
    }

    if (!user.department_id) {
      return res.status(400).json({
        success: false,
        error: 'Staff must be associated with a department',
      });
    }

    // Store department_id in request for filtering
    req.headers['x-department-id'] = user.department_id;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Department isolation error',
    });
  }
};

/**
 * Helper function to get hotel_id from request
 */
export const getHotelIdFromRequest = (req: AuthRequest): string | null => {
  return req.headers['x-hotel-id'] as string || req.user?.hotel_id || null;
};

/**
 * Helper function to get department_id from request
 */
export const getDepartmentIdFromRequest = (req: AuthRequest): string | null => {
  return req.headers['x-department-id'] as string || req.user?.department_id || null;
};

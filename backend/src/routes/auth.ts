import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { generateToken } from '../middleware/auth';
import { AuthRequest, UserRole, ApiResponse } from '../types';

const router = Router();

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login', async (req, res: Response<ApiResponse>) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Get user from database
    const result = await query(
      `SELECT
        u.id, u.email, u.password_hash, u.first_name, u.last_name,
        u.role, u.hotel_id, u.department_id, u.is_active,
        h.name as hotel_name, h.license_status
      FROM users u
      LEFT JOIN hotels h ON u.hotel_id = h.id
      WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Your account has been deactivated. Please contact support.',
      });
    }

    // Check hotel license status (except for super_admin)
    if (user.role !== UserRole.SUPER_ADMIN && user.license_status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Hotel license is not active. Please contact your administrator.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      hotel_id: user.hotel_id,
      department_id: user.department_id,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          hotel_id: user.hotel_id,
          hotel_name: user.hotel_name,
          department_id: user.department_id,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
    });
  }
});

/**
 * POST /api/auth/register
 * Register new hotel admin (only by super admin)
 */
router.post('/register', async (req, res: Response<ApiResponse>) => {
  try {
    const { email, password, first_name, last_name, hotel_id, role } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );

    // Create user
    const userId = uuidv4();
    const userRole = role || UserRole.HOTEL_ADMIN;

    await query(
      `INSERT INTO users (id, hotel_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        userId,
        userRole === UserRole.SUPER_ADMIN ? null : hotel_id,
        email.toLowerCase(),
        passwordHash,
        first_name,
        last_name,
        userRole,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: { user_id: userId },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.',
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long',
      });
    }

    // Get user's current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(
      current_password,
      result.rows[0].password_hash
    );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(
      new_password,
      parseInt(process.env.BCRYPT_ROUNDS || '10')
    );

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      newPasswordHash,
      userId,
    ]);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password. Please try again.',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const result = await query(
      `SELECT
        u.id, u.email, u.first_name, u.last_name, u.role,
        u.hotel_id, u.department_id, u.phone, u.is_active,
        h.name as hotel_name,
        d.name as department_name
      FROM users u
      LEFT JOIN hotels h ON u.hotel_id = h.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        hotel_id: user.hotel_id,
        hotel_name: user.hotel_name,
        department_id: user.department_id,
        department_name: user.department_name,
        phone: user.phone,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
    });
  }
});

export default router;

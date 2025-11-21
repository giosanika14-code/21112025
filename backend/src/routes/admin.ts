import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest, UserRole, ApiResponse } from '../types';

const router = Router();

// All routes require super admin authentication
router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN));

/**
 * GET /api/admin/hotels
 * Get all hotels
 */
router.get('/hotels', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const result = await query(
      `SELECT
        id, name, address, phone, email,
        license_status, license_expires_at,
        created_at, updated_at,
        (SELECT COUNT(*) FROM users WHERE hotel_id = hotels.id AND role != 'super_admin') as user_count,
        (SELECT COUNT(*) FROM rooms WHERE hotel_id = hotels.id) as room_count
      FROM hotels
      ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get hotels error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hotels',
    });
  }
});

/**
 * POST /api/admin/hotels
 * Create new hotel
 */
router.post('/hotels', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      license_expires_at,
      gm_first_name,
      gm_last_name,
      gm_email,
      gm_password,
    } = req.body;

    // Validate required fields
    if (!name || !email || !gm_first_name || !gm_last_name || !gm_email || !gm_password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    // Check if hotel email already exists
    const existingHotel = await query(
      'SELECT id FROM hotels WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingHotel.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Hotel with this email already exists',
      });
    }

    // Check if GM email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [gm_email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Create hotel
    const hotelId = uuidv4();
    await query(
      `INSERT INTO hotels (id, name, address, phone, email, license_status, license_expires_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
      [hotelId, name, address, phone, email.toLowerCase(), license_expires_at || null]
    );

    // Create GM account
    const gmId = uuidv4();
    const passwordHash = await bcrypt.hash(gm_password, 10);

    await query(
      `INSERT INTO users (id, hotel_id, email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        gmId,
        hotelId,
        gm_email.toLowerCase(),
        passwordHash,
        gm_first_name,
        gm_last_name,
        UserRole.HOTEL_ADMIN,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully',
      data: {
        hotel_id: hotelId,
        gm_id: gmId,
      },
    });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create hotel',
    });
  }
});

/**
 * PUT /api/admin/hotels/:id
 * Update hotel
 */
router.put('/hotels/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.params.id;
    const { name, address, phone, email, license_status, license_expires_at } = req.body;

    const result = await query(
      `UPDATE hotels
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           license_status = COALESCE($5, license_status),
           license_expires_at = COALESCE($6, license_expires_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, address, phone, email, license_status, license_expires_at, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Hotel not found',
      });
    }

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update hotel',
    });
  }
});

/**
 * DELETE /api/admin/hotels/:id
 * Delete hotel (soft delete - set license_status to inactive)
 */
router.delete('/hotels/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.params.id;

    await query(
      `UPDATE hotels
       SET license_status = 'inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [hotelId]
    );

    // Deactivate all users
    await query(
      `UPDATE users
       SET is_active = false
       WHERE hotel_id = $1`,
      [hotelId]
    );

    res.json({
      success: true,
      message: 'Hotel deactivated successfully',
    });
  } catch (error) {
    console.error('Delete hotel error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete hotel',
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users (with filtering)
 */
router.get('/users', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { hotel_id, role } = req.query;

    let queryText = `
      SELECT
        u.id, u.email, u.first_name, u.last_name, u.role,
        u.hotel_id, h.name as hotel_name,
        u.department_id, d.name as department_name,
        u.phone, u.is_active, u.created_at
      FROM users u
      LEFT JOIN hotels h ON u.hotel_id = h.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.role != 'super_admin'
    `;

    const params: any[] = [];

    if (hotel_id) {
      params.push(hotel_id);
      queryText += ` AND u.hotel_id = $${params.length}`;
    }

    if (role) {
      params.push(role);
      queryText += ` AND u.role = $${params.length}`;
    }

    queryText += ' ORDER BY u.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get platform statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM hotels WHERE license_status = 'active') as active_hotels,
        (SELECT COUNT(*) FROM hotels) as total_hotels,
        (SELECT COUNT(*) FROM users WHERE role != 'super_admin' AND is_active = true) as active_users,
        (SELECT COUNT(*) FROM tasks WHERE created_at >= NOW() - INTERVAL '30 days') as tasks_last_30_days,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days') as completed_tasks_last_30_days,
        (SELECT AVG(rating) FROM ratings WHERE created_at >= NOW() - INTERVAL '30 days') as avg_rating_last_30_days
    `);

    res.json({
      success: true,
      data: stats.rows[0],
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

export default router;

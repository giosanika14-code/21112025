import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { enforceHotelIsolation, injectHotelFilter } from '../middleware/tenantIsolation';
import { AuthRequest, UserRole, ApiResponse } from '../types';

const router = Router();

// All routes require hotel admin authentication
router.use(authenticate);
router.use(authorize(UserRole.HOTEL_ADMIN));
router.use(enforceHotelIsolation);
router.use(injectHotelFilter);

// =====================================================
// KNOWLEDGE BASE
// =====================================================

/**
 * GET /api/hotel/knowledge-base
 * Get all knowledge base entries
 */
router.get('/knowledge-base', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const { category, language } = req.query;

    let queryText = `
      SELECT id, category, title, content, language, tags, is_active, created_at, updated_at
      FROM knowledge_base
      WHERE hotel_id = $1
    `;

    const params: any[] = [hotelId];

    if (category) {
      params.push(category);
      queryText += ` AND category = $${params.length}`;
    }

    if (language) {
      params.push(language);
      queryText += ` AND language = $${params.length}`;
    }

    queryText += ' ORDER BY category, title';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge base',
    });
  }
});

/**
 * POST /api/hotel/knowledge-base
 * Create new knowledge base entry
 */
router.post('/knowledge-base', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const { category, title, content, language, tags } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Category, title, and content are required',
      });
    }

    const kbId = uuidv4();

    await query(
      `INSERT INTO knowledge_base (id, hotel_id, category, title, content, language, tags, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [kbId, hotelId, category, title, content, language || 'en', tags || []]
    );

    res.status(201).json({
      success: true,
      message: 'Knowledge base entry created successfully',
      data: { kb_id: kbId },
    });
  } catch (error) {
    console.error('Create knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create knowledge base entry',
    });
  }
});

/**
 * PUT /api/hotel/knowledge-base/:id
 * Update knowledge base entry
 */
router.put('/knowledge-base/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const kbId = req.params.id;
    const { category, title, content, language, tags, is_active } = req.body;

    const result = await query(
      `UPDATE knowledge_base
       SET category = COALESCE($1, category),
           title = COALESCE($2, title),
           content = COALESCE($3, content),
           language = COALESCE($4, language),
           tags = COALESCE($5, tags),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND hotel_id = $8
       RETURNING *`,
      [category, title, content, language, tags, is_active, kbId, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base entry not found',
      });
    }

    res.json({
      success: true,
      message: 'Knowledge base entry updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update knowledge base entry',
    });
  }
});

/**
 * DELETE /api/hotel/knowledge-base/:id
 * Delete knowledge base entry
 */
router.delete('/knowledge-base/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const kbId = req.params.id;

    await query(
      'DELETE FROM knowledge_base WHERE id = $1 AND hotel_id = $2',
      [kbId, hotelId]
    );

    res.json({
      success: true,
      message: 'Knowledge base entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge base entry',
    });
  }
});

// =====================================================
// STAFF MANAGEMENT
// =====================================================

/**
 * GET /api/hotel/staff
 * Get all staff members
 */
router.get('/staff', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;

    const result = await query(
      `SELECT
        u.id, u.email, u.first_name, u.last_name, u.phone,
        u.department_id, d.name as department_name,
        u.is_active, u.created_at
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.hotel_id = $1 AND u.role = 'staff'
      ORDER BY u.first_name, u.last_name`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff',
    });
  }
});

/**
 * POST /api/hotel/staff
 * Create new staff member
 */
router.post('/staff', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const { email, password, first_name, last_name, phone, department_id } = req.body;

    if (!email || !password || !first_name || !last_name || !department_id) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    const staffId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (id, hotel_id, email, password_hash, first_name, last_name, phone, role, department_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'staff', $8, true)`,
      [staffId, hotelId, email.toLowerCase(), passwordHash, first_name, last_name, phone, department_id]
    );

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: { staff_id: staffId },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create staff member',
    });
  }
});

/**
 * PUT /api/hotel/staff/:id
 * Update staff member
 */
router.put('/staff/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const staffId = req.params.id;
    const { first_name, last_name, phone, department_id, is_active } = req.body;

    const result = await query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           department_id = COALESCE($4, department_id),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND hotel_id = $7 AND role = 'staff'
       RETURNING *`,
      [first_name, last_name, phone, department_id, is_active, staffId, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found',
      });
    }

    res.json({
      success: true,
      message: 'Staff member updated successfully',
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update staff member',
    });
  }
});

// =====================================================
// ANALYTICS & REPORTING
// =====================================================

/**
 * GET /api/hotel/analytics/overview
 * Get hotel analytics overview
 */
router.get('/analytics/overview', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;

    const stats = await query(
      `SELECT
        (SELECT COUNT(*) FROM tasks WHERE hotel_id = $1 AND created_at >= NOW() - INTERVAL '30 days') as tasks_last_30_days,
        (SELECT COUNT(*) FROM tasks WHERE hotel_id = $1 AND status = 'completed' AND created_at >= NOW() - INTERVAL '30 days') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE hotel_id = $1 AND status = 'new') as pending_tasks,
        (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60)
         FROM tasks
         WHERE hotel_id = $1 AND status = 'completed' AND created_at >= NOW() - INTERVAL '30 days') as avg_completion_time_minutes,
        (SELECT AVG(rating)
         FROM ratings r
         JOIN tasks t ON r.task_id = t.id
         WHERE t.hotel_id = $1 AND r.created_at >= NOW() - INTERVAL '30 days') as avg_rating,
        (SELECT COUNT(*) FROM rooms WHERE hotel_id = $1 AND is_active = true) as active_rooms,
        (SELECT COUNT(*) FROM users WHERE hotel_id = $1 AND role = 'staff' AND is_active = true) as active_staff
      `,
      [hotelId]
    );

    res.json({
      success: true,
      data: stats.rows[0],
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
});

/**
 * GET /api/hotel/analytics/departments
 * Get department performance
 */
router.get('/analytics/departments', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;

    const result = await query(
      `SELECT
        d.id, d.name,
        COUNT(t.id) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        AVG(CASE WHEN t.status = 'completed' THEN EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/60 END) as avg_completion_time,
        AVG(r.rating) as avg_rating
      FROM departments d
      LEFT JOIN tasks t ON d.id = t.department_id AND t.created_at >= NOW() - INTERVAL '30 days'
      LEFT JOIN ratings r ON t.id = r.task_id
      WHERE d.hotel_id = $1 AND d.is_active = true
      GROUP BY d.id, d.name
      ORDER BY d.name`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get department analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department analytics',
    });
  }
});

/**
 * GET /api/hotel/analytics/tasks
 * Get task statistics over time
 */
router.get('/analytics/tasks', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const { days = 30 } = req.query;

    const result = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new
      FROM tasks
      WHERE hotel_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get task analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task analytics',
    });
  }
});

export default router;

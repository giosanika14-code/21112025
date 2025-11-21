import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { enforceHotelIsolation, injectHotelFilter } from '../middleware/tenantIsolation';
import { AuthRequest, UserRole, ApiResponse } from '../types';
import { QRCodeService } from '../services/qrCodeService';
import { TelegramService } from '../services/telegramService';

const router = Router();

// All routes require hotel admin authentication
router.use(authenticate);
router.use(authorize(UserRole.HOTEL_ADMIN));
router.use(enforceHotelIsolation);
router.use(injectHotelFilter);

// =====================================================
// DEPARTMENTS
// =====================================================

/**
 * GET /api/hotel/departments
 * Get all departments for hotel
 */
router.get('/departments', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;

    const result = await query(
      `SELECT
        id, name, type, telegram_group_id, description, is_active,
        created_at, updated_at,
        (SELECT COUNT(*) FROM users WHERE department_id = departments.id) as staff_count,
        (SELECT COUNT(*) FROM tasks WHERE department_id = departments.id) as task_count
      FROM departments
      WHERE hotel_id = $1
      ORDER BY name`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
    });
  }
});

/**
 * POST /api/hotel/departments
 * Create new department
 */
router.post('/departments', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const { name, type, telegram_group_id, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    const departmentId = uuidv4();

    await query(
      `INSERT INTO departments (id, hotel_id, name, type, telegram_group_id, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [departmentId, hotelId, name, type, telegram_group_id, description]
    );

    // Send welcome message to Telegram group if configured
    if (telegram_group_id) {
      const hotelResult = await query('SELECT name FROM hotels WHERE id = $1', [hotelId]);
      if (hotelResult.rows.length > 0) {
        await TelegramService.sendWelcomeMessage(
          telegram_group_id,
          hotelResult.rows[0].name,
          name
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { department_id: departmentId },
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create department',
    });
  }
});

/**
 * PUT /api/hotel/departments/:id
 * Update department
 */
router.put('/departments/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const departmentId = req.params.id;
    const { name, type, telegram_group_id, description, is_active } = req.body;

    const result = await query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           telegram_group_id = COALESCE($3, telegram_group_id),
           description = COALESCE($4, description),
           is_active = COALESCE($5, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND hotel_id = $7
       RETURNING *`,
      [name, type, telegram_group_id, description, is_active, departmentId, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found',
      });
    }

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update department',
    });
  }
});

/**
 * POST /api/hotel/departments/:id/test-telegram
 * Test Telegram group connection
 */
router.post('/departments/:id/test-telegram', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const departmentId = req.params.id;

    const result = await query(
      'SELECT telegram_group_id FROM departments WHERE id = $1 AND hotel_id = $2',
      [departmentId, hotelId]
    );

    if (result.rows.length === 0 || !result.rows[0].telegram_group_id) {
      return res.status(400).json({
        success: false,
        error: 'No Telegram group configured for this department',
      });
    }

    const success = await TelegramService.testGroupConnection(
      result.rows[0].telegram_group_id
    );

    if (success) {
      res.json({
        success: true,
        message: 'Telegram connection successful',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to connect to Telegram group',
      });
    }
  } catch (error) {
    console.error('Test Telegram error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Telegram connection',
    });
  }
});

// =====================================================
// ROOMS
// =====================================================

/**
 * GET /api/hotel/rooms
 * Get all rooms
 */
router.get('/rooms', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;

    const result = await query(
      `SELECT
        id, room_number, floor, room_type, qr_code, qr_code_url,
        is_active, created_at, updated_at
      FROM rooms
      WHERE hotel_id = $1
      ORDER BY room_number`,
      [hotelId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms',
    });
  }
});

/**
 * POST /api/hotel/rooms
 * Create new room with QR code
 */
router.post('/rooms', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id!;
    const { room_number, floor, room_type } = req.body;

    if (!room_number) {
      return res.status(400).json({
        success: false,
        error: 'Room number is required',
      });
    }

    // Check if room number already exists
    const existing = await query(
      'SELECT id FROM rooms WHERE hotel_id = $1 AND room_number = $2',
      [hotelId, room_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Room with this number already exists',
      });
    }

    const roomId = uuidv4();

    // Generate QR code
    const qrData = await QRCodeService.generateRoomQRCode(
      hotelId,
      roomId,
      room_number
    );

    // Create room
    await query(
      `INSERT INTO rooms (id, hotel_id, room_number, floor, room_type, qr_code, qr_code_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [roomId, hotelId, room_number, floor, room_type, qrData.qr_code, qrData.qr_data_url]
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        room_id: roomId,
        qr_code: qrData.qr_code,
        qr_data_url: qrData.qr_data_url,
      },
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room',
    });
  }
});

/**
 * PUT /api/hotel/rooms/:id
 * Update room
 */
router.put('/rooms/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const roomId = req.params.id;
    const { room_number, floor, room_type, is_active } = req.body;

    const result = await query(
      `UPDATE rooms
       SET room_number = COALESCE($1, room_number),
           floor = COALESCE($2, floor),
           room_type = COALESCE($3, room_type),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND hotel_id = $6
       RETURNING *`,
      [room_number, floor, room_type, is_active, roomId, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Room not found',
      });
    }

    res.json({
      success: true,
      message: 'Room updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room',
    });
  }
});

/**
 * POST /api/hotel/rooms/:id/regenerate-qr
 * Regenerate QR code for room
 */
router.post('/rooms/:id/regenerate-qr', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id!;
    const roomId = req.params.id;

    const qrData = await QRCodeService.regenerateRoomQRCode(hotelId, roomId);

    res.json({
      success: true,
      message: 'QR code regenerated successfully',
      data: qrData,
    });
  } catch (error) {
    console.error('Regenerate QR error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR code',
    });
  }
});

// Continued in next file...
export default router;

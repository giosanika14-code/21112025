import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { enforceHotelIsolation, enforceDepartmentIsolation } from '../middleware/tenantIsolation';
import { AuthRequest, UserRole, ApiResponse, TaskStatus } from '../types';
import { broadcastTaskUpdated, broadcastTaskCompleted, broadcastMessageToGuest } from '../websocket/socketManager';
import { TelegramService } from '../services/telegramService';

const router = Router();

// All routes require staff authentication
router.use(authenticate);
router.use(authorize(UserRole.STAFF, UserRole.HOTEL_ADMIN));
router.use(enforceHotelIsolation);
router.use(enforceDepartmentIsolation);

/**
 * GET /api/staff/tasks
 * Get tasks for staff member's department
 */
router.get('/tasks', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const departmentId = req.user!.department_id;
    const userId = req.user!.id;
    const { status } = req.query;

    let queryText = `
      SELECT
        t.id, t.title, t.description, t.original_message, t.status, t.priority,
        t.assigned_to, t.created_at, t.accepted_at, t.started_at, t.completed_at,
        r.room_number,
        d.name as department_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM tasks t
      JOIN rooms r ON t.room_id = r.id
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.hotel_id = $1
    `;

    const params: any[] = [hotelId];

    // Hotel admins see all tasks, staff only see their department's tasks
    if (req.user!.role === UserRole.STAFF) {
      params.push(departmentId);
      queryText += ` AND t.department_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      queryText += ` AND t.status = $${params.length}`;
    }

    queryText += ' ORDER BY t.priority DESC, t.created_at DESC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
    });
  }
});

/**
 * GET /api/staff/tasks/:id
 * Get task details
 */
router.get('/tasks/:id', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const departmentId = req.user!.department_id;
    const taskId = req.params.id;

    let queryText = `
      SELECT
        t.id, t.title, t.description, t.original_message, t.status, t.priority,
        t.assigned_to, t.created_at, t.accepted_at, t.started_at, t.completed_at,
        t.guest_session_id,
        r.id as room_id, r.room_number,
        d.name as department_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM tasks t
      JOIN rooms r ON t.room_id = r.id
      JOIN departments d ON t.department_id = d.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1 AND t.hotel_id = $2
    `;

    const params: any[] = [taskId, hotelId];

    // Staff can only see tasks from their department
    if (req.user!.role === UserRole.STAFF) {
      params.push(departmentId);
      queryText += ` AND t.department_id = $${params.length}`;
    }

    const result = await query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
    });
  }
});

/**
 * PUT /api/staff/tasks/:id/accept
 * Accept a task
 */
router.put('/tasks/:id/accept', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const userId = req.user!.id;
    const taskId = req.params.id;

    const result = await query(
      `UPDATE tasks
       SET status = $1,
           assigned_to = $2,
           accepted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND hotel_id = $4 AND status = 'new'
       RETURNING *, (SELECT room_number FROM rooms WHERE id = tasks.room_id) as room_number`,
      [TaskStatus.ACCEPTED, userId, taskId, hotelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or already accepted',
      });
    }

    const task = result.rows[0];

    // Broadcast update
    broadcastTaskUpdated(hotelId, task.department_id, task);

    // Notify guest
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content)
       VALUES (uuid_generate_v4(), $1, $2, $3, 'ai', $4)`,
      [
        hotelId,
        task.guest_session_id,
        task.room_id,
        `Your request has been accepted by our ${task.department_name} team. We'll handle it shortly.`,
      ]
    );

    res.json({
      success: true,
      message: 'Task accepted successfully',
      data: task,
    });
  } catch (error) {
    console.error('Accept task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept task',
    });
  }
});

/**
 * PUT /api/staff/tasks/:id/start
 * Start working on a task
 */
router.put('/tasks/:id/start', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const userId = req.user!.id;
    const taskId = req.params.id;

    const result = await query(
      `UPDATE tasks
       SET status = $1,
           started_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND hotel_id = $3 AND assigned_to = $4 AND status = 'accepted'
       RETURNING *, (SELECT room_number FROM rooms WHERE id = tasks.room_id) as room_number`,
      [TaskStatus.IN_PROGRESS, taskId, hotelId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or cannot be started',
      });
    }

    const task = result.rows[0];

    // Broadcast update
    broadcastTaskUpdated(hotelId, task.department_id, task);

    // Notify guest
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content)
       VALUES (uuid_generate_v4(), $1, $2, $3, 'ai', $4)`,
      [
        hotelId,
        task.guest_session_id,
        task.room_id,
        `Our team is now working on your request. We'll notify you when it's complete.`,
      ]
    );

    res.json({
      success: true,
      message: 'Task started successfully',
      data: task,
    });
  } catch (error) {
    console.error('Start task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start task',
    });
  }
});

/**
 * PUT /api/staff/tasks/:id/complete
 * Complete a task
 */
router.put('/tasks/:id/complete', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const hotelId = req.user!.hotel_id;
    const userId = req.user!.id;
    const taskId = req.params.id;

    const result = await query(
      `UPDATE tasks
       SET status = $1,
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND hotel_id = $3 AND assigned_to = $4 AND status = 'in_progress'
       RETURNING *, (SELECT room_number FROM rooms WHERE id = tasks.room_id) as room_number`,
      [TaskStatus.COMPLETED, taskId, hotelId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or cannot be completed',
      });
    }

    const task = result.rows[0];

    // Broadcast completion
    broadcastTaskCompleted(hotelId, task.department_id, task.guest_session_id, task);

    // Notify guest with completion message and rating request
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content, task_id)
       VALUES (uuid_generate_v4(), $1, $2, $3, 'ai', $4, $5)`,
      [
        hotelId,
        task.guest_session_id,
        task.room_id,
        `✅ Your request has been completed! We hope everything is to your satisfaction. Please rate your experience.`,
        taskId,
      ]
    );

    res.json({
      success: true,
      message: 'Task completed successfully',
      data: task,
    });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete task',
    });
  }
});

/**
 * GET /api/staff/my-stats
 * Get staff member's performance statistics
 */
router.get('/my-stats', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const userId = req.user!.id;
    const hotelId = req.user!.hotel_id;

    const stats = await query(
      `SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        AVG(CASE WHEN status = 'completed' THEN EXTRACT(EPOCH FROM (completed_at - accepted_at))/60 END) as avg_completion_time,
        (SELECT AVG(rating)
         FROM ratings r
         JOIN tasks t ON r.task_id = t.id
         WHERE t.assigned_to = $1 AND r.created_at >= NOW() - INTERVAL '30 days') as avg_rating
      FROM tasks
      WHERE assigned_to = $1 AND hotel_id = $2 AND created_at >= NOW() - INTERVAL '30 days'
    `,
      [userId, hotelId]
    );

    res.json({
      success: true,
      data: stats.rows[0],
    });
  } catch (error) {
    console.error('Get staff stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

export default router;

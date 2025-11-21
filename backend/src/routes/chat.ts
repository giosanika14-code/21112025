import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { AuthRequest, ApiResponse, MessageSender } from '../types';
import { QRCodeService } from '../services/qrCodeService';
import { AIService } from '../services/aiService';
import { TelegramService } from '../services/telegramService';
import { broadcastTaskCreated, broadcastMessageToGuest } from '../websocket/socketManager';

const router = Router();

/**
 * POST /api/chat/init
 * Initialize chat session with QR code
 */
router.post('/init', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { qr_code } = req.body;

    if (!qr_code) {
      return res.status(400).json({
        success: false,
        error: 'QR code is required',
      });
    }

    // Validate QR code and get room details
    const roomDetails = await QRCodeService.validateAndGetRoom(qr_code);

    if (!roomDetails) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired QR code',
      });
    }

    // Create or get existing guest session
    const sessionToken = uuidv4();
    const sessionId = uuidv4();

    await query(
      `INSERT INTO guest_sessions (id, hotel_id, room_id, qr_code, session_token, started_at, last_activity_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [sessionId, roomDetails.hotel_id, roomDetails.room_id, qr_code, sessionToken]
    );

    // Send welcome message
    const welcomeMessageId = uuidv4();
    const welcomeMessage = `Welcome to ${roomDetails.hotel_name}! I'm your AI concierge assistant. How can I help you today?`;

    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        welcomeMessageId,
        roomDetails.hotel_id,
        sessionId,
        roomDetails.room_id,
        MessageSender.AI,
        welcomeMessage,
      ]
    );

    res.json({
      success: true,
      data: {
        session_token: sessionToken,
        session_id: sessionId,
        hotel_id: roomDetails.hotel_id,
        hotel_name: roomDetails.hotel_name,
        room_number: roomDetails.room_number,
        welcome_message: welcomeMessage,
      },
    });
  } catch (error) {
    console.error('Chat init error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize chat session',
    });
  }
});

/**
 * POST /api/chat/message
 * Send message from guest
 */
router.post('/message', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { session_token, message } = req.body;

    if (!session_token || !message) {
      return res.status(400).json({
        success: false,
        error: 'Session token and message are required',
      });
    }

    // Get session details
    const sessionResult = await query(
      `SELECT
        gs.id, gs.hotel_id, gs.room_id, gs.language_preference,
        h.name as hotel_name,
        r.room_number
      FROM guest_sessions gs
      JOIN hotels h ON gs.hotel_id = h.id
      JOIN rooms r ON gs.room_id = r.id
      WHERE gs.session_token = $1 AND gs.ended_at IS NULL`,
      [session_token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
    }

    const session = sessionResult.rows[0];

    // Detect language if not set
    let language = session.language_preference;
    if (!language) {
      language = await AIService.detectLanguage(message);
      await query(
        'UPDATE guest_sessions SET language_preference = $1 WHERE id = $2',
        [language, session.id]
      );
    }

    // Save guest message
    const guestMessageId = uuidv4();
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content, original_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        guestMessageId,
        session.hotel_id,
        session.id,
        session.room_id,
        MessageSender.GUEST,
        message,
        language,
      ]
    );

    // Get conversation history
    const historyResult = await query(
      `SELECT sender_type, content
       FROM messages
       WHERE guest_session_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [session.id]
    );

    const conversationHistory = historyResult.rows.reverse().map((msg) => ({
      role: msg.sender_type === MessageSender.GUEST ? 'user' as const : 'assistant' as const,
      content: msg.content,
    }));

    // Generate AI response
    const aiResponse = await AIService.generateGuestResponse(
      message,
      session.hotel_id,
      conversationHistory,
      language
    );

    // Save AI response
    const aiMessageId = uuidv4();
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content, original_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        aiMessageId,
        session.hotel_id,
        session.id,
        session.room_id,
        MessageSender.AI,
        aiResponse.message,
        language,
      ]
    );

    // If task required, create task
    let taskId = null;
    if (aiResponse.requires_task && aiResponse.task_info) {
      const taskInfo = aiResponse.task_info;

      // Get department ID
      const deptResult = await query(
        `SELECT id FROM departments
         WHERE hotel_id = $1 AND type = $2 AND is_active = true
         LIMIT 1`,
        [session.hotel_id, taskInfo.department_type]
      );

      if (deptResult.rows.length > 0) {
        const departmentId = deptResult.rows[0].id;
        taskId = uuidv4();

        // Create task
        await query(
          `INSERT INTO tasks (
            id, hotel_id, room_id, department_id, guest_session_id,
            title, description, original_message, status, priority
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9)`,
          [
            taskId,
            session.hotel_id,
            session.room_id,
            departmentId,
            session.id,
            taskInfo.title,
            taskInfo.summary,
            message,
            taskInfo.priority,
          ]
        );

        // Link AI message to task
        await query(
          'UPDATE messages SET task_id = $1 WHERE id = $2',
          [taskId, aiMessageId]
        );

        // Send Telegram notification
        await TelegramService.sendTaskNotification({
          hotel_id: session.hotel_id,
          department_id: departmentId,
          task_id: taskId,
          room_number: session.room_number,
          message: message,
          priority: taskInfo.priority,
        });

        // Broadcast task created
        broadcastTaskCreated(session.hotel_id, departmentId, {
          task_id: taskId,
          room_number: session.room_number,
          title: taskInfo.title,
          priority: taskInfo.priority,
        });
      }
    }

    res.json({
      success: true,
      data: {
        message_id: aiMessageId,
        content: aiResponse.message,
        language: aiResponse.language,
        task_created: !!taskId,
        task_id: taskId,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
    });
  }
});

/**
 * GET /api/chat/messages
 * Get chat history for session
 */
router.get('/messages', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { session_token } = req.query;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        error: 'Session token is required',
      });
    }

    // Get session
    const sessionResult = await query(
      'SELECT id FROM guest_sessions WHERE session_token = $1 AND ended_at IS NULL',
      [session_token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
    }

    const sessionId = sessionResult.rows[0].id;

    // Get messages
    const result = await query(
      `SELECT
        id, sender_type, content, task_id, created_at
      FROM messages
      WHERE guest_session_id = $1
      ORDER BY created_at ASC`,
      [sessionId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
    });
  }
});

/**
 * POST /api/chat/rate
 * Submit rating for completed task
 */
router.post('/rate', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { session_token, task_id, rating, comment } = req.body;

    if (!session_token || !task_id || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Session token, task ID, and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Get session
    const sessionResult = await query(
      'SELECT id, hotel_id FROM guest_sessions WHERE session_token = $1',
      [session_token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid session',
      });
    }

    const session = sessionResult.rows[0];

    // Check if task exists and is completed
    const taskResult = await query(
      `SELECT id FROM tasks
       WHERE id = $1 AND guest_session_id = $2 AND status = 'completed'`,
      [task_id, session.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task not found or not completed',
      });
    }

    // Check if rating already exists
    const existingRating = await query(
      'SELECT id FROM ratings WHERE task_id = $1',
      [task_id]
    );

    if (existingRating.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Task already rated',
      });
    }

    // Create rating
    const ratingId = uuidv4();
    await query(
      `INSERT INTO ratings (id, hotel_id, task_id, guest_session_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [ratingId, session.hotel_id, task_id, session.id, rating, comment]
    );

    // Send thank you message
    await query(
      `INSERT INTO messages (id, hotel_id, guest_session_id, room_id, sender_type, content)
       VALUES (
         uuid_generate_v4(),
         $1,
         $2,
         (SELECT room_id FROM guest_sessions WHERE id = $2),
         'ai',
         'Thank you for your feedback! We truly appreciate it. 🙏'
       )`,
      [session.hotel_id, session.id]
    );

    res.json({
      success: true,
      message: 'Rating submitted successfully',
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating',
    });
  }
});

/**
 * POST /api/chat/end
 * End chat session
 */
router.post('/end', async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { session_token } = req.body;

    if (!session_token) {
      return res.status(400).json({
        success: false,
        error: 'Session token is required',
      });
    }

    await query(
      'UPDATE guest_sessions SET ended_at = CURRENT_TIMESTAMP WHERE session_token = $1',
      [session_token]
    );

    res.json({
      success: true,
      message: 'Session ended successfully',
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session',
    });
  }
});

export default router;

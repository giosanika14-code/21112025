import TelegramBot from 'node-telegram-bot-api';
import { TelegramNotification } from '../types';
import { query } from '../config/database';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

let bot: TelegramBot | null = null;

/**
 * Initialize Telegram Bot
 */
export const initializeTelegramBot = () => {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('⚠️  Telegram bot token not configured. Notifications will not be sent.');
    return;
  }

  try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Telegram bot initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Telegram bot:', error);
  }
};

/**
 * Telegram Service for sending notifications
 */
export class TelegramService {
  /**
   * Send task notification to department group
   */
  static async sendTaskNotification(
    notification: TelegramNotification
  ): Promise<boolean> {
    if (!bot) {
      console.warn('Telegram bot not initialized. Notification not sent.');
      return false;
    }

    try {
      // Get department's Telegram group ID
      const department = await query(
        `SELECT telegram_group_id, name
         FROM departments
         WHERE id = $1 AND hotel_id = $2`,
        [notification.department_id, notification.hotel_id]
      );

      if (department.rows.length === 0 || !department.rows[0].telegram_group_id) {
        console.warn(
          `No Telegram group configured for department ${notification.department_id}`
        );
        return false;
      }

      const groupId = department.rows[0].telegram_group_id;
      const departmentName = department.rows[0].name;

      // Format message
      const message = this.formatTaskMessage(
        departmentName,
        notification.room_number,
        notification.message,
        notification.priority,
        notification.task_id
      );

      // Send message
      await bot.sendMessage(groupId, message, {
        parse_mode: 'HTML',
      });

      console.log(`✅ Telegram notification sent to group ${groupId}`);
      return true;
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
      return false;
    }
  }

  /**
   * Send task update notification
   */
  static async sendTaskUpdateNotification(
    hotelId: string,
    departmentId: string,
    taskId: string,
    roomNumber: string,
    status: string,
    updatedBy: string
  ): Promise<boolean> {
    if (!bot) {
      return false;
    }

    try {
      const department = await query(
        `SELECT telegram_group_id, name
         FROM departments
         WHERE id = $1 AND hotel_id = $2`,
        [departmentId, hotelId]
      );

      if (department.rows.length === 0 || !department.rows[0].telegram_group_id) {
        return false;
      }

      const groupId = department.rows[0].telegram_group_id;

      const message = `
🔄 <b>Task Update</b>

Room: <b>${roomNumber}</b>
Status: <b>${status.toUpperCase()}</b>
Updated by: ${updatedBy}
Task ID: <code>${taskId}</code>
`;

      await bot.sendMessage(groupId, message, {
        parse_mode: 'HTML',
      });

      return true;
    } catch (error) {
      console.error('Error sending task update notification:', error);
      return false;
    }
  }

  /**
   * Format task message for Telegram
   */
  private static formatTaskMessage(
    departmentName: string,
    roomNumber: string,
    message: string,
    priority: string,
    taskId: string
  ): string {
    const priorityEmoji = this.getPriorityEmoji(priority);

    return `
${priorityEmoji} <b>New Task - ${departmentName}</b>

🏠 Room: <b>${roomNumber}</b>
📋 Priority: <b>${priority.toUpperCase()}</b>

💬 <i>${message}</i>

🆔 Task ID: <code>${taskId}</code>

⏰ Created: ${new Date().toLocaleString()}

<i>Please check the Staff Portal to accept and manage this task.</i>
`;
  }

  /**
   * Get priority emoji
   */
  private static getPriorityEmoji(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '📌';
    }
  }

  /**
   * Test Telegram group connection
   */
  static async testGroupConnection(groupId: string): Promise<boolean> {
    if (!bot) {
      throw new Error('Telegram bot not initialized');
    }

    try {
      await bot.sendMessage(
        groupId,
        '✅ Connection successful! This group is now configured for task notifications.',
        { parse_mode: 'HTML' }
      );
      return true;
    } catch (error) {
      console.error('Error testing Telegram group:', error);
      return false;
    }
  }

  /**
   * Send welcome message to group
   */
  static async sendWelcomeMessage(
    groupId: string,
    hotelName: string,
    departmentName: string
  ): Promise<boolean> {
    if (!bot) {
      return false;
    }

    try {
      const message = `
🏨 <b>Welcome to ${hotelName}</b>

This Telegram group is now connected to the <b>${departmentName}</b> department.

You will receive real-time notifications for:
✅ New tasks from guests
🔄 Task status updates
⭐ Guest feedback

To manage tasks, please use the Staff Portal.
`;

      await bot.sendMessage(groupId, message, {
        parse_mode: 'HTML',
      });

      return true;
    } catch (error) {
      console.error('Error sending welcome message:', error);
      return false;
    }
  }
}

// Initialize bot on module load
initializeTelegramBot();

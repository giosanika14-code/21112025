import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { WebSocketEvent, WebSocketMessage, UserRole } from '../types';

let io: Server | null = null;

/**
 * Initialize WebSocket server
 */
export const initializeWebSocket = (httpServer: HTTPServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io',
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const user = verifyToken(token);
      socket.data.user = user;

      next();
    } catch (error) {
      next(new Error('Invalid authentication token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    console.log(`✅ Client connected: ${user.id} (${user.role})`);

    // Join hotel-specific room
    if (user.hotel_id) {
      socket.join(`hotel:${user.hotel_id}`);
      console.log(`User ${user.id} joined hotel room: ${user.hotel_id}`);
    }

    // Join department-specific room for staff
    if (user.role === UserRole.STAFF && user.department_id) {
      socket.join(`department:${user.department_id}`);
      console.log(`User ${user.id} joined department room: ${user.department_id}`);
    }

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${user.id}`);
    });

    // Handle task updates from staff
    socket.on('task:update', (data) => {
      handleTaskUpdate(socket, data);
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      handleTypingStart(socket, data);
    });

    socket.on('typing:stop', (data) => {
      handleTypingStop(socket, data);
    });
  });

  console.log('✅ WebSocket server initialized');
  return io;
};

/**
 * Get Socket.io server instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
};

/**
 * Emit event to hotel room
 */
export const emitToHotel = (
  hotelId: string,
  event: WebSocketEvent,
  data: any
) => {
  if (!io) return;

  const message: WebSocketMessage = {
    event,
    data,
    hotel_id: hotelId,
    timestamp: new Date(),
  };

  io.to(`hotel:${hotelId}`).emit(event, message);
  console.log(`📡 Emitted ${event} to hotel:${hotelId}`);
};

/**
 * Emit event to department room
 */
export const emitToDepartment = (
  departmentId: string,
  event: WebSocketEvent,
  data: any
) => {
  if (!io) return;

  const message: WebSocketMessage = {
    event,
    data,
    hotel_id: data.hotel_id,
    timestamp: new Date(),
  };

  io.to(`department:${departmentId}`).emit(event, message);
  console.log(`📡 Emitted ${event} to department:${departmentId}`);
};

/**
 * Emit event to specific user
 */
export const emitToUser = (
  userId: string,
  event: WebSocketEvent,
  data: any
) => {
  if (!io) return;

  const message: WebSocketMessage = {
    event,
    data,
    hotel_id: data.hotel_id,
    timestamp: new Date(),
  };

  io.to(`user:${userId}`).emit(event, message);
  console.log(`📡 Emitted ${event} to user:${userId}`);
};

/**
 * Emit event to guest session (for chat)
 */
export const emitToGuestSession = (
  sessionId: string,
  event: string,
  data: any
) => {
  if (!io) return;

  io.to(`guest:${sessionId}`).emit(event, data);
  console.log(`📡 Emitted ${event} to guest:${sessionId}`);
};

/**
 * Handle task update from staff
 */
const handleTaskUpdate = (socket: Socket, data: any) => {
  const user = socket.data.user;

  console.log(`Task update from user ${user.id}:`, data);

  // Broadcast to hotel room
  if (user.hotel_id) {
    emitToHotel(user.hotel_id, WebSocketEvent.TASK_UPDATED, {
      ...data,
      updated_by: user.id,
    });
  }
};

/**
 * Handle typing start
 */
const handleTypingStart = (socket: Socket, data: any) => {
  const user = socket.data.user;

  // Broadcast to the conversation
  if (data.guest_session_id) {
    socket.to(`guest:${data.guest_session_id}`).emit('typing:start', {
      user_id: user.id,
      user_name: `${user.first_name} ${user.last_name}`,
    });
  }
};

/**
 * Handle typing stop
 */
const handleTypingStop = (socket: Socket, data: any) => {
  const user = socket.data.user;

  if (data.guest_session_id) {
    socket.to(`guest:${data.guest_session_id}`).emit('typing:stop', {
      user_id: user.id,
    });
  }
};

/**
 * Broadcast task created event
 */
export const broadcastTaskCreated = (
  hotelId: string,
  departmentId: string,
  taskData: any
) => {
  emitToHotel(hotelId, WebSocketEvent.TASK_CREATED, taskData);
  emitToDepartment(departmentId, WebSocketEvent.TASK_CREATED, taskData);
};

/**
 * Broadcast task updated event
 */
export const broadcastTaskUpdated = (
  hotelId: string,
  departmentId: string,
  taskData: any
) => {
  emitToHotel(hotelId, WebSocketEvent.TASK_UPDATED, taskData);
  emitToDepartment(departmentId, WebSocketEvent.TASK_UPDATED, taskData);
};

/**
 * Broadcast task assigned event
 */
export const broadcastTaskAssigned = (
  hotelId: string,
  departmentId: string,
  userId: string,
  taskData: any
) => {
  emitToHotel(hotelId, WebSocketEvent.TASK_ASSIGNED, taskData);
  emitToDepartment(departmentId, WebSocketEvent.TASK_ASSIGNED, taskData);
  emitToUser(userId, WebSocketEvent.TASK_ASSIGNED, taskData);
};

/**
 * Broadcast task completed event
 */
export const broadcastTaskCompleted = (
  hotelId: string,
  departmentId: string,
  guestSessionId: string,
  taskData: any
) => {
  emitToHotel(hotelId, WebSocketEvent.TASK_COMPLETED, taskData);
  emitToDepartment(departmentId, WebSocketEvent.TASK_COMPLETED, taskData);
  emitToGuestSession(guestSessionId, WebSocketEvent.TASK_COMPLETED, taskData);
};

/**
 * Broadcast message to guest
 */
export const broadcastMessageToGuest = (
  guestSessionId: string,
  messageData: any
) => {
  emitToGuestSession(guestSessionId, WebSocketEvent.MESSAGE_RECEIVED, messageData);
};

export default {
  initializeWebSocket,
  getIO,
  emitToHotel,
  emitToDepartment,
  emitToUser,
  emitToGuestSession,
  broadcastTaskCreated,
  broadcastTaskUpdated,
  broadcastTaskAssigned,
  broadcastTaskCompleted,
  broadcastMessageToGuest,
};

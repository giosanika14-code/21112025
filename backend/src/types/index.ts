import { Request } from 'express';

// User Roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  HOTEL_ADMIN = 'hotel_admin',
  STAFF = 'staff',
  GUEST = 'guest',
}

// Task Status
export enum TaskStatus {
  NEW = 'new',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

// Department Types (can be customized per hotel)
export enum DepartmentType {
  HOUSEKEEPING = 'housekeeping',
  MAINTENANCE = 'maintenance',
  FRONT_DESK = 'front_desk',
  CONCIERGE = 'concierge',
  ROOM_SERVICE = 'room_service',
  IT = 'it',
  OTHER = 'other',
}

// Message Sender Type
export enum MessageSender {
  GUEST = 'guest',
  AI = 'ai',
  STAFF = 'staff',
}

// Database Models
export interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  license_status: 'active' | 'inactive' | 'suspended';
  license_expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  hotel_id: string | null; // null for super_admin
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department_id: string | null; // for staff
  phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Department {
  id: string;
  hotel_id: string;
  name: string;
  type: DepartmentType;
  telegram_group_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  floor: number | null;
  room_type: string | null;
  qr_code: string; // unique identifier for QR code
  qr_code_url: string | null; // generated QR code image URL
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: string;
  hotel_id: string;
  room_id: string;
  department_id: string;
  guest_session_id: string; // identifies the guest session
  title: string;
  description: string;
  original_message: string; // original guest request
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null; // staff user_id
  created_at: Date;
  accepted_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  updated_at: Date;
}

export interface Message {
  id: string;
  hotel_id: string;
  guest_session_id: string;
  room_id: string;
  sender_type: MessageSender;
  sender_id: string | null; // user_id if staff
  content: string;
  original_language: string | null;
  translated_content: string | null;
  task_id: string | null;
  created_at: Date;
}

export interface Rating {
  id: string;
  hotel_id: string;
  task_id: string;
  guest_session_id: string;
  rating: number; // 1-5
  comment: string | null;
  created_at: Date;
}

export interface KnowledgeBase {
  id: string;
  hotel_id: string;
  category: string;
  title: string;
  content: string;
  language: string;
  tags: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GuestSession {
  id: string;
  hotel_id: string;
  room_id: string;
  qr_code: string;
  session_token: string;
  language_preference: string | null;
  started_at: Date;
  last_activity_at: Date;
  ended_at: Date | null;
}

// Request with authenticated user
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    hotel_id: string | null;
    department_id: string | null;
  };
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// WebSocket Event Types
export enum WebSocketEvent {
  TASK_CREATED = 'task:created',
  TASK_UPDATED = 'task:updated',
  TASK_ASSIGNED = 'task:assigned',
  TASK_COMPLETED = 'task:completed',
  MESSAGE_RECEIVED = 'message:received',
  STAFF_JOINED = 'staff:joined',
  STAFF_LEFT = 'staff:left',
}

export interface WebSocketMessage {
  event: WebSocketEvent;
  data: any;
  hotel_id: string;
  timestamp: Date;
}

// AI/LLM Types
export interface AIAnalysisResult {
  department_type: DepartmentType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  summary: string;
  confidence: number;
}

export interface AIResponse {
  message: string;
  language: string;
  requires_task: boolean;
  task_info?: AIAnalysisResult;
}

// Telegram Types
export interface TelegramNotification {
  hotel_id: string;
  department_id: string;
  task_id: string;
  room_number: string;
  message: string;
  priority: string;
}

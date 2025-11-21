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

// API Response
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  hotel_id: string | null;
  hotel_name?: string;
  department_id: string | null;
  department_name?: string;
  phone?: string;
  is_active: boolean;
}

// Auth
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Hotel
export interface Hotel {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  license_status: 'active' | 'inactive' | 'suspended';
  license_expires_at: string;
  user_count?: number;
  room_count?: number;
  created_at: string;
  updated_at: string;
}

// Department
export interface Department {
  id: string;
  hotel_id: string;
  name: string;
  type: string;
  telegram_group_id: string | null;
  description: string | null;
  is_active: boolean;
  staff_count?: number;
  task_count?: number;
  created_at: string;
  updated_at: string;
}

// Room
export interface Room {
  id: string;
  hotel_id: string;
  room_number: string;
  floor: number | null;
  room_type: string | null;
  qr_code: string;
  qr_code_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Task
export interface Task {
  id: string;
  hotel_id: string;
  room_id: string;
  room_number: string;
  department_id: string;
  department_name: string;
  guest_session_id: string;
  title: string;
  description: string;
  original_message: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

// Message
export interface Message {
  id: string;
  sender_type: 'guest' | 'ai' | 'staff';
  content: string;
  task_id: string | null;
  created_at: string;
}

// Knowledge Base
export interface KnowledgeBase {
  id: string;
  hotel_id: string;
  category: string;
  title: string;
  content: string;
  language: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Staff
export interface Staff {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  department_id: string;
  department_name: string;
  is_active: boolean;
  created_at: string;
}

// Analytics
export interface AnalyticsOverview {
  tasks_last_30_days: number;
  completed_tasks: number;
  pending_tasks: number;
  avg_completion_time_minutes: number;
  avg_rating: number;
  active_rooms: number;
  active_staff: number;
}

export interface DepartmentAnalytics {
  id: string;
  name: string;
  total_tasks: number;
  completed_tasks: number;
  avg_completion_time: number;
  avg_rating: number;
}

// Chat Session
export interface ChatSession {
  session_token: string;
  session_id: string;
  hotel_id: string;
  hotel_name: string;
  room_number: string;
  welcome_message: string;
}

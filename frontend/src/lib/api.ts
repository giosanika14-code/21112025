import axios, { AxiosInstance, AxiosError } from 'axios';
import type { ApiResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  }

  // Authentication
  async login(email: string, password: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/login', {
      email,
      password,
    });
    if (data.success && data.data.token) {
      this.setToken(data.data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
    }
    return data;
  }

  async logout() {
    this.clearToken();
  }

  async me() {
    const { data } = await this.client.get<ApiResponse>('/auth/me');
    return data;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await this.client.post<ApiResponse>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return data;
  }

  // Super Admin - Hotels
  async getHotels() {
    const { data } = await this.client.get<ApiResponse>('/admin/hotels');
    return data;
  }

  async createHotel(hotelData: any) {
    const { data } = await this.client.post<ApiResponse>('/admin/hotels', hotelData);
    return data;
  }

  async updateHotel(hotelId: string, hotelData: any) {
    const { data } = await this.client.put<ApiResponse>(`/admin/hotels/${hotelId}`, hotelData);
    return data;
  }

  async deleteHotel(hotelId: string) {
    const { data } = await this.client.delete<ApiResponse>(`/admin/hotels/${hotelId}`);
    return data;
  }

  async getAdminStats() {
    const { data } = await this.client.get<ApiResponse>('/admin/stats');
    return data;
  }

  // Hotel Admin - Departments
  async getDepartments() {
    const { data } = await this.client.get<ApiResponse>('/hotel/departments');
    return data;
  }

  async createDepartment(departmentData: any) {
    const { data } = await this.client.post<ApiResponse>('/hotel/departments', departmentData);
    return data;
  }

  async updateDepartment(departmentId: string, departmentData: any) {
    const { data } = await this.client.put<ApiResponse>(`/hotel/departments/${departmentId}`, departmentData);
    return data;
  }

  async testTelegramConnection(departmentId: string) {
    const { data } = await this.client.post<ApiResponse>(`/hotel/departments/${departmentId}/test-telegram`);
    return data;
  }

  // Hotel Admin - Rooms
  async getRooms() {
    const { data } = await this.client.get<ApiResponse>('/hotel/rooms');
    return data;
  }

  async createRoom(roomData: any) {
    const { data } = await this.client.post<ApiResponse>('/hotel/rooms', roomData);
    return data;
  }

  async updateRoom(roomId: string, roomData: any) {
    const { data } = await this.client.put<ApiResponse>(`/hotel/rooms/${roomId}`, roomData);
    return data;
  }

  async regenerateQRCode(roomId: string) {
    const { data } = await this.client.post<ApiResponse>(`/hotel/rooms/${roomId}/regenerate-qr`);
    return data;
  }

  // Hotel Admin - Knowledge Base
  async getKnowledgeBase() {
    const { data } = await this.client.get<ApiResponse>('/hotel/knowledge-base');
    return data;
  }

  async createKnowledgeBase(kbData: any) {
    const { data } = await this.client.post<ApiResponse>('/hotel/knowledge-base', kbData);
    return data;
  }

  async updateKnowledgeBase(kbId: string, kbData: any) {
    const { data } = await this.client.put<ApiResponse>(`/hotel/knowledge-base/${kbId}`, kbData);
    return data;
  }

  async deleteKnowledgeBase(kbId: string) {
    const { data } = await this.client.delete<ApiResponse>(`/hotel/knowledge-base/${kbId}`);
    return data;
  }

  // Hotel Admin - Staff
  async getStaff() {
    const { data } = await this.client.get<ApiResponse>('/hotel/staff');
    return data;
  }

  async createStaff(staffData: any) {
    const { data } = await this.client.post<ApiResponse>('/hotel/staff', staffData);
    return data;
  }

  async updateStaff(staffId: string, staffData: any) {
    const { data } = await this.client.put<ApiResponse>(`/hotel/staff/${staffId}`, staffData);
    return data;
  }

  // Hotel Admin - Analytics
  async getAnalyticsOverview() {
    const { data } = await this.client.get<ApiResponse>('/hotel/analytics/overview');
    return data;
  }

  async getDepartmentAnalytics() {
    const { data } = await this.client.get<ApiResponse>('/hotel/analytics/departments');
    return data;
  }

  async getTaskAnalytics(days: number = 30) {
    const { data } = await this.client.get<ApiResponse>(`/hotel/analytics/tasks?days=${days}`);
    return data;
  }

  // Staff - Tasks
  async getTasks(status?: string) {
    const url = status ? `/staff/tasks?status=${status}` : '/staff/tasks';
    const { data } = await this.client.get<ApiResponse>(url);
    return data;
  }

  async getTask(taskId: string) {
    const { data } = await this.client.get<ApiResponse>(`/staff/tasks/${taskId}`);
    return data;
  }

  async acceptTask(taskId: string) {
    const { data } = await this.client.put<ApiResponse>(`/staff/tasks/${taskId}/accept`);
    return data;
  }

  async startTask(taskId: string) {
    const { data } = await this.client.put<ApiResponse>(`/staff/tasks/${taskId}/start`);
    return data;
  }

  async completeTask(taskId: string) {
    const { data } = await this.client.put<ApiResponse>(`/staff/tasks/${taskId}/complete`);
    return data;
  }

  async getStaffStats() {
    const { data } = await this.client.get<ApiResponse>('/staff/my-stats');
    return data;
  }

  // Guest Chat
  async initChat(qrCode: string) {
    const { data } = await this.client.post<ApiResponse>('/chat/init', {
      qr_code: qrCode,
    });
    return data;
  }

  async sendMessage(sessionToken: string, message: string) {
    const { data } = await this.client.post<ApiResponse>('/chat/message', {
      session_token: sessionToken,
      message,
    });
    return data;
  }

  async getMessages(sessionToken: string) {
    const { data } = await this.client.get<ApiResponse>(`/chat/messages?session_token=${sessionToken}`);
    return data;
  }

  async rateTask(sessionToken: string, taskId: string, rating: number, comment?: string) {
    const { data } = await this.client.post<ApiResponse>('/chat/rate', {
      session_token: sessionToken,
      task_id: taskId,
      rating,
      comment,
    });
    return data;
  }

  async endChat(sessionToken: string) {
    const { data } = await this.client.post<ApiResponse>('/chat/end', {
      session_token: sessionToken,
    });
    return data;
  }
}

export const api = new ApiClient();

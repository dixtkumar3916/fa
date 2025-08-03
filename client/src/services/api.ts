import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

// Types
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  Crop,
  Expense,
  Sensor,
  Chat,
  Tip,
  WeatherData,
  DashboardStats,
  CropAdvisorRequest,
  CropAdvisorResponse,
  PaginatedResponse,
  ApiResponse
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleError(error: AxiosError) {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await this.api.get<{ user: User }>('/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User; message: string }> {
    const response = await this.api.put<{ user: User; message: string }>('/auth/profile', data);
    return response.data;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const response = await this.api.put<{ message: string }>('/auth/change-password', data);
    return response.data;
  }

  async logout(): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>('/auth/logout');
    return response.data;
  }

  // Dashboard endpoints
  async getDashboardStats(): Promise<{ overview: DashboardStats }> {
    const response = await this.api.get<{ overview: DashboardStats }>('/dashboard/overview');
    return response.data;
  }

  async getWeatherData(location?: string): Promise<{ weather: WeatherData }> {
    const url = location ? `/dashboard/weather/${location}` : '/dashboard/weather';
    const response = await this.api.get<{ weather: WeatherData }>(url);
    return response.data;
  }

  async getSensorSummary(): Promise<{ sensors: any }> {
    const response = await this.api.get<{ sensors: any }>('/dashboard/sensors');
    return response.data;
  }

  async getInsights(): Promise<{ insights: any[] }> {
    const response = await this.api.get<{ insights: any[] }>('/dashboard/insights');
    return response.data;
  }

  // Crop endpoints
  async getCrops(params?: {
    category?: string;
    status?: string;
    organic?: boolean;
    location?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Crop> & { filters: any }> {
    const response = await this.api.get<PaginatedResponse<Crop> & { filters: any }>('/crops', { params });
    return response.data;
  }

  async getCrop(id: string): Promise<{ crop: Crop; similarCrops: Crop[]; canContact: boolean }> {
    const response = await this.api.get<{ crop: Crop; similarCrops: Crop[]; canContact: boolean }>(`/crops/${id}`);
    return response.data;
  }

  async createCrop(data: Partial<Crop>): Promise<{ crop: Crop; message: string }> {
    const response = await this.api.post<{ crop: Crop; message: string }>('/crops', data);
    return response.data;
  }

  async updateCrop(id: string, data: Partial<Crop>): Promise<{ crop: Crop; message: string }> {
    const response = await this.api.put<{ crop: Crop; message: string }>(`/crops/${id}`, data);
    return response.data;
  }

  async deleteCrop(id: string): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/crops/${id}`);
    return response.data;
  }

  async getMyCrops(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Crop>> {
    const response = await this.api.get<PaginatedResponse<Crop>>('/crops/farmer/my-crops', { params });
    return response.data;
  }

  async sendCropInquiry(cropId: string, data: {
    message: string;
    contactInfo?: { phone?: string; email?: string };
  }): Promise<{ message: string; inquiry: any }> {
    const response = await this.api.post<{ message: string; inquiry: any }>(`/crops/${cropId}/inquire`, data);
    return response.data;
  }

  async getCropInquiries(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ inquiries: any[] }> {
    const response = await this.api.get<{ inquiries: any[] }>('/crops/farmer/inquiries', { params });
    return response.data;
  }

  async getCropStats(): Promise<any> {
    const response = await this.api.get('/crops/stats/overview');
    return response.data;
  }

  // Expense endpoints
  async getExpenses(params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
    crop?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Expense>> {
    const response = await this.api.get<PaginatedResponse<Expense>>('/expenses', { params });
    return response.data;
  }

  async getExpense(id: string): Promise<{ expense: Expense }> {
    const response = await this.api.get<{ expense: Expense }>(`/expenses/${id}`);
    return response.data;
  }

  async createExpense(data: Partial<Expense>): Promise<{ expense: Expense; message: string }> {
    const response = await this.api.post<{ expense: Expense; message: string }>('/expenses', data);
    return response.data;
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<{ expense: Expense; message: string }> {
    const response = await this.api.put<{ expense: Expense; message: string }>(`/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: string): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/expenses/${id}`);
    return response.data;
  }

  async getExpenseAnalytics(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ analytics: any }> {
    const response = await this.api.get<{ analytics: any }>('/expenses/analytics/summary', { params });
    return response.data;
  }

  async getExpenseCategories(): Promise<{ categories: any[] }> {
    const response = await this.api.get<{ categories: any[] }>('/expenses/categories/summary');
    return response.data;
  }

  async bulkImportExpenses(expenses: Partial<Expense>[]): Promise<{ message: string; count: number }> {
    const response = await this.api.post<{ message: string; count: number }>('/expenses/bulk-import', { expenses });
    return response.data;
  }

  // Sensor endpoints
  async getSensors(): Promise<{ sensors: Sensor[] }> {
    const response = await this.api.get<{ sensors: Sensor[] }>('/sensors');
    return response.data;
  }

  async getSensor(id: string): Promise<{ sensor: Sensor }> {
    const response = await this.api.get<{ sensor: Sensor }>(`/sensors/${id}`);
    return response.data;
  }

  async createSensor(data: Partial<Sensor>): Promise<{ sensor: Sensor; message: string }> {
    const response = await this.api.post<{ sensor: Sensor; message: string }>('/sensors', data);
    return response.data;
  }

  async updateSensor(id: string, data: Partial<Sensor>): Promise<{ sensor: Sensor; message: string }> {
    const response = await this.api.put<{ sensor: Sensor; message: string }>(`/sensors/${id}`, data);
    return response.data;
  }

  async deleteSensor(id: string): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/sensors/${id}`);
    return response.data;
  }

  async getSensorReadings(id: string, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{ readings: any[] }> {
    const response = await this.api.get<{ readings: any[] }>(`/sensors/${id}/readings`, { params });
    return response.data;
  }

  async getSensorAnalytics(id: string, params?: {
    period?: string;
    metric?: string;
  }): Promise<{ analytics: any }> {
    const response = await this.api.get<{ analytics: any }>(`/sensors/${id}/analytics`, { params });
    return response.data;
  }

  async acknowledgeSensorAlert(sensorId: string, alertId: string): Promise<{ message: string }> {
    const response = await this.api.put<{ message: string }>(`/sensors/${sensorId}/alerts/${alertId}/acknowledge`);
    return response.data;
  }

  async getAllSensorAlerts(params?: {
    acknowledged?: boolean;
    severity?: string;
  }): Promise<{ alerts: any[] }> {
    const response = await this.api.get<{ alerts: any[] }>('/sensors/alerts/all', { params });
    return response.data;
  }

  // Chat endpoints
  async getChats(params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Chat>> {
    const response = await this.api.get<PaginatedResponse<Chat>>('/chat', { params });
    return response.data;
  }

  async getChat(id: string): Promise<{ chat: Chat }> {
    const response = await this.api.get<{ chat: Chat }>(`/chat/${id}`);
    return response.data;
  }

  async createChat(data: {
    title: string;
    description?: string;
    category: string;
    priority?: string;
    initialMessage: string;
  }): Promise<{ chat: Chat; message: string }> {
    const response = await this.api.post<{ chat: Chat; message: string }>('/chat', data);
    return response.data;
  }

  async sendMessage(chatId: string, data: {
    content: string;
    type?: string;
    attachments?: any[];
  }): Promise<{ message: string; messageData: any }> {
    const response = await this.api.post<{ message: string; messageData: any }>(`/chat/${chatId}/messages`, data);
    return response.data;
  }

  async updateChatStatus(chatId: string, status: string): Promise<{ message: string }> {
    const response = await this.api.put<{ message: string }>(`/chat/${chatId}/status`, { status });
    return response.data;
  }

  async rateChat(chatId: string, data: {
    score: number;
    feedback?: string;
  }): Promise<{ message: string }> {
    const response = await this.api.post<{ message: string }>(`/chat/${chatId}/rate`, data);
    return response.data;
  }

  async getChatStats(): Promise<{ stats: any }> {
    const response = await this.api.get<{ stats: any }>('/chat/stats/overview');
    return response.data;
  }

  // Tips endpoints
  async getTips(params?: {
    category?: string;
    type?: string;
    difficulty?: string;
    crop?: string;
    search?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Tip> & { filters: any }> {
    const response = await this.api.get<PaginatedResponse<Tip> & { filters: any }>('/tips', { params });
    return response.data;
  }

  async getTip(identifier: string): Promise<{ tip: Tip; relatedTips: Tip[]; userInteraction: any }> {
    const response = await this.api.get<{ tip: Tip; relatedTips: Tip[]; userInteraction: any }>(`/tips/${identifier}`);
    return response.data;
  }

  async createTip(data: Partial<Tip>): Promise<{ tip: Tip; message: string }> {
    const response = await this.api.post<{ tip: Tip; message: string }>('/tips', data);
    return response.data;
  }

  async updateTip(id: string, data: Partial<Tip>): Promise<{ tip: Tip; message: string }> {
    const response = await this.api.put<{ tip: Tip; message: string }>(`/tips/${id}`, data);
    return response.data;
  }

  async deleteTip(id: string): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>(`/tips/${id}`);
    return response.data;
  }

  async likeTip(id: string): Promise<{ message: string; liked: boolean; likesCount: number }> {
    const response = await this.api.post<{ message: string; liked: boolean; likesCount: number }>(`/tips/${id}/like`);
    return response.data;
  }

  async commentOnTip(id: string, content: string): Promise<{ message: string; comment: any }> {
    const response = await this.api.post<{ message: string; comment: any }>(`/tips/${id}/comments`, { content });
    return response.data;
  }

  async replyToComment(tipId: string, commentId: string, content: string): Promise<{ message: string; reply: any }> {
    const response = await this.api.post<{ message: string; reply: any }>(`/tips/${tipId}/comments/${commentId}/reply`, { content });
    return response.data;
  }

  async rateTip(id: string, data: { score: number; review?: string }): Promise<{ message: string; rating: any }> {
    const response = await this.api.post<{ message: string; rating: any }>(`/tips/${id}/rate`, data);
    return response.data;
  }

  async getFeaturedTips(): Promise<{ tips: Tip[] }> {
    const response = await this.api.get<{ tips: Tip[] }>('/tips/featured/list');
    return response.data;
  }

  // Crop Advisor endpoints
  async getCropRecommendations(data: CropAdvisorRequest): Promise<CropAdvisorResponse> {
    const response = await this.api.post<CropAdvisorResponse>('/advisor/recommend', data);
    return response.data;
  }

  async getFertilizerRecommendations(data: {
    crop: string;
    soilType: string;
    farmSize: number;
    soilTestResults?: any;
  }): Promise<any> {
    const response = await this.api.post('/advisor/fertilizer', data);
    return response.data;
  }

  async getPestManagementAdvice(data: {
    crop: string;
    symptoms?: string[];
    season: string;
    region: string;
  }): Promise<any> {
    const response = await this.api.post('/advisor/pest-management', data);
    return response.data;
  }

  async getIrrigationRecommendations(data: {
    crop: string;
    soilType: string;
    farmSize: number;
    waterSource: string;
    season: string;
  }): Promise<any> {
    const response = await this.api.post('/advisor/irrigation', data);
    return response.data;
  }

  // Reports endpoints
  async generateExpenseReport(params: {
    format: 'pdf' | 'excel' | 'json';
    startDate?: string;
    endDate?: string;
    category?: string;
    period?: string;
  }): Promise<Blob | any> {
    const response = await this.api.get('/reports/expenses', { 
      params,
      responseType: params.format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  async generateSalesReport(params: {
    format: 'pdf' | 'excel' | 'json';
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<Blob | any> {
    const response = await this.api.get('/reports/sales', { 
      params,
      responseType: params.format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  async generateSensorReport(params: {
    format: 'pdf' | 'excel' | 'json';
    sensorId?: string;
    startDate?: string;
    endDate?: string;
    metric?: string;
  }): Promise<Blob | any> {
    const response = await this.api.get('/reports/sensors', { 
      params,
      responseType: params.format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  async generateComprehensiveReport(params: {
    format: 'pdf' | 'excel' | 'json';
    period?: string;
  }): Promise<Blob | any> {
    const response = await this.api.get('/reports/comprehensive', { 
      params,
      responseType: params.format === 'json' ? 'json' : 'blob'
    });
    return response.data;
  }

  // Utility methods
  async uploadFile(file: File, path: string = 'uploads'): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await this.api.post<{ url: string; filename: string }>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.api.get<{ status: string; timestamp: string }>('/health');
    return response.data;
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = error.response?.data?.message || 'Something went wrong';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// API functions
export const authAPI = {
  login: (credentials) => api.post('/auth/farmer/login', credentials),
  register: (userData) => api.post('/auth/farmer/register', userData),
  getProfile: () => api.get('/auth/farmer/profile'),
  updateProfile: (data) => api.put('/auth/farmer/profile', data),
};

export const weatherAPI = {
  getCurrentWeather: (city) => api.get(`/weather/current/${city}`),
  getForecast: (city) => api.get(`/weather/forecast/${city}`),
};

export const sensorsAPI = {
  getCurrent: () => api.get('/sensors/current'),
  getHistory: (days = 7) => api.get(`/sensors/history?days=${days}`),
  getAlerts: () => api.get('/sensors/alerts'),
};

export const dashboardAPI = {
  getDashboard: () => api.get('/farmers/dashboard'),
  getAnalytics: (year) => api.get(`/farmers/analytics?year=${year}`),
};

export const expensesAPI = {
  getExpenses: (params) => api.get('/expenses', { params }),
  addExpense: (data) => api.post('/expenses', data),
  updateExpense: (id, data) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
};

export const cropsAPI = {
  getCrops: (params) => api.get('/crops', { params }),
  addCrop: (data) => api.post('/crops', data),
  updateCrop: (id, data) => api.put(`/crops/${id}`, data),
  deleteCrop: (id) => api.delete(`/crops/${id}`),
  getCrop: (id) => api.get(`/crops/${id}`),
};

export const marketAPI = {
  getListings: (params) => api.get('/market/listings', { params }),
  createListing: (data) => api.post('/market/listings', data),
  updateListing: (id, data) => api.put(`/market/listings/${id}`, data),
  getListing: (id) => api.get(`/market/listings/${id}`),
  getMyListings: (params) => api.get('/market/my-listings', { params }),
  sendInquiry: (id, data) => api.post(`/market/listings/${id}/inquire`, data),
  getCategories: () => api.get('/market/categories'),
};

export const adviceAPI = {
  getCropRecommendation: (data) => api.post('/advice/crop-recommendation', data),
  getFertilizerRecommendation: (data) => api.post('/advice/fertilizer-recommendation', data),
  getPestControl: (cropName) => api.get(`/advice/pest-control/${cropName}`),
};

export const tipsAPI = {
  getTips: (params) => api.get('/tips', { params }),
  getTip: (id) => api.get(`/tips/${id}`),
  likeTip: (id) => api.post(`/tips/${id}/like`),
  getCategories: () => api.get('/tips/categories/list'),
  getFeatured: () => api.get('/tips/featured/latest'),
  seedSample: () => api.get('/tips/seed/sample'),
};

export const chatAPI = {
  startChat: (data) => api.post('/chat/start', data),
  getFarmerChats: (params) => api.get('/chat/farmer', { params }),
  getChat: (id) => api.get(`/chat/${id}`),
  sendMessage: (id, data) => api.post(`/chat/${id}/message`, data),
  updateStatus: (id, data) => api.put(`/chat/${id}/status`, data),
  rateChat: (id, data) => api.post(`/chat/${id}/rating`, data),
};

export const reportsAPI = {
  getExpenseReport: (params) => api.get('/reports/expenses', { params }),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getCropReport: (params) => api.get('/reports/crops', { params }),
  getComprehensiveReport: (params) => api.get('/reports/comprehensive', { params }),
};

export default api;
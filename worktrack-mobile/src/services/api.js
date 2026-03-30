// ============================================================
// WorkTrack Mobile - Service API FastAPI
// Base URL configurable via .env
// ============================================================

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ─────────────────────────────────────────
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ─── Intercepteur Request : injection du JWT ───────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Intercepteur Response : gestion 401 ──────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        await AsyncStorage.setItem('access_token', data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        // Navigation vers Login gérée dans AuthContext
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================
// AUTH ENDPOINTS
// ============================================================
export const authService = {
  /**
   * POST /auth/login
   * @param {string} email
   * @param {string} password
   * @returns {{ access_token, refresh_token, user }}
   */
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  /**
   * POST /auth/register
   * @param {{ name, email, password, role? }} payload
   */
  register: async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  /**
   * POST /auth/logout
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
    }
  },

  /**
   * GET /auth/me  → profil utilisateur courant
   */
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// ============================================================
// TASKS ENDPOINTS
// ============================================================
export const taskService = {
  /**
   * GET /tasks/my  → tâches de l'employé connecté
   * @param {{ status?: 'pending'|'in_progress'|'done', page?, limit? }} params
   */
  getMyTasks: async (params = {}) => {
    const { data } = await api.get('/tasks/my', { params });
    return data; // { tasks: [], total: number, page: number }
  },

  /**
   * GET /tasks/:id
   */
  getTaskById: async (id) => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },

  /**
   * PATCH /tasks/:id/status
   * @param {string} id
   * @param {'pending'|'in_progress'|'done'} status
   */
  updateTaskStatus: async (id, status) => {
    const { data } = await api.patch(`/tasks/${id}/status`, { status });
    return data;
  },

  /**
   * POST /tasks/:id/reports  → joindre un rapport/document
   * @param {string} id
   * @param {FormData} formData  (champ 'file')
   */
  attachReport: async (id, formData) => {
    const { data } = await api.post(`/tasks/${id}/reports`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /**
   * GET /tasks/history  → tâches terminées de l'employé
   */
  getHistory: async () => {
    const { data } = await api.get('/tasks/history');
    return data;
  },
};

// ============================================================
// REPORTS ENDPOINTS
// ============================================================
export const reportService = {
  /**
   * GET /reports/my  → rapports soumis par l'employé
   */
  getMyReports: async () => {
    const { data } = await api.get('/reports/my');
    return data;
  },

  /**
   * GET /reports/:id/download  → URL pré-signée S3
   */
  getDownloadUrl: async (id) => {
    const { data } = await api.get(`/reports/${id}/download`);
    return data; // { url: 'https://...' }
  },
};

// ============================================================
// NOTIFICATIONS ENDPOINTS
// ============================================================
export const notificationService = {
  /**
   * GET /notifications  → notifications de l'utilisateur
   * @param {{ unread_only?: boolean }} params
   */
  getNotifications: async (params = {}) => {
    const { data } = await api.get('/notifications', { params });
    return data;
  },

  /**
   * PATCH /notifications/:id/read
   */
  markAsRead: async (id) => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },

  /**
   * PATCH /notifications/read-all
   */
  markAllAsRead: async () => {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },

  /**
   * GET /notifications/unread-count
   */
  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count');
    return data; // { count: number }
  },
};

// ============================================================
// EMPLOYEE / RATINGS ENDPOINTS
// ============================================================
export const employeeService = {
  /**
   * GET /employees/:id/ratings  → évaluations de l'employé
   */
  getMyRatings: async (employeeId) => {
    const { data } = await api.get(`/employees/${employeeId}/ratings`);
    return data;
  },

  /**
   * GET /employees/:id/ratings/average
   */
  getMyAverage: async (employeeId) => {
    const { data } = await api.get(`/employees/${employeeId}/ratings/average`);
    return data; // { average: number, total: number }
  },
};

// ─── FCM Push Token ────────────────────────────────────────
export const deviceService = {
  /**
   * POST /devices/register  → enregistrer le token FCM
   * @param {{ token: string, platform: 'android'|'ios' }} payload
   */
  registerPushToken: async (payload) => {
    const { data } = await api.post('/devices/register', payload);
    return data;
  },
};

export default api;

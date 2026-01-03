import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5090/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
        // Token expired or invalid
        // If we implement refresh token logic, do it here.
        // For now, logout.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // window.location.href = '/login'; // Force redirect? Safe?
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
};

export const subjectApi = {
  list: () => api.get('/subjects'),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
};

export const statsApi = {
  get: (params) => api.get('/attendance/stats', { params }),
  dashboard: (params) => api.get('/attendance/dashboard', { params }),
};

export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
};

export const attendanceApi = {
    getPending: () => api.get('/attendance/pending'),
    acknowledge: (ids) => api.post('/attendance/acknowledge', { occurrenceIds: ids })
};

export default api;

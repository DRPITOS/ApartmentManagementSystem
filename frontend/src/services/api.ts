import axios from 'axios';

// Get base URL from environment or default to '/api' for local dev proxy
const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() || '/api';

// Automatically ensure baseURL ends with '/api' if not already present
const baseURL = rawBaseUrl.endsWith('/api')
  ? rawBaseUrl
  : `${rawBaseUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration or unauthenticated errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('owner');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  // Authentication endpoints
  login: '/login',
  register: '/register',
  logout: '/logout',
  // User endpoints
  user: '/user',
} as const;


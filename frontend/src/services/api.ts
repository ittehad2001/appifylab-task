import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Important for Laravel Sanctum
  timeout: 30000, // 30 second timeout
});

// Log API base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('[API] Base URL:', API_BASE_URL);
}

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage if available
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If data is FormData, remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle connection errors with retry logic
    if (!error.response && error.code === 'ECONNABORTED') {
      // Timeout error
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        // Retry once after 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiClient(originalRequest);
      }
    } else if (!error.response && (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_REFUSED')) {
      // Network/connection error - retry once
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;
        // Retry once after 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiClient(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      // Handle unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // You can add redirect logic here if needed
    }
    return Promise.reject(error);
  }
);

export default apiClient;


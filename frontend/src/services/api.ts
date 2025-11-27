import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getApiBaseUrl } from '../config/api';

// Get API base URL dynamically at runtime
const getBaseUrl = () => getApiBaseUrl();

// Create axios instance with default config
// Note: baseURL will be set dynamically in the request interceptor
const apiClient: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // Important for Laravel Sanctum
  timeout: 30000, // 30 second timeout
});

// Log API base URL for debugging (both dev and production)
const currentUrl = getBaseUrl();
if (!(window as any).__API_URL_LOGGED__) {
  console.log('[API] Base URL:', currentUrl);
  console.log('[API] Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'N/A');
  (window as any).__API_URL_LOGGED__ = true;
}

// Request interceptor - Add auth token if available and ensure correct base URL
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Ensure baseURL is always current (in case it changed)
    const currentBaseUrl = getBaseUrl();
    if (config.baseURL !== currentBaseUrl) {
      config.baseURL = currentBaseUrl;
    }
    
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
      // Network/connection error - log for debugging
      const currentUrl = getBaseUrl();
      console.error('[API] Connection error:', {
        code: error.code,
        message: error.message,
        baseURL: currentUrl,
        requestedURL: error.config?.url,
        hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
      });
      
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


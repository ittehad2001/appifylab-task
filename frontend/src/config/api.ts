// API Configuration - Auto-detect local vs production
function getApiBaseUrl(): string {
  // First, check if VITE_API_BASE_URL is explicitly set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // Ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }

  // Auto-detect based on current hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Production detection
    if (hostname.includes('airoxdev.com') || hostname.includes('www.airoxdev.com')) {
      return 'https://api.airoxdev.com/api';
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return 'http://localhost:8000/api';
    }

    // For other domains, try to construct from current origin
    // If frontend is on port 5173, backend might be on 8000
    const port = window.location.port;
    if (port === '5173' || port === '3000' || !port) {
      return `${protocol}//${hostname}:8000/api`;
    }
    
    // If same origin, assume API is at /api
    return `${protocol}//${hostname}${port ? `:${port}` : ''}/api`;
  }

  // Fallback for SSR or build time
  return 'http://localhost:8000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Authentication endpoints
  login: '/login',
  register: '/register',
  logout: '/logout',
  // User endpoints
  user: '/user',
} as const;


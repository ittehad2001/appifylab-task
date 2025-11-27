// API Configuration - Auto-detect local vs production
// This function is called at runtime to ensure correct URL detection
export function getApiBaseUrl(): string {
  // First, check if VITE_API_BASE_URL is explicitly set (from build-time env)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    // Ensure it ends with /api
    const cleanUrl = envUrl.trim();
    return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/api`;
  }

  // Auto-detect based on current hostname (runtime detection)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    const protocol = window.location.protocol;

    // Production detection - check for airoxdev.com domain
    if (hostname.includes('airoxdev.com')) {
      const apiUrl = 'https://api.airoxdev.com/api';
      // Log in production for debugging (only once)
      if (!(window as any).__API_URL_LOGGED__) {
        console.log('[API] Production detected, using:', apiUrl);
        (window as any).__API_URL_LOGGED__ = true;
      }
      return apiUrl;
    }

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '' || hostname === '0.0.0.0') {
      return 'http://localhost:8000/api';
    }

    // For other domains (staging, etc.), try to construct from current origin
    const port = window.location.port;
    
    // If frontend is on a dev port, backend might be on 8000
    if (port === '5173' || port === '3000' || port === '5174') {
      return `${protocol}//${hostname}:8000/api`;
    }
    
    // If same origin and no port specified, assume API is at /api on same domain
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${hostname}/api`;
    }
    
    // For other ports, try same host with /api
    return `${protocol}//${hostname}:${port}/api`;
  }

  // Fallback for SSR or build time (shouldn't happen in browser)
  return 'http://localhost:8000/api';
}

// Export as a getter function that's called at runtime
// This ensures the URL is always current, not cached from build time
export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Authentication endpoints
  login: '/login',
  register: '/register',
  logout: '/logout',
  // User endpoints
  user: '/user',
} as const;


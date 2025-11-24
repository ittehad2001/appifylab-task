import apiClient from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
  };
  access_token: string;
  token_type: string;
  expires_at?: string;
}

// Login user
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/login', credentials);

  const token = response.data.access_token;
  localStorage.setItem('auth_token', token);

  return response.data;
};





// Register new user
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/register', data);
  
  // Store token in localStorage
  if (response.data.access_token) {
    localStorage.setItem('auth_token', response.data.access_token);
  }
  
  // Store user data in localStorage for instant display
  if (response.data.user) {
    localStorage.setItem('user_data', JSON.stringify(response.data.user));
  }
  
  return response.data;
};

// Logout user
export const logout = async (): Promise<void> => {
  try {
    await apiClient.post('/logout');
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Remove token and user data from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
};

// Verify token validity by checking with backend
export const verifyToken = async (): Promise<boolean> => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    return false;
  }

  try {
    const response = await apiClient.get('/user');
    return !!response.data;
  } catch (error) {
    // Token is invalid or expired
    localStorage.removeItem('auth_token');
    return false;
  }
};

// Check if user is authenticated (synchronous check)
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token');
};

// Get current user data
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/user');
    // Update stored user data
    if (response.data) {
      localStorage.setItem('user_data', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    throw error;
  }
};

// Get cached user data from localStorage (synchronous, for instant display)
export const getCachedUser = () => {
  try {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};



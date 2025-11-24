import apiClient from './api';
import { API_ENDPOINTS } from '../config/api';

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Get authenticated user
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>(API_ENDPOINTS.user);
  return response.data;
};

// Example: Add more user-related API calls here
// export const updateUser = async (id: number, data: Partial<User>): Promise<User> => {
//   const response = await apiClient.put<User>(`${API_ENDPOINTS.user}/${id}`, data);
//   return response.data;
// };



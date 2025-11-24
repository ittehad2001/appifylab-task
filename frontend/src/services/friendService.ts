import apiClient from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  profile_image_url?: string | null;
}

export interface FriendRequest {
  id: number;
  sender: {
    id: number;
    name: string;
    email: string;
    profile_image_url?: string | null;
  };
  created_at: string;
}

// Search users
export const searchUsers = async (query: string): Promise<User[]> => {
  const response = await apiClient.get('/friends/search', {
    params: { q: query },
  });
  return response.data;
};

// Get suggested people
export const getSuggestedPeople = async (): Promise<User[]> => {
  const response = await apiClient.get('/friends/suggested');
  return response.data;
};

// Send friend request
export const sendFriendRequest = async (receiverId: number): Promise<{ message: string }> => {
  const response = await apiClient.post('/friends/request', { receiver_id: receiverId });
  return response.data;
};

// Accept friend request
export const acceptFriendRequest = async (requestId: number): Promise<{ message: string }> => {
  const response = await apiClient.post(`/friends/request/${requestId}/accept`);
  return response.data;
};

// Reject friend request
export const rejectFriendRequest = async (requestId: number): Promise<{ message: string }> => {
  const response = await apiClient.post(`/friends/request/${requestId}/reject`);
  return response.data;
};

// Get friends list
export const getFriends = async (search?: string): Promise<User[]> => {
  const response = await apiClient.get('/friends', {
    params: search ? { search } : {},
  });
  return response.data;
};

// Get pending friend requests
export const getPendingRequests = async (): Promise<FriendRequest[]> => {
  const response = await apiClient.get('/friends/pending');
  return response.data;
};


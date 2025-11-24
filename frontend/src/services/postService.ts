import apiClient from './api';

export interface Post {
  id: number;
  user_id: number;
  content: string | null;
  image: string | null;
  image_url?: string | null;
  privacy: 'public' | 'private';
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  is_liked?: boolean;
  current_reaction?: string | null;
  likes_count?: number;
  likes?: Array<{
    id: number;
    reaction_type?: string;
    user: {
      id: number;
      name: string;
      profile_image_url?: string | null;
    };
  }>;
  comments?: Comment[];
}

export interface Comment {
  id: number;
  user_id: number;
  post_id: number;
  parent_id: number | null;
  content: string;
  image?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  is_liked?: boolean;
  current_reaction?: string | null;
  likes_count?: number;
  likes?: Array<{
    id: number;
    reaction_type?: string;
    user: {
      id: number;
      name: string;
      profile_image_url?: string | null;
    };
  }>;
  reactions?: Record<string, { count: number; users: Array<{ id: number; user: { id: number; name: string; profile_image_url?: string | null } }> }>;
  replies?: Comment[];
}

export interface CreatePostData {
  content?: string;
  image?: File;
  privacy: 'public' | 'private';
}

export interface CreateCommentData {
  post_id: number;
  parent_id?: number | null;
  content: string;
  image?: File;
}

// Get all posts (newest first)
export const getPosts = async (page: number = 1): Promise<{ data: Post[]; current_page: number; last_page: number }> => {
  const response = await apiClient.get('/posts', {
    params: { page },
  });
  return response.data;
};

// Create a new post
export const createPost = async (data: CreatePostData): Promise<{ message: string; post: Post }> => {
  const formData = new FormData();

  if (data.content) {
    formData.append('content', data.content);
  }

  if (data.image) {
    formData.append('image', data.image); // File object
  }

  formData.append('privacy', data.privacy);

  const response = await apiClient.post('/posts', formData, {
    withCredentials: false, // REQUIRED FOR COOKIE
    headers: {
      Accept: 'application/json',
      // DO NOT SET Content-Type (Axios will set it automatically)
    },
  });

  return response.data;
};



// Get a single post
export const getPost = async (id: number): Promise<Post> => {
  const response = await apiClient.get(`/posts/${id}`);
  return response.data;
};

// Update a post
export const updatePost = async (id: number, data: Partial<CreatePostData & { remove_image?: boolean }>): Promise<{ message: string; post: Post }> => {
  const formData = new FormData();
  
  // Always send content (can be empty string)
  if (data.content !== undefined) {
    formData.append('content', data.content || '');
  }
  
  if (data.image) {
    formData.append('image', data.image);
  }
  
  if (data.remove_image) {
    formData.append('remove_image', 'true');
  }
  
  if (data.privacy) {
    formData.append('privacy', data.privacy);
  }
  
  // Use POST with _method=PUT for FormData compatibility
  formData.append('_method', 'PUT');
  
  const response = await apiClient.post(`/posts/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

// Delete a post
export const deletePost = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/posts/${id}`);
  return response.data;
};

// Toggle like on a post or comment
export const toggleLike = async (likeableType: 'post' | 'comment', likeableId: number, reactionType: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'sad' | 'angry' | 'dislike' = 'like'): Promise<{
  reacted: boolean;
  current_reaction: string | null;
  likes_count: number;
  reactions: Record<string, { count: number; users: Array<{ id: number; user: { id: number; name: string; profile_image_url?: string | null } }> }>;
  likes: Array<{
    id: number;
    reaction_type: string;
    user: {
      id: number;
      name: string;
      profile_image_url?: string | null;
    };
  }>;
}> => {
  const response = await apiClient.post('/likes/toggle', {
    likeable_type: likeableType,
    likeable_id: likeableId,
    reaction_type: reactionType,
  });
  return response.data;
};

// Get users who liked a post or comment
export const getLikes = async (likeableType: 'post' | 'comment', likeableId: number): Promise<{
  likes_count: number;
  likes: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
    created_at: string;
  }>;
}> => {
  const response = await apiClient.get('/likes', {
    params: {
      likeable_type: likeableType,
      likeable_id: likeableId,
    },
  });
  return response.data;
};

// Get comments for a post
export const getComments = async (postId: number): Promise<Comment[]> => {
  const response = await apiClient.get(`/posts/${postId}/comments`);
  return response.data;
};

// Create a comment or reply
export const createComment = async (data: CreateCommentData): Promise<{ message: string; comment: Comment }> => {
  // If there's an image, use FormData
  if (data.image) {
    const formData = new FormData();
    formData.append('post_id', data.post_id.toString());
    if (data.parent_id) {
      formData.append('parent_id', data.parent_id.toString());
    }
    formData.append('content', data.content);
    formData.append('image', data.image);
    const response = await apiClient.post('/comments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } else {
    const response = await apiClient.post('/comments', data);
    return response.data;
  }
};

// Update a comment
export const updateComment = async (id: number, content: string): Promise<{ message: string; comment: Comment }> => {
  const response = await apiClient.put(`/comments/${id}`, { content });
  return response.data;
};

// Delete a comment
export const deleteComment = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/comments/${id}`);
  return response.data;
};


# React Frontend - Laravel Backend Integration

This is a React frontend application built with Vite, connected to a Laravel backend API.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   ├── config/          # Configuration files (API endpoints, etc.)
│   ├── services/        # API service layer
│   ├── App.tsx          # Main App component
│   └── main.tsx         # Entry point
├── .env                 # Environment variables (create this file)
└── package.json
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

**Note:** Update the URL if your Laravel backend runs on a different port or domain.

### 3. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Backend Setup

### Laravel Backend Requirements

1. Make sure your Laravel backend is running on `http://localhost:8000`
2. CORS is already configured to allow requests from `http://localhost:5173`
3. Sanctum is configured for authentication

### Testing the Connection

1. Start your Laravel backend:
   ```bash
   cd Backend
   php artisan serve
   ```

2. Test the API connection:
   - Visit `http://localhost:8000/api/test` in your browser
   - You should see: `{"message":"API connection successful!","status":"ok",...}`

3. Start the React frontend:
   ```bash
   cd frontend
   npm run dev
   ```

4. Visit `http://localhost:5173` - The app will attempt to fetch user data from the Laravel API

## API Service Usage

### Making API Calls

The project includes a configured axios instance in `src/services/api.ts`:

```typescript
import apiClient from './services/api';

// Example: GET request
const response = await apiClient.get('/endpoint');

// Example: POST request
const response = await apiClient.post('/endpoint', { data: 'value' });
```

### Authentication

The API client automatically includes the authentication token from localStorage if available:

```typescript
// Store token after login
localStorage.setItem('auth_token', 'your-token-here');

// Token will be automatically included in subsequent requests
```

### Available Services

- **User Service** (`src/services/userService.ts`): User-related API calls
  - `getCurrentUser()`: Get authenticated user

## Adding New API Endpoints

1. Add the endpoint to `src/config/api.ts`:
   ```typescript
   export const API_ENDPOINTS = {
     user: '/user',
     posts: '/posts', // New endpoint
   } as const;
   ```

2. Create a service function in `src/services/`:
   ```typescript
   export const getPosts = async () => {
     const response = await apiClient.get(API_ENDPOINTS.posts);
     return response.data;
   };
   ```

3. Use it in your components:
   ```typescript
   import { getPosts } from '../services/postService';
   
   const posts = await getPosts();
   ```

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Troubleshooting

### CORS Errors

If you encounter CORS errors:
1. Check that your Laravel backend is running
2. Verify `Backend/config/cors.php` includes your frontend URL
3. Make sure `supports_credentials` is set to `true` in CORS config

### API Connection Issues

1. Verify the `VITE_API_BASE_URL` in `.env` matches your Laravel backend URL
2. Check that Laravel is running: `php artisan serve`
3. Test the API directly: Visit `http://localhost:8000/api/test`

### Authentication Issues

1. Make sure you're storing the token correctly: `localStorage.setItem('auth_token', token)`
2. Verify Sanctum is properly configured in Laravel
3. Check that the token is being sent in the Authorization header

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Axios** - HTTP client for API calls
- **Laravel Sanctum** - Authentication (backend)

import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/userService';
import type { User } from '../services/userService';
import type { AxiosError } from 'axios';

function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err: unknown) {
      let errorMessage = 'Failed to fetch user data';
      
      if (err && typeof err === 'object' && 'isAxiosError' in err) {
        const axiosError = err as AxiosError;
        
        if (axiosError.code === 'ERR_NETWORK' || axiosError.message === 'Network Error') {
          errorMessage = 'Network Error - Cannot reach the backend server. Make sure Laravel is running on http://localhost:8000';
        } else if (axiosError.response?.status === 401) {
          errorMessage = 'Unauthorized - Please log in first';
        } else if (axiosError.response) {
          errorMessage = `Server Error: ${axiosError.response.status}`;
        } else {
          errorMessage = axiosError.message || 'Unknown error occurred';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching user:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile">
        <p>Loading user data...</p>
      </div>
    );
  }

  if (error) {
    const isUnauthorized = error.includes('Unauthorized') || error.includes('401');
    
    return (
      <div className="user-profile">
        <div className="error">
          <p><strong>Error: {error}</strong></p>
          {isUnauthorized ? (
            <div className="error-info">
              <p className="success-indicator">✓ API connection is working!</p>
              <p className="error-hint">
                The <code>/api/user</code> endpoint requires authentication. This is expected behavior.
              </p>
              <div className="auth-info">
                <h4>To view user data, you need to:</h4>
                <ol>
                  <li>Create a login/register endpoint in Laravel</li>
                  <li>Authenticate and get a Sanctum token</li>
                  <li>Store the token: <code>localStorage.setItem('auth_token', 'your-token')</code></li>
                  <li>The token will be automatically included in requests</li>
                </ol>
                <p className="note">
                  <strong>Note:</strong> The API connection is working correctly. 
                  The test endpoint (<code>/api/test</code>) works without authentication.
                </p>
              </div>
            </div>
          ) : (
            <p className="error-hint">
              Make sure your Laravel backend is running and you're authenticated.
            </p>
          )}
          <button onClick={fetchUser}>Retry</button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile">
        <p>No user data available</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h2>User Profile</h2>
      <div className="user-info">
        <p><strong>ID:</strong> {user.id}</p>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        {user.email_verified_at && (
          <p><strong>Email Verified:</strong> {new Date(user.email_verified_at).toLocaleString()}</p>
        )}
      </div>
      <button onClick={fetchUser}>Refresh</button>
    </div>
  );
}

export default UserProfile;


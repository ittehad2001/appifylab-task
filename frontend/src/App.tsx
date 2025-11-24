import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import { isAuthenticated, logout } from './services/authService';
import apiClient from './services/api';
import './App.css';

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check URL to determine if we should show register page
  useEffect(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Check if URL contains /register or #register
    if (path === '/register' || hash === '#register' || hash === '#/register') {
      setShowRegister(true);
      // Update URL to /register if not already
      if (path !== '/register') {
        window.history.pushState({}, '', '/register');
      }
    } else if (path === '/login' || hash === '#login' || hash === '#/login') {
      setShowRegister(false);
      // Update URL to /login if not already
      if (path !== '/login') {
        window.history.pushState({}, '', '/login');
      }
    }
  }, []);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/register') {
        setShowRegister(true);
      } else {
        setShowRegister(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Verify token validity with backend on mount
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          // Verify token is still valid by making a request to /user endpoint
          const response = await apiClient.get('/user');
          if (response.data) {
            // Store user data in localStorage for instant display
            localStorage.setItem('user_data', JSON.stringify(response.data));
            setAuthenticated(true);
          } else {
            setAuthenticated(false);
          }
        } catch (error: any) {
          // Token is invalid or expired
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          setAuthenticated(false);
          
          // If it's a 401, redirect to login
          if (error?.response?.status === 401) {
            window.history.pushState({}, '', '/login');
          }
        }
      } else {
        setAuthenticated(false);
      }
    setCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
    setShowRegister(false);
    // Update URL to root after successful authentication
    window.history.pushState({}, '', '/');
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    // Update URL to login after logout
    window.history.pushState({}, '', '/login');
  };

  const handleSwitchToRegister = () => {
    setShowRegister(true);
    // Update URL to /register
    window.history.pushState({}, '', '/register');
  };

  const handleSwitchToLogin = () => {
    setShowRegister(false);
    // Update URL to /login
    window.history.pushState({}, '', '/login');
  };

  if (checkingAuth) {
    return (
      <div className="_loading_wrapper">
        <div className="_loading_spinner">
          <div className="_spinner"></div>
        </div>
        <p className="_loading_text">Loading...</p>
      </div>
    );
  }

  // Show full-screen login/register when not authenticated
  if (!authenticated) {
    return (
      <>
        {showRegister ? (
          <Register
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        ) : (
          <Login
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        )}
      </>
    );
  }

  // Show Feed page when authenticated
  return (
    <Feed onLogout={handleLogout} />
  );
}

export default App;

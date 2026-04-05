import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import { isAuthenticated, logout } from './services/authService';
import apiClient from './services/api';
import './App.css';

const normalizePath = (path: string): string => {
  const trimmed = path.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
};

function NotFoundPage({ authenticated }: { authenticated: boolean }) {
  const homePath = authenticated ? '/feed' : '/login';

  const handleGoHome = () => {
    window.history.pushState({}, '', homePath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="_notfound_page">
      <div className="_notfound_gradient" aria-hidden="true"></div>
      <div className="_notfound_card">
        <p className="_notfound_brand">BuddyScript</p>
        <p className="_notfound_code">404</p>
        <h1 className="_notfound_title">Page Not Found</h1>
        <p className="_notfound_text">
          This link does not exist or may have been moved.
        </p>

        <div className="_notfound_actions">
          <button type="button" className="_notfound_btn_primary" onClick={handleGoHome}>
            Go to {authenticated ? 'Feed' : 'Login'}
          </button>
          <button type="button" className="_notfound_btn_secondary" onClick={handleGoBack}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentPath, setCurrentPath] = useState(normalizePath(window.location.pathname));

  // Check URL to determine if we should show register page
  useEffect(() => {
    const path = normalizePath(window.location.pathname);
    const hash = window.location.hash;
    setCurrentPath(path);
    
    // Check if URL contains /register or #register
    if (path === '/register' || hash === '#register' || hash === '#/register') {
      setShowRegister(true);
      // Update URL to /register if not already
      if (path !== '/register') {
        window.history.pushState({}, '', '/register');
        setCurrentPath('/register');
      }
    } else if (path === '/login' || hash === '#login' || hash === '#/login') {
      setShowRegister(false);
      // Update URL to /login if not already
      if (path !== '/login') {
        window.history.pushState({}, '', '/login');
        setCurrentPath('/login');
      }
    }
  }, []);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = normalizePath(window.location.pathname);
      setCurrentPath(path);
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
            setCurrentPath('/login');
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
    setCurrentPath('/');
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    // Update URL to login after logout
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
  };

  const handleSwitchToRegister = () => {
    setShowRegister(true);
    // Update URL to /register
    window.history.pushState({}, '', '/register');
    setCurrentPath('/register');
  };

  const handleSwitchToLogin = () => {
    setShowRegister(false);
    // Update URL to /login
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
  };

  const validPublicRoutes = ['/', '/login', '/register'];
  const validPrivateRoutes = ['/', '/feed'];

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
    if (!validPublicRoutes.includes(currentPath)) {
      return <NotFoundPage authenticated={false} />;
    }

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
  if (!validPrivateRoutes.includes(currentPath)) {
    return <NotFoundPage authenticated={true} />;
  }

  return (
    <Feed onLogout={handleLogout} />
  );
}

export default App;

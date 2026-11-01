import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { setToken } from './lib/api';

const C = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize from localStorage so hard refresh never flickers to logged-out state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sharebite_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    // If we already have a cached user in localStorage, render immediately without blocking with full page loader
    return !localStorage.getItem('sharebite_user');
  });

  useEffect(() => {
    const storedRefresh = localStorage.getItem('sharebite_refresh');

    // Verify session with backend on mount
    api.post('/auth/refresh', { refreshToken: storedRefresh })
      .then(r => {
        const { user: refreshedUser, accessToken, refreshToken: newRefresh } = r.data.data;
        setToken(accessToken);
        setUser(refreshedUser);
        localStorage.setItem('sharebite_user', JSON.stringify(refreshedUser));
        if (newRefresh) {
          localStorage.setItem('sharebite_refresh', newRefresh);
        }
      })
      .catch(err => {
        // Only invalidate if the backend explicitly reports 401 (unauthorized / session revoked)
        if (err.response?.status === 401) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('sharebite_user');
          localStorage.removeItem('sharebite_token');
          localStorage.removeItem('sharebite_refresh');
        }
      })
      .finally(() => {
        setLoading(false);
      });

    const handleExpired = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('sharebite_user');
      localStorage.removeItem('sharebite_token');
      localStorage.removeItem('sharebite_refresh');
    };

    window.addEventListener('sharebite:expired', handleExpired);
    return () => window.removeEventListener('sharebite:expired', handleExpired);
  }, []);

  async function login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, accessToken, refreshToken } = r.data.data;
    setToken(accessToken);
    setUser(loggedInUser);
    localStorage.setItem('sharebite_user', JSON.stringify(loggedInUser));
    if (refreshToken) {
      localStorage.setItem('sharebite_refresh', refreshToken);
    }
    return loggedInUser;
  }

  async function register(data) {
    return api.post('/auth/register', data);
  }

  async function logout() {
    try {
      const storedRefresh = localStorage.getItem('sharebite_refresh');
      await api.post('/auth/logout', { refreshToken: storedRefresh });
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('sharebite_user');
      localStorage.removeItem('sharebite_token');
      localStorage.removeItem('sharebite_refresh');
    }
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useAuth = () => useContext(C);

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { initPushNotifications } from '../utils/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token exists, verify it's still valid and fetch the user
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        // Subscribe to push on app load if already logged in
        initPushNotifications().catch(() => {});
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    // Subscribe to push notifications after auth
    initPushNotifications().catch(() => {});
    return res.data.user;
  }

  async function register(payload) {
    const res = await api.post('/auth/register', payload);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    // Subscribe to push notifications after auth
    initPushNotifications().catch(() => {});
    return res.data.user;
  }

  async function verifyEmail(code) {
    const res = await api.post('/auth/verify-email', { code });
    const updatedUser = { ...(user || {}), ...res.data.user, isEmailVerified: true };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return res.data;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch (err) {
      console.error('Failed to refresh user', err);
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, verifyEmail, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

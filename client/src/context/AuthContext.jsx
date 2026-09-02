import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ekdant_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      try { localStorage.removeItem('ekdant_user'); } catch {}
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem('ekdant_auth_token');
      if (token) {
        try {
          const res = await apiRequest('/auth/me');
          setUser(res.user);
          localStorage.setItem('ekdant_user', JSON.stringify(res.user));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }

    verifySession();

    const handleUnauthorized = () => logout();
    window.addEventListener('auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth_unauthorized', handleUnauthorized);
  }, []);

  const login = async (identifier, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        username: identifier, 
        mobile: identifier, 
        loginId: identifier,
        password 
      })
    });
    localStorage.setItem('ekdant_auth_token', res.token);
    localStorage.setItem('ekdant_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('ekdant_auth_token');
    localStorage.removeItem('ekdant_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

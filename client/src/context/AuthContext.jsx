import React, { createContext, useContext, useState, useEffect } from 'react';
import { getApiUrl } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('scb_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('scb_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync token & user to localStorage
  useEffect(() => {
    if (token && currentUser) {
      localStorage.setItem('scb_token', token);
      localStorage.setItem('scb_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('scb_token');
      localStorage.removeItem('scb_user');
    }
  }, [token, currentUser]);

  // Verify session on mount when token exists
  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, []);

  const refreshUser = async () => {
    const activeToken = token || localStorage.getItem('scb_token');
    if (!activeToken) return;
    try {
      const res = await fetch(getApiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
      } else {
        // Token is invalid/expired or account blocked
        logout();
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  const setAuthSession = (user, authToken) => {
    setCurrentUser(user);
    if (authToken) setToken(authToken);
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        setCurrentUser,
        setAuthSession,
        role: currentUser ? currentUser.role : 'public',
        isLoggedIn: Boolean(currentUser),
        refreshUser,
        logout,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

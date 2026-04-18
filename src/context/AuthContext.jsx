import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import api from '../utils/serve';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'authUser';

const readStoredUser = () => {
  try {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/user-profile');

      if (data?.success && data.user) {
        setUser(data.user);
        return data.user;
      }
    } catch (error) {
      const status = error?.response?.status;
      const shouldLogout =
        status === 401 ||
        error?.response?.data?.logout === true;

      // Preserve the last known session on transient/network failures.
      if (!shouldLogout) {
        const fallbackUser = readStoredUser();
        if (fallbackUser) {
          setUser(fallbackUser);
        }
        return fallbackUser;
      }
    }

    setUser(null);
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        await refreshUser();
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    queryClient.removeQueries({ queryKey: ['trades'] });
  }, [queryClient, user]);

  useEffect(() => {
    const handleLogout = () => {
      queryClient.removeQueries({ queryKey: ['trades'] });
      setUser(null);
      setIsAuthLoading(false);
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [queryClient]);

  const value = useMemo(() => ({
    user,
    setUser,
    refreshUser,
    isAuthenticated: Boolean(user),
    isAuthLoading,
  }), [user, isAuthLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

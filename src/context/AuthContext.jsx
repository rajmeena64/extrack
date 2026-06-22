import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import api from '../utils/serve';
import { clearClientStorage } from '../utils/clientStorage';
import { markPerf, measurePerf } from '../utils/perfMarks';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'authUser';

const readStoredUser = () => {
  try {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    clearClientStorage();
    return null;
  }
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const initialStoredUser = useMemo(() => readStoredUser(), []);
  const [user, setUser] = useState(initialStoredUser);
  const [isAuthLoading, setIsAuthLoading] = useState(() => !initialStoredUser);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;

    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [user]);

  const clearAuthState = useCallback(() => {
    clearClientStorage();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');

      const user = data?.data?.user || data?.user;
      if (data?.success && user) {
        setUser(user);
        return user;
      }
    } catch {
      clearAuthState();
      return null;
    }

    clearAuthState();
    return null;
  }, [clearAuthState]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      try {
        await refreshUser();
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
          markPerf('auth-ready');
          measurePerf('auth-from-start', 'app-start', 'auth-ready');
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshUser]);

  useEffect(() => {
    if (isAuthLoading) return undefined;

    const verifyActiveSession = () => {
      refreshUser().catch(() => null);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyActiveSession();
      }
    };

    window.addEventListener('focus', verifyActiveSession);
    window.addEventListener('pageshow', verifyActiveSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', verifyActiveSession);
      window.removeEventListener('pageshow', verifyActiveSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthLoading, refreshUser]);

  useEffect(() => {
    if (!user) {
      queryClient.clear();
    }
  }, [queryClient, user]);

  useEffect(() => {
    const handleLogout = () => {
      clearAuthState();
      setIsAuthLoading(false);
    };

    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, [clearAuthState]);

  const value = useMemo(() => ({
    user,
    setUser,
    refreshUser,
    isAuthenticated: Boolean(user),
    isAuthLoading,
  }), [user, refreshUser, isAuthLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

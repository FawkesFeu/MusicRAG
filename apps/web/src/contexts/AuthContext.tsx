'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient, setAuthTokens, clearAuthTokens } from '../lib/api-client';
import type { UserPublicProfile, UserRole } from '@rag/shared';

interface AuthContextType {
  user: UserPublicProfile | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function syncCookies(token: string | null, role: string | null) {
  if (typeof document === 'undefined') return;
  if (token) {
    document.cookie = `rag_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `rag_role=${role || 'user'}; path=/; max-age=86400; SameSite=Lax`;
  } else {
    document.cookie = 'rag_token=; path=/; max-age=0';
    document.cookie = 'rag_role=; path=/; max-age=0';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const savedToken = localStorage.getItem('rag_access_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      syncCookies(null, null);
      setLoading(false);
      return;
    }

    try {
      const profile = await apiClient.get<UserPublicProfile>('/api/auth/me');
      setUser(profile);
      setToken(savedToken);
      localStorage.setItem('rag_user', JSON.stringify(profile));
      syncCookies(savedToken, profile.role);
    } catch {
      // Token is invalid/expired
      clearAuthTokens();
      setUser(null);
      setToken(null);
      syncCookies(null, null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify token on initial mount
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Route security check on navigation
  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedPage = pathname.startsWith('/chat') || pathname.startsWith('/dashboard');

    if (!user && isProtectedPage) {
      router.replace('/login');
    } else if (user && isAuthPage) {
      if (user.role === 'admin') {
        router.replace('/dashboard');
      } else {
        router.replace('/chat');
      }
    } else if (user && pathname.startsWith('/dashboard') && user.role !== 'admin') {
      router.replace('/chat');
    }
  }, [user, loading, pathname, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    const { accessToken, refreshToken, user: loggedUser } = res;

    setAuthTokens(accessToken, refreshToken);
    localStorage.setItem('rag_user', JSON.stringify(loggedUser));
    syncCookies(accessToken, loggedUser.role);
    setToken(accessToken);
    setUser(loggedUser);

    if (loggedUser.role === 'admin') {
      router.replace('/dashboard');
    } else {
      router.replace('/chat');
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole = 'user') => {
    const res = await apiClient.post('/api/auth/register', { name, email, password, role });
    const { accessToken, refreshToken, user: newUser } = res;

    setAuthTokens(accessToken, refreshToken);
    localStorage.setItem('rag_user', JSON.stringify(newUser));
    syncCookies(accessToken, newUser.role);
    setToken(accessToken);
    setUser(newUser);
    router.replace('/chat');
  }, [router]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('rag_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/api/auth/logout', { refreshToken });
      }
    } catch {
      // Ignore logout errors
    } finally {
      clearAuthTokens();
      syncCookies(null, null);
      setUser(null);
      setToken(null);
      router.replace('/login');
    }
  }, [router]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

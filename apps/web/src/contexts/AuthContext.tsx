'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('rag_access_token');
    const savedUserStr = localStorage.getItem('rag_user');

    if (savedToken && savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setUser(savedUser);
      } catch (e) {
        clearAuthTokens();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    const { accessToken, refreshToken, user: loggedUser } = res;

    setAuthTokens(accessToken, refreshToken);
    localStorage.setItem('rag_user', JSON.stringify(loggedUser));
    setToken(accessToken);
    setUser(loggedUser);

    if (loggedUser.role === 'admin') {
      router.push('/dashboard');
    } else {
      router.push('/chat');
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole = 'user') => {
    const res = await apiClient.post('/api/auth/register', { name, email, password, role });
    const { accessToken, refreshToken, user: newUser } = res;

    setAuthTokens(accessToken, refreshToken);
    localStorage.setItem('rag_user', JSON.stringify(newUser));
    setToken(accessToken);
    setUser(newUser);
    router.push('/chat');
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
      setUser(null);
      setToken(null);
      router.push('/login');
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

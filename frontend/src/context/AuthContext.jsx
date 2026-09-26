import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [securityConfig, setSecurityConfig] = useState({ xssProtection: true });
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/user/profile');
      setUser(data.user);
      return data.user;
    } catch (err) {
      setUser(null);
      return null;
    }
  }, []);

  const refreshSecurityConfig = useCallback(async () => {
    try {
      const { data } = await api.get('/security/config');
      setSecurityConfig(data.config || { xssProtection: true });
      return data.config;
    } catch (err) {
      console.error('Could not load security configuration', err);
      setSecurityConfig({ xssProtection: true });
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refreshProfile();
      await refreshSecurityConfig();
      setLoading(false);
    })();
  }, [refreshProfile, refreshSecurityConfig]);

  const login = useCallback(async (email, password) => {
    await api.post('/auth/login', { email, password });
    return refreshProfile();
  }, [refreshProfile]);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshProfile,
    refreshSecurityConfig,
    xssProtection: securityConfig.xssProtection !== false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

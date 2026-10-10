// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeviceService } from '../services/deviceService';

export interface LicenseInfo {
  key: string;
  status: 'unused' | 'active' | 'revoked' | 'expired';
  durationDays: number;
  expiresAt: string | null;
  daysRemaining: number | null;
  isLifetime: boolean;
  lastUsedAt?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  license: LicenseInfo | null;
  deviceId: string;
  login: (key: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  adminPassword: string | null;
  setAdminPassword: (pwd: string | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [deviceId] = useState<string>(() => DeviceService.getDeviceId());
  const [adminPassword, setAdminPasswordState] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('cs_ai_admin_pwd') || null;
    } catch {
      return null;
    }
  });

  const setAdminPassword = (pwd: string | null) => {
    setAdminPasswordState(pwd);
    try {
      if (pwd) sessionStorage.setItem('cs_ai_admin_pwd', pwd);
      else sessionStorage.removeItem('cs_ai_admin_pwd');
    } catch {
      // ignore
    }
  };

  // Check existing session on mount
  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/me?deviceId=${encodeURIComponent(deviceId)}`, {
        headers: {
          'x-device-id': deviceId,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.license) {
          setLicense(data.license);
          setIsAuthenticated(true);
          return;
        }
      }
      setIsAuthenticated(false);
      setLicense(null);
    } catch (err) {
      console.error('Auth verification network error:', err);
      setIsAuthenticated(false);
      setLicense(null);
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Activate license key
  const login = async (rawKey: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const fingerprint = DeviceService.getFingerprint();
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId,
        },
        credentials: 'include',
        body: JSON.stringify({
          key: rawKey.trim().toUpperCase(),
          deviceId,
          fingerprint,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to validate license key.' };
      }

      setLicense(data.license);
      setIsAuthenticated(true);
      return { success: true };
    } catch (err: any) {
      console.error('Validation request error:', err);
      return { success: false, error: 'Network error connecting to validation server. Please check your connection.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    } finally {
      setIsAuthenticated(false);
      setLicense(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        license,
        deviceId,
        login,
        logout,
        refreshAuth: checkAuth,
        adminPassword,
        setAdminPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

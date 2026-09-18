'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, tokenStorage } from '../lib/api';
import { useToast } from '../components/Toast';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role?: string;
  membersCount?: number;
  projectsCount?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  organizations: OrganizationSummary[];
  currentOrg: OrganizationSummary | null;
  currentRole: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  quickLogin: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  refreshOrganizations: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [currentOrg, setCurrentOrg] = useState<OrganizationSummary | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { success, error } = useToast();

  const loadUserData = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }

    try {
      const [meRes, orgsRes] = await Promise.all([
        api.me(),
        api.listOrganizations(),
      ]);

      if (meRes.success && meRes.data?.user) {
        setUser(meRes.data.user);
      } else {
        tokenStorage.clearTokens();
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (orgsRes.success && Array.isArray(orgsRes.data)) {
        setOrganizations(orgsRes.data);

        // Restore active organization or select first
        const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('devflow_current_org') : null;
        const matched = orgsRes.data.find((o: OrganizationSummary) => o.id === savedOrgId) || orgsRes.data[0];

        if (matched) {
          setCurrentOrg(matched);
          setCurrentRole(matched.role || 'DEVELOPER');
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      if (res.success && res.data?.accessToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
        success(`Welcome back, ${res.data.user.name}!`, 'Authenticated');
        await loadUserData();
        return true;
      } else {
        error(res.message || 'Invalid credentials. Please try again.', 'Login Failed');
        return false;
      }
    } catch (err: any) {
      error(err.message || 'An unexpected error occurred during login.', 'Login Error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.register({ name, email, password });
      if (res.success && res.data?.accessToken) {
        tokenStorage.setTokens(res.data.accessToken, res.data.refreshToken);
        setUser(res.data.user);
        success('Account created successfully!', 'Welcome to DevFlow');
        await loadUserData();
        return true;
      } else {
        error(res.message || 'Registration failed. Please check your inputs.', 'Signup Error');
        return false;
      }
    } catch (err: any) {
      error(err.message || 'An unexpected error occurred.', 'Signup Error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = async (email: string): Promise<boolean> => {
    return login(email, 'Password123!');
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      tokenStorage.clearTokens();
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      setCurrentRole(null);
      success('You have been signed out successfully.', 'Logged Out');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      setCurrentRole(org.role || 'DEVELOPER');
      if (typeof window !== 'undefined') {
        localStorage.setItem('devflow_current_org', orgId);
      }
      success(`Switched workspace to ${org.name}`);
    }
  };

  const refreshUser = async () => {
    const res = await api.me();
    if (res.success && res.data?.user) {
      setUser(res.data.user);
    }
  };

  const refreshOrganizations = async () => {
    const res = await api.listOrganizations();
    if (res.success && Array.isArray(res.data)) {
      setOrganizations(res.data);
      if (currentOrg) {
        const updated = res.data.find((o: OrganizationSummary) => o.id === currentOrg.id);
        if (updated) {
          setCurrentOrg(updated);
          setCurrentRole(updated.role || 'DEVELOPER');
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        currentRole,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        quickLogin,
        logout,
        switchOrganization,
        refreshUser,
        refreshOrganizations,
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

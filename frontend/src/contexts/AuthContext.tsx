import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';
import type { Owner } from '../types/index.js';

interface AuthContextType {
  owner: Owner | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phoneNumber?: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [owner, setOwner] = useState<Owner | null>(() => {
    try {
      const saved = localStorage.getItem('owner');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // If we already have token and owner cached in localStorage, we are not loading!
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = !!localStorage.getItem('token');
    const hasOwner = !!localStorage.getItem('owner');
    return hasToken && !hasOwner;
  });

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setOwner(res.data);
      localStorage.setItem('owner', JSON.stringify(res.data));
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, owner: ownerData } = res.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('owner', JSON.stringify(ownerData));
    setToken(accessToken);
    setOwner(ownerData);
    setIsLoading(false);
  };

  const register = async (data: { email: string; password: string; name: string; phoneNumber?: string }) => {
    const res = await api.post('/auth/register', data);
    const { accessToken, owner: ownerData } = res.data;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('owner', JSON.stringify(ownerData));
    setToken(accessToken);
    setOwner(ownerData);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
    localStorage.removeItem('cachedApartments');
    localStorage.removeItem('selectedApartmentId');
    setToken(null);
    setOwner(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
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

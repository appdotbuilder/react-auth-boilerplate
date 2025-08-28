import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import type { PublicUser, AuthResponse } from '../../../server/src/schema';

interface AuthContextType {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(() => {
    // Get token from localStorage on initialization
    return localStorage.getItem('auth_token');
  });

  const isAuthenticated = user !== null && token !== null;

  // Validate existing session on app load
  const validateExistingSession = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await trpc.validateSession.query({ token });
      setUser(userData);
    } catch (error) {
      console.error('Session validation failed:', error);
      // Clear invalid token
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateExistingSession();
  }, [validateExistingSession]);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await trpc.login.mutate({ email, password });
      
      // Store token and user data
      localStorage.setItem('auth_token', response.token);
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await trpc.register.mutate({ 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName 
      });
      
      // Store token and user data
      localStorage.setItem('auth_token', response.token);
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    if (token) {
      try {
        await trpc.logout.mutate({ token });
      } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with local logout even if API call fails
      }
    }

    // Clear local state and storage
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
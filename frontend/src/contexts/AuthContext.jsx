import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import authService from '../services/authService';

/*
  AuthContext provides authentication state and methods to the app.
  It manages user info, auth status, loading states, and exposes functions
  for login, logout, registration, Google OAuth, email verification,
  password reset, and setting new passwords.
*/
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();

  // Initialize authentication state only once when app loads
  useEffect(() => {
    if (authInitialized) {
      return;
    }
    initializeAuth();
  }, [authInitialized]); // Watch authInitialized to prevent re-runs
  const initializeAuth = async () => {
    setIsLoading(true);
    
    try {
      const result = await authService.verifyAuth();
      
      if (result.success && result.data.authenticated) {
        setUser(result.data);
        setIsAuthenticated(true);
      } else {
        console.log('User is not authenticated');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error.message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      setAuthInitialized(true);
    }
  };

  const login = async (credentials) => {
    setIsLoading(true);
    
    try {
      const result = await authService.login(credentials);
      
      if (result.success) {
        // Fetch user data after successful login
        const authResult = await authService.verifyAuth();
        if (authResult.success && authResult.data.authenticated) {
          setUser(authResult.data);
          setIsAuthenticated(true);
        }
        
        toast.success('Login successful!');
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login failed:', error.message);
      toast.error('Login failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error.message);
    } finally {
      // Clear client state
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      navigate('/login');
      toast.success('Logged out successfully!');
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    
    try {
      const result = await authService.register(userData);
      
      if (result.success) {
        toast.success('Registration successful! Please verify your email.');
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Manually refresh auth state
  const refreshAuthState = async () => {
    try {
      const result = await authService.verifyAuth();
      if (result.success && result.data.authenticated) {
        setUser(result.data);
        setIsAuthenticated(true);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  // Google OAuth Authentication for both sign up and sign in)
  const googleAuth = async (token) => {
    setIsLoading(true);    
    try {
      const result = await authService.googleAuth(token);      
      if (result.success) {
        // Google auth successful - fetch fresh user data
        const authResult = await authService.verifyAuth();
        
        if (authResult.success && authResult.data.authenticated) {
          setUser(authResult.data);
          setIsAuthenticated(true);
        }
        
        toast.success('Welcome! Google authentication successful.');
        return { success: true, data: result.data };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('AuthContext: Google auth exception:', error.message);
      toast.error('Google authentication failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Email Verification
  const verifyEmail = async (otp) => {
    setIsLoading(true);
    
    try {
      const result = await authService.verifyEmail(otp);
      
      if (result.success) {
        toast.success('Email verified successfully! You can now login.');
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Email verification failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Request
  const requestPasswordReset = async (email) => {
    setIsLoading(true);
    
    try {
      const result = await authService.requestPasswordReset(email);
      
      if (result.success) {
        toast.success('Password reset email sent! Please check your inbox.');
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Failed to send password reset email. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Set New Password
  const setNewPassword = async (passwordData) => {
    setIsLoading(true);
    
    try {
      const result = await authService.setNewPassword(passwordData);
      
      if (result.success) {
        toast.success('Password reset successful! You can now login with your new password.');
        return { success: true };
      } else {
        toast.error(result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      toast.error('Password reset failed. Please try again.');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    refreshAuthState,
    googleAuth,
    verifyEmail,
    requestPasswordReset,
    setNewPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
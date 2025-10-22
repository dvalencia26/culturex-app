import axiosInstance from '../utils/axiosInstance';

/**
 * Authentication Service is the API layer for authentication-related operations.
 * Handles all HTTP requests to the backend auth endpoints.
 * 
 * It makes the actual API calls, handles request/response, manages errors,
 * and returns standardized results to the calling context (e.g., AuthContext).
 */

export const authService = {
  // User Registration
  register: async (userData) => {
    try {
      const response = await axiosInstance.post('/auth/register/', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  },

  // User Login
  login: async (credentials) => {
    try {
      const response = await axiosInstance.post('/auth/login/', credentials);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  },

  // User Logout
  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout/');
      return { success: true };
    } catch (error) {
      // Even if logout fails on server, clear local state
      console.warn('Logout API failed, but clearing local state');
      return { success: true };
    }
  },

  // Verify Authentication Status
  verifyAuth: async () => {
    try {
      const response = await axiosInstance.get('/auth/verify/');
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 401) {
        return { success: false, authenticated: false };
      }
      throw error; // Re-throw unexpected errors
    }
  },

  // Email Verification
  verifyEmail: async (otp) => {
    try {
      const response = await axiosInstance.post('/auth/verify-email/', { otp });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Email verification failed' 
      };
    }
  },

  // Password Reset Request
  requestPasswordReset: async (email) => {
    try {
      const response = await axiosInstance.post('/auth/password-reset/', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password reset request failed' 
      };
    }
  },

  // Set New Password
  setNewPassword: async (passwordData) => {
    try {
      const response = await axiosInstance.patch('/auth/set-new-password/', passwordData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Password reset failed' 
      };
    }
  },

  // Refresh Token (manual call if needed)
  refreshToken: async () => {
    try {
      const response = await axiosInstance.post('/auth/token/refresh/');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: 'Token refresh failed' };
    }
  },

  // Google OAuth Sign Up/Sign In
  googleAuth: async (token) => {
    try {
      const response = await axiosInstance.post('/auth/google/', { token }); // Make POST request with token
      return { success: true, data: response.data };
    } catch (error) {
      console.error('authService: Google auth API error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Google authentication failed' 
      };
    }
  }
};

export default authService;
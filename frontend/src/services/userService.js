import axiosInstance from '../utils/axiosInstance';

/**
 * User Service handles user and profile-related API operations.
 * Manages user profiles, follow/unfollow functionality, and user searches.
 */

export const userService = {
  // Get user profile by handle (username or ID)
  getUserProfile: async (handle) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${handle}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to fetch profile data' 
      };
    }
  },

  // Toggle follow/unfollow user
  toggleFollow: async (handle) => {
    try {
      const response = await axiosInstance.post(`/auth/toggle-follow/${handle}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to toggle follow status' 
      };
    }
  },

  // Update current user's profile
  updateProfile: async (handle, profileData) => {
    try {
      const response = await axiosInstance.patch(`/auth/profile/${handle}/update/`, profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update profile',
      };
    }
  },

  // Presign profile image upload
  presignProfileImageUpload: async (contentType) => {
    try {
      const response = await axiosInstance.post('/auth/presign-profile-upload/', {
        content_type: contentType,
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate upload URL',
      };
    }
  },

};

export default userService;
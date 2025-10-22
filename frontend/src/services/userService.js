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

};

export default userService;
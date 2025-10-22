import axiosInstance from '../utils/axiosInstance';

/**
 * Post Service handles all post-related API operations.
 * Manages posts CRUD operations, filtering, and search functionality.
 */

export const postService = {
  // Get all posts with optional filtering
  getAllPosts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params if provided
      if (filters.country) params.append('country', filters.country);
      if (filters.location_scope) params.append('location_scope', filters.location_scope);
      if (filters.author) params.append('author', filters.author);
      if (filters.city) params.append('city', filters.city);
      if (filters.search) params.append('search', filters.search);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const queryString = params.toString();
      const url = queryString ? `/auth/posts/?${queryString}` : '/auth/posts/';
      
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch posts'
      };
    }
  },

  // Create a new post
  createPost: async (postData) => {
    try {
      const response = await axiosInstance.post('/auth/posts/', postData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create post'
      };
    }
  },

  // Get posts by a specific user
  getUserPosts: async (username) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${username}/posts/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch user posts'
      };
    }
  },

  // Get current user's posts (including drafts)
  getMyPosts: async (statusFilter = null) => {
    try {
      const url = statusFilter 
        ? `/auth/my-posts/?status=${statusFilter}` 
        : '/auth/my-posts/';
      
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch your posts'
      };
    }
  },

  // Get a specific post by username and slug
  getPost: async (username, slug) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${username}/posts/${slug}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch post'
      };
    }
  },

  // Update a post (full update)
  updatePost: async (username, slug, postData) => {
    try {
      const response = await axiosInstance.put(`/auth/profile/${username}/posts/${slug}/`, postData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update post'
      };
    }
  },

  // Patch a post (partial update)
  patchPost: async (username, slug, postData) => {
    try {
      const response = await axiosInstance.patch(`/auth/profile/${username}/posts/${slug}/`, postData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update post'
      };
    }
  },

  // Delete a post
  deletePost: async (username, slug) => {
    try {
      const response = await axiosInstance.delete(`/auth/profile/${username}/posts/${slug}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete post'
      };
    }
  },

  // Search posts
  searchPosts: async (searchTerm, filters = {}) => {
    try {
      const searchFilters = { ...filters, search: searchTerm };
      return await postService.getAllPosts(searchFilters);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search posts'
      };
    }
  },

  // Get posts by country
  getPostsByCountry: async (countryCode, limit = 20, offset = 0) => {
    try {
      return await postService.getAllPosts({
        country: countryCode,
        limit,
        offset
      });
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch posts for ${countryCode}`
      };
    }
  },

  // Get posts by location scope (city, country, none)
  getPostsByLocationScope: async (locationScope, limit = 20, offset = 0) => {
    try {
      return await postService.getAllPosts({
        location_scope: locationScope,
        limit,
        offset
      });
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch posts by location scope'
      };
    }
  },

  // LOCATION DATA METHODS
  // Get countries for post creation (based on location scope)
  getCountriesForPosts: async (locationScope = 'country') => {
    try {
      const response = await axiosInstance.get(`/auth/countries/?location_scope=${locationScope}`);
      return response.data; // Return data directly for simpler usage
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch countries');
    }
  },

  // Get cities for a specific country 
  getCitiesByCountry: async (countryCode, options = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add all supported parameters
      if (options.search) params.append('search', options.search);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const queryString = params.toString();
      const url = `/auth/countries/${countryCode}/cities/${queryString ? '?' + queryString : ''}`;
      
      const response = await axiosInstance.get(url);
      return response.data; // Return data 
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch cities');
    }
  }
};

export default postService;
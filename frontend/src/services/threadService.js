import axiosInstance from '../utils/axiosInstance';
/**
 * Thread Service handles all thread-related API operations.
 * Manages threads, categories, subcategories, and replies CRUD operations.
 */

export const threadService = {
  // Get all thread categories
  getAllCategories: async () => {
    try {
      const response = await axiosInstance.get('/auth/thread-categories/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch categories'
      };
    }
  },

  // Get category by slug
  getCategory: async (slug) => {
    try {
      const response = await axiosInstance.get(`/auth/thread-categories/${slug}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category'
      };
    }
  },

  // Get subcategories for a category
  getSubcategories: async (categorySlug) => {
    try {
      const response = await axiosInstance.get(`/auth/thread-categories/${categorySlug}/subcategories/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch subcategories'
      };
    }
  },


  // Get all threads with optional filtering
  getAllThreads: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      // Add filters to query params if provided
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      if (filters.country) params.append('country', filters.country);
      if (filters.author) params.append('author', filters.author);
      if (filters.search) params.append('search', filters.search);
      if (filters.pinned !== undefined) params.append('pinned', filters.pinned);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const queryString = params.toString();
      const url = queryString ? `/auth/threads/?${queryString}` : '/auth/threads/';
      
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch threads'
      };
    }
  },

  // Create a new thread
  createThread: async (threadData) => {
    try {
      const response = await axiosInstance.post('/auth/threads/', threadData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create thread'
      };
    }
  },

  // Get current user's threads
  getMyThreads: async () => {
    try {
      const response = await axiosInstance.get('/auth/my-threads/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch your threads'
      };
    }
  },

  // Get threads by a specific user
  getUserThreads: async (username) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${username}/threads/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch user threads'
      };
    }
  },

  // Get a specific thread by username and slug
  getThread: async (username, slug) => {
    try {
      const response = await axiosInstance.get(`/auth/profile/${username}/threads/${slug}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch thread'
      };
    }
  },

  // Update a thread (full update)
  updateThread: async (username, slug, threadData) => {
    try {
      const response = await axiosInstance.put(`/auth/profile/${username}/threads/${slug}/`, threadData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update thread'
      };
    }
  },

  // Patch a thread (partial update)
  patchThread: async (username, slug, threadData) => {
    try {
      const response = await axiosInstance.patch(`/auth/profile/${username}/threads/${slug}/`, threadData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update thread'
      };
    }
  },

  // Delete a thread
  deleteThread: async (username, slug) => {
    try {
      const response = await axiosInstance.delete(`/auth/profile/${username}/threads/${slug}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete thread'
      };
    }
  },

  // Get threads by category
  getThreadsByCategory: async (categorySlug, options = {}) => {
    try {
      const filters = {
        category: categorySlug,
        limit: options.limit || 20,
        offset: options.offset || 0,
        ...options
      };
      return await threadService.getAllThreads(filters);
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch threads for category ${categorySlug}`
      };
    }
  },

  // Get threads by country
  getThreadsByCountry: async (countryCode, options = {}) => {
    try {
      const filters = {
        country: countryCode,
        limit: options.limit || 20,
        offset: options.offset || 0,
        ...options
      };
      return await threadService.getAllThreads(filters);
    } catch (error) {
      return {
        success: false,
        error: `Failed to fetch threads for ${countryCode}`
      };
    }
  },

  // Top 5 Countries by thread count
  getPopularCountries: async (limit = 5) => {
    try {
      const response = await axiosInstance.get(`/auth/popular-countries/?limit=${limit}`);
      return { success: true, data: response.data.countries || [] };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch popular countries'
      };
    }
  },

  // Search threads
  searchThreads: async (searchTerm, filters = {}) => {
    try {
      const searchFilters = { ...filters, search: searchTerm };
      return await threadService.getAllThreads(searchFilters);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to search threads'
      };
    }
  },


  // Get replies for a thread
  getThreadReplies: async (username, slug, options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const queryString = params.toString();
      const url = `/auth/profile/${username}/threads/${slug}/replies/${queryString ? '?' + queryString : ''}`;
      
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch replies'
      };
    }
  },

  // Create a reply to a thread
  createReply: async (username, slug, replyData) => {
    try {
      const response = await axiosInstance.post(
        `/auth/profile/${username}/threads/${slug}/replies/`,
        replyData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create reply'
      };
    }
  },

  // Get a specific reply
  getReply: async (replyId) => {
    try {
      const response = await axiosInstance.get(`/auth/thread-replies/${replyId}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch reply'
      };
    }
  },

  // Update a reply (full update)
  updateReply: async (replyId, replyData) => {
    try {
      const response = await axiosInstance.put(`/auth/thread-replies/${replyId}/`, replyData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update reply'
      };
    }
  },

  // Patch a reply (partial update)
  patchReply: async (replyId, replyData) => {
    try {
      const response = await axiosInstance.patch(`/auth/thread-replies/${replyId}/`, replyData);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update reply'
      };
    }
  },

  // Delete a reply
  deleteReply: async (replyId) => {
    try {
      const response = await axiosInstance.delete(`/auth/thread-replies/${replyId}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete reply'
      };
    }
  },

  // Get nested replies (child replies)
  getNestedReplies: async (replyId, options = {}) => {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);

      const queryString = params.toString();
      const url = `/auth/thread-replies/${replyId}/nested/${queryString ? '?' + queryString : ''}`;
      
      const response = await axiosInstance.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch nested replies'
      };
    }
  }
};
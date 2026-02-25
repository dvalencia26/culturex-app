import axiosInstance from '../utils/axiosInstance';

// Get the backend base URL (without /api/v1) for share links
const getShareBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
  // Remove /api/v1 suffix to get the base backend URL
  return apiUrl.replace(/\/api\/v1\/?$/, '');
};

export const shareService = {
  // Get share link for a given content type and ID
  async getShareLink(contentType, contentId) {
    try {
      const response = await axiosInstance.post(`/auth/share/${contentType}/${contentId}/`);
      const code = response.data.code;
      const shareUrl = `${getShareBaseUrl()}/s/${code}/`;
      return { 
        success: true, 
        data: { 
          ...response.data, 
          url: shareUrl 
        } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to create share link' 
      };
    }
  }
};

export default shareService;

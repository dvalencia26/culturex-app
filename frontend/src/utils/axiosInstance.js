import axios from 'axios';

/**
 * axiosInstance
 * -----------------
 * Centralized HTTP client used by the frontend to talk to the Django API.
 *
 * Why use this instance instead of axios directly:
 * - Adds CSRF protection automatically for all state-changing requests (POST/PUT/PATCH/DELETE)
 * - Sends cookies (HTTPOnly JWTs) with every request via withCredentials
 * - Performs a single automatic access-token refresh on 401 responses
 * - Ensures a single baseURL so calls can use relative paths like `/auth/login/`
 *
 * Flow overview:
 * - On first state-changing request, we fetch a CSRF token from `/auth/csrf-token/` and cache it in memory
 * - A request interceptor attaches `X-CSRFToken` for unsafe HTTP methods
 * - A response interceptor retries a failed request once after refreshing the access token using the refresh token cookie
 */

// Axios instance for the backend API with CSRF protection and single token refresh attempt
// This is used to make requests to the backend API. 
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const axiosInstance = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }, // Set the content type to JSON
  withCredentials: true, // Send cookies with the request
});

let csrfToken = null;
// Lazily fetch and cache the CSRF token (per tab). This avoids an extra call
// on every request and guarantees the header is present when needed.
const getCSRFToken = async () => {
  if (!csrfToken) {
    const res = await axios.get(`${baseURL}/auth/csrf-token/`, { withCredentials: true });
    csrfToken = res.data.csrf_token;
  }
  return csrfToken;
};

axiosInstance.interceptors.request.use(async (config) => {
  // Only attach CSRF for unsafe methods per HTTP spec
  const needsCSRF = ['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase());
  if (needsCSRF) {
    const token = await getCSRFToken();
    if (token) config.headers['X-CSRFToken'] = token; 
  }
  return config;
});

// Track refresh attempts per request to prevent infinite loops
const refreshingRequests = new Set();

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    // Don't refresh for these endpoints since they don't need auth
    const skip = ['/auth/login/', '/auth/logout/', '/auth/register/', '/auth/csrf-token/', '/auth/token/refresh/'].some((u) => url.includes(u));

    // Prevent refresh attempts for already-refreshing requests
    const requestKey = `${originalRequest.method}_${url}`;
    
    if (status === 401 && !skip && !originalRequest._retry && !refreshingRequests.has(requestKey)) {
      originalRequest._retry = true; // Mark this request as having been retried
      refreshingRequests.add(requestKey);
      
      try {
        await axios.post(`${baseURL}/auth/token/refresh/`, {}, { withCredentials: true });
        refreshingRequests.delete(requestKey);
        
        // Clear CSRF token to force refetch with new session
        csrfToken = null;
        
        // After a successful refresh, retry the original request transparently
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        refreshingRequests.delete(requestKey);
        // If refresh fails, fall through and let the caller handle 401 (e.g., redirect to login)
        console.log('Token refresh failed, user needs to re-login');
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
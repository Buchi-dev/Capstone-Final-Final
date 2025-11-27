/**
 * Axios API Client Configuration
 * Centralized HTTP client for Express REST API with Firebase authentication
 */
import axios, { type AxiosInstance } from 'axios';
import { auth } from './firebase.config';

// API Base URL - use localhost:5000 in development, or when served from same domain in production
export const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL || '')
  : 'http://localhost:5000';

// Log API configuration on startup
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🌐 API Configuration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Environment: ${import.meta.env.MODE}`);
console.log(`API Base URL: ${API_BASE_URL || 'relative paths (proxied)'}`);
console.log(`Development Mode: ${import.meta.env.DEV}`);
console.log(`Production Mode: ${import.meta.env.PROD}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

/**
 * Create axios instance with default configuration
 * - withCredentials: true enables session cookies
 * - timeout: 10 seconds for authentication (fast-fail), 30 seconds for reports/analytics
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Required for session-based authentication
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds default - auth should fail fast
});

/**
 * Request interceptor
 * Add user ID to X-User-ID header for authenticated requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Add user ID from localStorage if available
    const userId = localStorage.getItem('userId');
    if (userId) {
      config.headers['X-User-ID'] = userId;
      if (import.meta.env.DEV) {
        console.log(`[API] Added user ID header for request to:`, config.url);
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('[API] No user ID available for request to:', config.url);
      }
    }
    
    // Add timestamp for debugging
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle global error responses (401, 403, 500, etc.)
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in dev mode
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // Handle domain validation errors (403 with AUTH_INVALID_DOMAIN)
      if (status === 403 && data.errorCode === 'AUTH_INVALID_DOMAIN') {
        console.error('[API] Domain validation failed:', data.message);
        // Don't redirect, let the component handle it
        return Promise.reject(error);
      }
      
      // Handle authentication errors
      if (status === 401) {
        console.warn('[API] Unauthorized - Session expired or not logged in', data);
        
        // Check if this request has already been retried
        const config = error.config;
        if (config._retry) {
          console.error('[API] Token refresh retry failed - backend rejecting token');
          console.error('[API] Backend error:', data.message || data.error || 'Unknown error');
          console.error('[API] Full error response:', data);
          
          // Check for Firebase service account permission issues
          if (data.message && data.message.includes('serviceusage.serviceUsageConsumer')) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('🔥 FIREBASE CONFIGURATION ERROR 🔥');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('The Firebase service account is missing required permissions.');
            console.error('');
            console.error('Solution:');
            console.error('1. Go to: https://console.developers.google.com/iam-admin/iam/project?project=smupuretrack');
            console.error('2. Find your service account');
            console.error('3. Add role: "Service Usage Consumer" (roles/serviceusage.serviceUsageConsumer)');
            console.error('4. Wait a few minutes for propagation');
            console.error('5. Restart the backend server');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            alert('⚠️ Firebase Configuration Error\n\nThe backend server has a Firebase permission issue.\nPlease check the browser console for details and contact your system administrator.');
            return Promise.reject(error);
          }
          
          // DON'T redirect if we're on admin/staff pages - let component handle the error
          // Only redirect if on auth pages or public pages where auth failure means session expired
          const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
          
          if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
            console.log('[API] Redirecting to login - retry failed and not on protected page');
            window.location.href = '/auth/login?session=expired';
          } else {
            console.warn('[API] 401 error on protected page - displaying error to user instead of redirecting');
          }
          
          return Promise.reject(error);
        }
        
        // Check if Firebase user still exists - if not, truly logged out
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          console.error('[API] No Firebase user detected');
          
          // Don't redirect from admin/staff pages - let the component show the error
          const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
          
          if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
            console.log('[API] Redirecting to login - no user and not on protected page');
            window.location.href = '/auth/login?session=expired';
          } else {
            console.warn('[API] No user on protected page - displaying error instead of redirecting');
          }
          
          return Promise.reject(error);
        } else {
          // Try to refresh the token once
          try {
            console.log('[API] Attempting to refresh token...');
            const newToken = await currentUser.getIdToken(true); // force refresh
            if (import.meta.env.DEV) {
              const maskedToken = newToken.substring(0, 10) + '...' + newToken.substring(newToken.length - 10);
              console.log('[API] Token refreshed successfully, retrying request once (token:', maskedToken + ')');
            } else {
              console.log('[API] Token refreshed successfully, retrying request once');
            }
            
            // Mark this request as retried to prevent infinite loops
            config._retry = true;
            config.headers.Authorization = `Bearer ${newToken}`;
            
            // Retry the original request with new token
            return apiClient.request(config);
          } catch (refreshError) {
            console.error('[API] Token refresh failed:', refreshError);
            
            // Don't redirect from admin/staff pages - let the component show the error
            const isAdminOrStaffPage = window.location.pathname.includes('/admin') || window.location.pathname.includes('/staff');
            
            if (!isAdminOrStaffPage && !window.location.pathname.includes('/login') && !window.location.pathname.includes('/auth/')) {
              console.log('[API] Redirecting to login - token refresh failed and not on protected page');
              window.location.href = '/auth/login?session=expired';
            } else {
              console.warn('[API] Token refresh failed on protected page - displaying error instead of redirecting');
            }
            
            return Promise.reject(refreshError);
          }
        }
      }
      
      // Handle permission errors
      if (status === 403) {
        console.warn('[API] Forbidden - Insufficient permissions');
      }
      
      // Handle server errors
      if (status >= 500) {
        console.error('[API] Server Error:', data.message || 'Internal server error');
      }
      
      // Log error in dev mode
      if (import.meta.env.DEV) {
        console.error(`[API Error] ${error.config?.url}`, {
          status,
          message: data.message,
          error: data.error,
        });
      }
    } else if (error.request) {
      // Request was made but no response received (network error)
      console.error('[API] Network Error - No response from server');
    } else {
      // Error during request setup
      console.error('[API] Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Helper function to extract error message from API error
 */
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { 
      response?: { 
        data?: { 
          message?: string; 
          error?: string;
          errorCode?: string;
        } 
      }; 
      message?: string;
      code?: string;
    };
    
    // Check for domain validation error
    if (err.response?.data?.errorCode === 'AUTH_INVALID_DOMAIN') {
      return err.response.data.message || 
        'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted.';
    }
    
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    
    // Handle timeout errors specifically
    if (err.code === 'ECONNABORTED' && err.message?.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }
    
    if (err.message) {
      return err.message;
    }
  }
  return 'An unexpected error occurred';
};

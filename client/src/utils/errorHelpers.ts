/**
 * Error Handling Utilities
 * Provides consistent error message normalization across the application
 */

/**
 * Extract a normalized error message from various error types
 * @param error - Error object (Error, AxiosError, string, or unknown)
 * @returns Normalized error message string
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'An unknown error occurred';
  }

  // Handle Error instances
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }

  // Handle Axios errors (with response.data.message)
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    
    // Axios error with response
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    
    // Axios error with request
    if (err.request && !err.response) {
      return 'Network error - no response from server';
    }
    
    // Generic error object with message
    if (err.message) {
      return err.message;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback
  return 'An unexpected error occurred';
}

/**
 * Format error for display to users
 * @param error - Error object
 * @param context - Optional context string (e.g., 'updating user role')
 * @returns User-friendly error message
 */
export function formatUserError(error: unknown, context?: string): string {
  const message = getErrorMessage(error);
  
  if (context) {
    return `Error ${context}: ${message}`;
  }
  
  return message;
}

/**
 * Check if error is a network error
 * @param error - Error object
 * @returns True if error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    return (
      err.code === 'ECONNABORTED' ||
      err.code === 'ERR_NETWORK' ||
      (err.request && !err.response) ||
      err.message?.toLowerCase().includes('network')
    );
  }
  return false;
}

/**
 * Check if error is an authentication error
 * @param error - Error object
 * @returns True if error is auth-related
 */
export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as any;
    return (
      err.response?.status === 401 ||
      err.response?.status === 403 ||
      err.code === 'UNAUTHORIZED' ||
      err.message?.toLowerCase().includes('unauthorized') ||
      err.message?.toLowerCase().includes('authentication')
    );
  }
  return false;
}

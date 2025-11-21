/**
 * Status Utilities
 * Shared utilities for status indicators
 */

import { useThemeToken } from '../theme';

/**
 * Get status color from theme
 */
export const useStatusColor = () => {
  const token = useThemeToken();
  
  return {
    good: token.colorSuccess,
    warning: token.colorWarning,
    critical: token.colorError,
    info: token.colorInfo,
    primary: token.colorPrimary,
    error: token.colorError,
    success: token.colorSuccess,
    textSecondary: token.colorTextSecondary,
  };
};

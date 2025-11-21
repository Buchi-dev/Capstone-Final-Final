/**
 * useAuth Hook
 * Custom hook to access authentication context
 */

import { useContext } from 'react';
import { AuthContext } from './auth.context';

/**
 * Custom hook to use auth context
 * Throws error if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

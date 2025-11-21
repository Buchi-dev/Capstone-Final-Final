/**
 * useAuth - Global Hook for Authentication
 * 
 * Provides authentication state and operations.
 * This is a re-export wrapper around AuthContext for consistency.
 * 
 * @module hooks/useAuth
 */

import { useAuth as useAuthContext } from '../contexts/AuthContext';

/**
 * Access authentication state and operations
 * 
 * @example
 * const { user, isAuthenticated, loading, login, logout, refetchUser } = useAuth();
 * 
 * if (loading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPage />;
 * 
 * return <Dashboard user={user} />;
 */
export function useAuth() {
  return useAuthContext();
}

export default useAuth;

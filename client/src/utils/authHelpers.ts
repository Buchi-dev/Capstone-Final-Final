/**
 * Authentication Helper Utilities
 * Provides helper functions for token management and debugging
 */

import { auth } from '../config/firebase';

/**
 * Force refresh the current user's ID token
 * This is useful when custom claims have been updated on the backend
 * 
 * @returns {Promise<string>} The new token
 */
export async function refreshUserToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  // Force refresh the token (forceRefresh: true)
  const token = await user.getIdToken(true);
  return token;
}

/**
 * Get the current user's token claims
 * Useful for debugging authentication issues
 * 
 * @returns {Promise<any>} The token claims object
 */
export async function getUserTokenClaims(): Promise<any> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No user is currently signed in');
  }

  const tokenResult = await user.getIdTokenResult();
  return tokenResult.claims;
}

/**
 * Check if the current user has admin role in their token
 * 
 * @returns {Promise<boolean>} True if user has admin role in token
 */
export async function isAdminInToken(): Promise<boolean> {
  try {
    const claims = await getUserTokenClaims();
    return claims.role === 'Admin';
  } catch {
    return false;
  }
}

/**
 * Log current user's authentication details
 * Useful for debugging permission issues
 */
export async function logAuthDebugInfo(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    console.log('🔴 No user signed in');
    return;
  }

  console.group('🔐 Auth Debug Info');
  console.log('User ID:', user.uid);
  console.log('Email:', user.email);
  
  try {
    const tokenResult = await user.getIdTokenResult();
    console.log('Token Claims:', tokenResult.claims);
    console.log('Role in Token:', tokenResult.claims.role || 'NOT SET');
    console.log('Status in Token:', tokenResult.claims.status || 'NOT SET');
    console.log('Token Issue Time:', new Date(tokenResult.issuedAtTime));
    console.log('Token Expiration:', new Date(tokenResult.expirationTime));
  } catch (error) {
    console.error('Error getting token:', error);
  }
  
  console.groupEnd();
}

/**
 * Refresh token and verify admin status
 * Returns detailed information about the refresh operation
 */
export async function refreshAndVerifyAdmin(): Promise<{
  success: boolean;
  isAdmin: boolean;
  role: string;
  message: string;
}> {
  try {
    await refreshUserToken();
    const claims = await getUserTokenClaims();
    const isAdmin = claims.role === 'Admin';
    
    return {
      success: true,
      isAdmin,
      role: claims.role || 'NOT SET',
      message: isAdmin 
        ? 'Token refreshed. Admin role confirmed.' 
        : `Token refreshed but role is '${claims.role}', not 'Admin'.`
    };
  } catch (error: any) {
    return {
      success: false,
      isAdmin: false,
      role: 'ERROR',
      message: error.message || 'Failed to refresh token'
    };
  }
}

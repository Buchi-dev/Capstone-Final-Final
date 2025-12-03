/**
 * Navigation Helper Utilities
 * Centralized logic for determining user navigation destinations
 * SINGLE SOURCE OF TRUTH for routing logic
 */

import type { AuthUser } from '../services/auth.Service';

/**
 * Determine where user should be redirected based on status and profile
 * @param user - Current authenticated user
 * @returns Route path string
 */
export function getUserDestination(user: AuthUser | null): string {
  if (!user) {
    return '/auth/login';
  }

  // Suspended users
  if (user.status === 'suspended') {
    return '/auth/account-suspended';
  }

  // Pending users - check if profile is complete
  if (user.status === 'pending') {
    const hasProfile = isProfileComplete(user);
    
    if (!hasProfile) {
      return '/auth/account-completion';
    }
    
    return '/auth/pending-approval';
  }

  // Active users - route by role
  if (user.status === 'active') {
    if (user.role === 'admin') {
      return '/admin/dashboard';
    }
    
    if (user.role === 'staff') {
      return '/staff/dashboard';
    }
    
    // Fallback for unknown roles
    return '/dashboard';
  }

  // Default fallback for unknown status
  return '/auth/pending-approval';
}

/**
 * Check if user profile is complete
 * Profile is complete when user has both department and phone number
 * @param user - User to check
 * @returns true if profile is complete
 */
export function isProfileComplete(user: AuthUser | null): boolean {
  if (!user) return false;
  
  // Check both fields exist and are non-empty strings
  const hasDepartment = !!(user.department && user.department.trim().length > 0);
  const hasPhoneNumber = !!(user.phoneNumber && user.phoneNumber.trim().length > 0);
  
  return hasDepartment && hasPhoneNumber;
}

/**
 * Check if user should see account completion page
 * @param user - Current user
 * @returns true if user needs to complete profile
 */
export function needsProfileCompletion(user: AuthUser | null): boolean {
  if (!user) return false;
  
  return user.status === 'pending' && !isProfileComplete(user);
}

/**
 * Check if user should see pending approval page
 * @param user - Current user
 * @returns true if user is pending with complete profile
 */
export function isPendingApproval(user: AuthUser | null): boolean {
  if (!user) return false;
  
  return user.status === 'pending' && isProfileComplete(user);
}

/**
 * Check if user has access to dashboard
 * @param user - Current user
 * @returns true if user is active
 */
export function hasAccessToDashboard(user: AuthUser | null): boolean {
  if (!user) return false;
  
  return user.status === 'active';
}

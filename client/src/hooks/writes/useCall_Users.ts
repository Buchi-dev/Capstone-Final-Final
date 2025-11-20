/**
 * useCall_Users - Write Hook
 * 
 * Handles user write operations (update status, update role).
 * Wraps usersService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useState, useCallback } from 'react';
import { usersService } from '../../services/user.Service';
import type { UserRole, UserStatus } from '../../schemas';

/**
 * User operation types
 */
type UserOperation = 'updateStatus' | 'updateUser' | 'updateUserProfile' | 'deleteUser' | 'getUserPreferences' | 'setupPreferences';

/**
 * Update user response
 */
interface UpdateUserResult {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    status?: UserStatus;
    role?: UserRole;
  };
  /** Indicates whether the user should be logged out after this operation */
  requiresLogout?: boolean;
}

/**
 * Update user profile response
 * Profile updates (name, department, phone) do NOT trigger logout
 */
interface UpdateUserProfileResult {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    department?: string;
    phoneNumber?: string;
  };
}

/**
 * Hook return value
 */
interface UseCallUsersReturn {
  /** Update user status only */
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  /** Update user status and/or role */
  updateUser: (userId: string, status?: UserStatus, role?: UserRole) => Promise<UpdateUserResult>;
  /** Update user profile information (name, department, phone) */
  updateUserProfile: (
    userId: string,
    profileData: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      department?: string;
      phoneNumber?: string;
    }
  ) => Promise<UpdateUserProfileResult>;
  /** Delete user account (Firebase Auth + Firestore) */
  deleteUser: (userId: string) => Promise<void>;
  /** Get user notification preferences */
  getUserPreferences: (userId: string) => Promise<any>;
  /** Setup/update user notification preferences */
  setupPreferences: (preferences: any) => Promise<any>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Currently executing operation type */
  operationType: UserOperation | null;
  /** Result from last update operation */
  updateResult: UpdateUserResult | UpdateUserProfileResult | null;
  /** Reset error, success states, and update result */
  reset: () => void;
}

/**
 * Hook for user write operations
 * 
 * Provides functions to update user status, roles, and notification preferences
 * with proper loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   updateUserStatus, 
 *   updateUser,
 *   getUserPreferences,
 *   setupPreferences,
 *   isLoading, 
 *   error, 
 *   isSuccess,
 *   updateResult
 * } = useCall_Users();
 * 
 * // Update user status only
 * await updateUserStatus('user-123', 'Approved');
 * 
 * // Update user status and role
 * const result = await updateUser('user-123', 'Approved', 'Staff');
 * 
 * // Get user notification preferences
 * const prefs = await getUserPreferences('user-123');
 * 
 * // Setup notification preferences
 * await setupPreferences({
 *   userId: 'user-123',
 *   email: 'user@example.com',
 *   emailNotifications: true,
 *   alertSeverities: ['Critical', 'Warning']
 * });
 * 
 * if (isSuccess) {
 *   message.success('User updated successfully');
 * }
 * ```
 * 
 * @returns User operation functions and state
 */
export const useCall_Users = (): UseCallUsersReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [operationType, setOperationType] = useState<UserOperation | null>(null);
  const [updateResult, setUpdateResult] = useState<UpdateUserResult | UpdateUserProfileResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setOperationType(null);
    setUpdateResult(null);
  }, []);

  const updateUserStatus = useCallback(async (
    userId: string, 
    status: UserStatus
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('updateStatus');
      setUpdateResult(null);

      const response = await usersService.updateUserStatus(userId, status);

      setIsSuccess(true);
      setUpdateResult({
        success: response.success,
        message: response.message,
        userId: response.data.id,
        updates: { status: response.data.status },
        requiresLogout: response.requiresLogout,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user status');
      console.error('[useCall_Users] Update status error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (
    userId: string,
    status?: UserStatus,
    role?: UserRole
  ): Promise<UpdateUserResult> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('updateUser');
      setUpdateResult(null);

      const response = await usersService.updateUser(userId, status, role);

      const result: UpdateUserResult = {
        success: response.success,
        message: response.message,
        userId: response.userId,
        updates: response.updates,
      };

      setIsSuccess(true);
      setUpdateResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user');
      console.error('[useCall_Users] Update user error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getUserPreferences = useCallback(async (userId: string): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('getUserPreferences');

      const preferences = await usersService.getUserPreferences(userId);

      setIsSuccess(true);
      return preferences;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get user preferences');
      console.error('[useCall_Users] Get preferences error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupPreferences = useCallback(async (preferences: any): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('setupPreferences');

      const savedPreferences = await usersService.setupPreferences(preferences);

      setIsSuccess(true);
      return savedPreferences;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to setup preferences');
      console.error('[useCall_Users] Setup preferences error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUserProfile = useCallback(async (
    userId: string,
    profileData: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      department?: string;
      phoneNumber?: string;
    }
  ): Promise<UpdateUserProfileResult> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('updateUserProfile');
      setUpdateResult(null);

      const response = await usersService.updateUserProfile(userId, profileData);

      const result: UpdateUserProfileResult = {
        success: response.success,
        message: response.message,
        userId: response.data.id,
        updates: response.updates,
      };

      setIsSuccess(true);
      setUpdateResult(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user profile');
      console.error('[useCall_Users] Update user profile error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('deleteUser');
      setUpdateResult(null);

      await usersService.deleteUser(userId);

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete user');
      console.error('[useCall_Users] Delete user error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    updateUserStatus,
    updateUser,
    updateUserProfile,
    deleteUser,
    getUserPreferences,
    setupPreferences,
    isLoading,
    error,
    isSuccess,
    operationType,
    updateResult,
    reset,
  };
};

export default useCall_Users;

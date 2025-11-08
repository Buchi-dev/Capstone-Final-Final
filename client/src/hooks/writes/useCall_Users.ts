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
type UserOperation = 'updateStatus' | 'updateUser';

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
}

/**
 * Hook return value
 */
interface UseCallUsersReturn {
  /** Update user status only */
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  /** Update user status and/or role */
  updateUser: (userId: string, status?: UserStatus, role?: UserRole) => Promise<UpdateUserResult>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Currently executing operation type */
  operationType: UserOperation | null;
  /** Result from last update operation */
  updateResult: UpdateUserResult | null;
  /** Reset error, success states, and update result */
  reset: () => void;
}

/**
 * Hook for user write operations
 * 
 * Provides functions to update user status and roles with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   updateUserStatus, 
 *   updateUser, 
 *   isLoading, 
 *   error, 
 *   isSuccess,
 *   updateResult
 * } = useCall_Users();
 * 
 * // Update user status only
 * await updateUserStatus('user-123', 'active');
 * 
 * // Update user status and role
 * const result = await updateUser('user-123', 'active', 'staff');
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
  const [updateResult, setUpdateResult] = useState<UpdateUserResult | null>(null);

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
        userId: response.userId,
        updates: { status: response.status },
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

  return {
    updateUserStatus,
    updateUser,
    isLoading,
    error,
    isSuccess,
    operationType,
    updateResult,
    reset,
  };
};

export default useCall_Users;

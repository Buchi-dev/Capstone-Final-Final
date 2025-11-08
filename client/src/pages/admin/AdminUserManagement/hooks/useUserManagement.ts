/**
 * User Management Hook
 * Custom hook for managing users with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { userManagementService } from '../../../../services/user.Service';
import type { UserListData } from '../../../../services/user.Service';
import type { UserRole, UserStatus } from '../../../../contexts';

export interface UseUserManagementReturn {
  users: UserListData[];
  loading: boolean;
  error: string | null;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  updateUser: (userId: string, status?: UserStatus, role?: UserRole) => Promise<void>;
  refreshing: boolean;
}

export const useUserManagement = (): UseUserManagementReturn => {
  const [users, setUsers] = useState<UserListData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time user updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = userManagementService.subscribeToUsers(
      (updatedUsers) => {
        setUsers(updatedUsers);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        setRefreshing(false);
        message.error('Failed to load users: ' + err.message);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update user status
  const updateUserStatus = useCallback(async (userId: string, status: UserStatus) => {
    try {
      setRefreshing(true);
      await userManagementService.updateUserStatus(userId, status);
      message.success(`User status updated to ${status}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update user status';
      message.error(errorMsg);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Update user role
  const updateUserRole = useCallback(async (userId: string, role: UserRole) => {
    try {
      setRefreshing(true);
      await userManagementService.updateUser(userId, undefined, role);
      message.success(`User role updated to ${role}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update user role';
      message.error(errorMsg);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Update user (status and/or role)
  const updateUser = useCallback(async (userId: string, status?: UserStatus, role?: UserRole) => {
    try {
      setRefreshing(true);
      await userManagementService.updateUser(userId, status, role);
      
      const updates = [];
      if (status) updates.push(`status to ${status}`);
      if (role) updates.push(`role to ${role}`);
      
      message.success(`User updated: ${updates.join(' and ')}`);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update user';
      message.error(errorMsg);
      throw err;
    } finally {
      setRefreshing(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    updateUserStatus,
    updateUserRole,
    updateUser,
    refreshing,
  };
};

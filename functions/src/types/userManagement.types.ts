/**
 * Type Definitions - User Management Module
 * Centralized type definitions for user management operations
 *
 * @module types/userManagement.types
 */

import {UserRole, UserStatus} from "./index";

// ===========================
// REQUEST TYPES
// ===========================

/**
 * Request payload for updating user status
 */
export interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

/**
 * Request payload for updating user (status and/or role)
 */
export interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

/**
 * Request payload for bulk approving users
 */
export interface BulkApproveUsersRequest {
  userIds: string[];
}

/**
 * Request payload for deleting a user
 */
export interface DeleteUserRequest {
  userId: string;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Standard success response for user operations
 */
export interface UserOperationResponse {
  success: boolean;
  message: string;
  userId?: string;
  status?: UserStatus;
  role?: UserRole;
  updates?: {
    status?: UserStatus;
    role?: UserRole;
  };
}

/**
 * Response for bulk operations
 */
export interface BulkOperationResponse {
  success: boolean;
  message: string;
  results: {
    succeeded: string[];
    failed: Array<{
      userId: string;
      error: string;
    }>;
  };
}

/**
 * Response for list users operation
 */
export interface ListUsersResponse {
  success: boolean;
  users: UserListItem[];
  count: number;
}

/**
 * User item in list response
 */
export interface UserListItem {
  id: string;
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
}

// ===========================
// VALIDATION TYPES
// ===========================

/**
 * Result of user validation
 */
export interface UserValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Result of self-modification check
 */
export interface SelfModificationCheck {
  isSelf: boolean;
  isAllowed: boolean;
  reason?: string;
}

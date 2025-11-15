/**
 * User Management Type Definitions
 * Type definitions specific to user management operations
 *
 * @module types/userManagement.types
 */

import type {UserStatus, UserRole} from "../constants/User.Constants";

// ===========================
// REQUEST TYPES
// ===========================

/**
 * User management request payload
 * Unified request type for all user management operations
 */
export interface UserManagementRequest {
  action:
    | "updateStatus"
    | "updateUser"
    | "updateUserProfile"
    | "deleteUser"
    | "setupPreferences";

  userId?: string;
  status?: UserStatus;
  role?: UserRole;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  department?: string;
  phoneNumber?: string;
  email?: string;
  emailNotifications?: boolean;
  sendScheduledAlerts?: boolean;
  alertSeverities?: string[];
  parameters?: string[];
  devices?: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Union type for all user management responses
 */
export type UserManagementResponse =
  | UpdateStatusResponse
  | UpdateUserResponse
  | UpdateUserProfileResponse
  | DeleteUserResponse
  | PreferencesResponse;

/**
 * Response for status update operation
 */
export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  userId: string;
  status: UserStatus;
  /** Indicates whether the user should be logged out after this operation */
  requiresLogout?: boolean;
}

/**
 * Response for user update operation
 */
export interface UpdateUserResponse {
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
 * Response for user profile update operation
 * Profile updates (name, department, phone) do NOT trigger logout
 */
export interface UpdateUserProfileResponse {
  success: boolean;
  message: string;
  userId: string;
  updates: {
    firstname?: string;
    middlename?: string;
    lastname?: string;
    department?: string;
    phoneNumber?: string;
  };
}

/**
 * Response for user deletion operation
 */
export interface DeleteUserResponse {
  success: boolean;
  message: string;
  userId: string;
  deletedFromAuth: boolean;
  deletedFromFirestore: boolean;
  /** Indicates whether the user should be logged out after this operation */
  requiresLogout?: boolean;
}

/**
 * Notification Preferences Types
 * Type definitions for notification preference operations
 *
 * @module types/notificationPreferences.types
 */

// ===========================
// NOTIFICATION PREFERENCES TYPES
// ===========================

/**
 * Notification Preferences Document
 */
export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// ===========================
// RESPONSE TYPES
// ===========================

/**
 * Response for single preference operations
 */
export interface PreferencesResponse {
  success: boolean;
  message?: string;
  data?: NotificationPreferences | null;
  error?: string;
}

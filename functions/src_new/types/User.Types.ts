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
    | "setupPreferences";

  userId?: string;
  status?: UserStatus;
  role?: UserRole;
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
  | PreferencesResponse;

/**
 * Response for status update operation
 */
export interface UpdateStatusResponse {
  success: boolean;
  message: string;
  userId: string;
  status: UserStatus;
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

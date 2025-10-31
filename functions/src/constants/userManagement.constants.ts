/**
 * User Management Constants
 * Domain-specific constants for user management operations
 *
 * @module constants/userManagement.constants
 */

// ===========================
// USER ROLE CONSTANTS
// ===========================

/**
 * Available user roles in the system
 */
export const USER_ROLES = {
  STAFF: "Staff",
  ADMIN: "Admin",
} as const;

// ===========================
// USER STATUS CONSTANTS
// ===========================

/**
 * Available user account statuses
 */
export const USER_STATUSES = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SUSPENDED: "Suspended",
} as const;

// ===========================
// VALIDATION LIMITS
// ===========================

/**
 * Maximum number of users that can be bulk approved at once
 */
export const MAX_BULK_APPROVE_LIMIT = 100;

// ===========================
// USER MANAGEMENT ACTIONS
// ===========================

/**
 * User management action types for logging
 */
export const USER_ACTIONS = {
  STATUS_UPDATED: "user_status_updated",
  ROLE_UPDATED: "user_role_updated",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  BULK_APPROVED: "users_bulk_approved",
} as const;

// ===========================
// LOG PREFIXES
// ===========================

/**
 * Logging prefixes for consistency
 */
export const LOG_PREFIXES = {
  INFO: "[USER-MGMT]",
  SUCCESS: "[USER-MGMT-SUCCESS]",
  ERROR: "[USER-MGMT-ERROR]",
  BLOCKED: "[USER-MGMT-BLOCKED]",
} as const;

// ===========================
// ERROR MESSAGES
// ===========================

/**
 * Standardized error messages for user management
 */
export const USER_MGMT_ERROR_MESSAGES = {
  USER_NOT_FOUND: "User not found",
  INVALID_STATUS: "Invalid user status",
  INVALID_ROLE: "Invalid user role",
  CANNOT_MODIFY_SELF: "You cannot modify your own account",
  CANNOT_SUSPEND_SELF: "You cannot suspend your own account",
  CANNOT_CHANGE_OWN_ROLE: "You cannot change your own role",
  CANNOT_DELETE_SELF: "You cannot delete your own account",
  BULK_LIMIT_EXCEEDED: `Cannot approve more than ${MAX_BULK_APPROVE_LIMIT} users at once`,
  MISSING_REQUIRED_FIELDS: "Required fields are missing",
  UNAUTHENTICATED: "You must be logged in to perform this action",
  PERMISSION_DENIED: "Only administrators can perform this action",
} as const;

// ===========================
// SUCCESS MESSAGES
// ===========================

/**
 * Standardized success messages for user management
 */
export const USER_MGMT_SUCCESS_MESSAGES = {
  STATUS_UPDATED: (status: string) => `User status updated to ${status}`,
  USER_UPDATED: "User updated successfully",
  USER_DELETED: "User deleted successfully",
  BULK_APPROVED: (count: number, total: number) =>
    `Approved ${count} of ${total} users`,
} as const;

/**
 * User Management Utility Functions
 * Reusable helper functions for user management operations
 *
 * @module utils/userManagementHelpers
 */

import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {db} from "../config/firebase";
import {
  USER_ROLES,
  USER_STATUSES,
  USER_MGMT_ERROR_MESSAGES,
  LOG_PREFIXES,
  USER_ACTIONS,
} from "../constants/userManagement.constants";
import type {
  UserRole,
  UserStatus,
  UserValidationResult,
  SelfModificationCheck,
} from "../types";

// ===========================
// AUTHENTICATION & AUTHORIZATION
// ===========================

/**
 * Validates that the caller is authenticated and is an admin
 * @param {any} auth - Authentication context from callable function
 * @throws {HttpsError} If user is not authenticated or not an admin
 */
export function requireAdmin(auth: any): void {
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      USER_MGMT_ERROR_MESSAGES.UNAUTHENTICATED
    );
  }

  if (auth.token.role !== USER_ROLES.ADMIN) {
    throw new HttpsError(
      "permission-denied",
      USER_MGMT_ERROR_MESSAGES.PERMISSION_DENIED
    );
  }
}

// ===========================
// VALIDATION FUNCTIONS
// ===========================

/**
 * Validates if a status value is valid
 * @param {UserStatus} status - Status to validate
 * @return {UserValidationResult} Validation result
 */
export function validateStatus(status: UserStatus): UserValidationResult {
  const validStatuses = Object.values(USER_STATUSES);
  const isValid = validStatuses.includes(status);

  return {
    isValid,
    error: isValid ? undefined : USER_MGMT_ERROR_MESSAGES.INVALID_STATUS,
  };
}

/**
 * Validates if a role value is valid
 * @param {UserRole} role - Role to validate
 * @return {UserValidationResult} Validation result
 */
export function validateRole(role: UserRole): UserValidationResult {
  const validRoles = Object.values(USER_ROLES);
  const isValid = validRoles.includes(role);

  return {
    isValid,
    error: isValid ? undefined : USER_MGMT_ERROR_MESSAGES.INVALID_ROLE,
  };
}

/**
 * Checks if the operation is a self-modification and if it's allowed
 * @param {string} callerId - ID of the user making the request
 * @param {string} targetUserId - ID of the user being modified
 * @param {UserStatus} [newStatus] - New status being set (if any)
 * @param {UserRole} [newRole] - New role being set (if any)
 * @return {SelfModificationCheck} Result of the check
 */
export function checkSelfModification(
  callerId: string,
  targetUserId: string,
  newStatus?: UserStatus,
  newRole?: UserRole
): SelfModificationCheck {
  const isSelf = callerId === targetUserId;

  if (!isSelf) {
    return {isSelf: false, isAllowed: true};
  }

  // Check for suspension of self
  if (newStatus === USER_STATUSES.SUSPENDED) {
    return {
      isSelf: true,
      isAllowed: false,
      reason: USER_MGMT_ERROR_MESSAGES.CANNOT_SUSPEND_SELF,
    };
  }

  // Check for role demotion of self
  if (newRole === USER_ROLES.STAFF) {
    return {
      isSelf: true,
      isAllowed: false,
      reason: USER_MGMT_ERROR_MESSAGES.CANNOT_CHANGE_OWN_ROLE,
    };
  }

  // Allow other self-modifications
  return {isSelf: true, isAllowed: true};
}

// ===========================
// DATABASE OPERATIONS
// ===========================

/**
 * Fetches a user document from Firestore
 * @param {string} userId - User document ID
 * @return {Promise<FirebaseFirestore.DocumentSnapshot>} User document
 * @throws {HttpsError} If user not found
 */
export async function fetchUserDocument(
  userId: string
): Promise<FirebaseFirestore.DocumentSnapshot> {
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", USER_MGMT_ERROR_MESSAGES.USER_NOT_FOUND);
  }

  return userDoc;
}

/**
 * Updates custom claims in Firebase Auth
 * @param {string} userId - User ID
 * @param {Partial<{status: UserStatus; role: UserRole}>} claims - Claims to update
 * @return {Promise<void>}
 */
export async function updateUserClaims(
  userId: string,
  claims: Partial<{status: UserStatus; role: UserRole}>
): Promise<void> {
  await admin.auth().setCustomUserClaims(userId, claims);
}

/**
 * Builds update data object with metadata
 * @param {string} callerId - ID of user making the change
 * @param {Partial<{status: UserStatus; role: UserRole}>} updates - Fields to update
 * @return {any} Update data object
 */
export function buildUpdateData(
  callerId: string,
  updates: Partial<{status: UserStatus; role: UserRole}>
): any {
  const updateData: any = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: callerId,
  };

  if (updates.status) {
    updateData.status = updates.status;
  }

  if (updates.role) {
    updateData.role = updates.role;
  }

  return updateData;
}

// ===========================
// LOGGING FUNCTIONS
// ===========================

/**
 * Logs a user management action for audit trail
 * @param {string} action - Action type
 * @param {string} targetUserId - User being affected
 * @param {string} performedBy - User performing the action
 * @param {any} metadata - Additional action metadata
 * @return {Promise<void>}
 */
export async function logUserAction(
  action: string,
  targetUserId: string,
  performedBy: string,
  metadata?: any
): Promise<void> {
  try {
    await db.collection("business_logs").add({
      action,
      targetUserId,
      performedBy,
      metadata: metadata || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break the operation
    console.error(`${LOG_PREFIXES.ERROR} Failed to log action:`, error);
  }
}

// ===========================
// FORMATTING FUNCTIONS
// ===========================

/**
 * Formats user data for list response
 * @param {string} docId - Document ID
 * @param {any} data - User data from Firestore
 * @return {any} Formatted user object
 */
export function formatUserForList(docId: string, data: any): any {
  return {
    id: docId,
    uuid: data.uuid,
    firstname: data.firstname || "",
    lastname: data.lastname || "",
    middlename: data.middlename || "",
    department: data.department || "",
    phoneNumber: data.phoneNumber || "",
    email: data.email,
    role: data.role,
    status: data.status,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString(),
    lastLogin: data.lastLogin?.toDate().toISOString(),
  };
}

// ===========================
// ERROR HANDLING
// ===========================

/**
 * Wraps errors in HttpsError for consistent error responses
 * @param {any} error - Error to wrap
 * @param {string} defaultMessage - Default message if error is unknown
 * @return {HttpsError} Formatted error
 */
export function wrapError(error: any, defaultMessage: string): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  return new HttpsError("internal", errorMessage);
}

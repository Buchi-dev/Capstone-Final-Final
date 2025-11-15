/**
 * User Management & Notification Preferences Function
 * Centralized single callable for all user-related operations.
 */

import {FieldValue} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

import {db} from "../config/firebase";
import type {UserStatus, UserRole} from "../constants";
import {
  USER_MANAGEMENT_ERRORS,
  USER_MANAGEMENT_MESSAGES,
  NOTIFICATION_PREFERENCES_ERRORS,
  NOTIFICATION_PREFERENCES_MESSAGES,
  DEFAULT_NOTIFICATION_PREFERENCES,
  VALID_USER_STATUSES,
  VALID_USER_ROLES,
  COLLECTIONS,
  FIELD_NAMES,
} from "../constants";
import type {
  UserManagementRequest,
  UserManagementResponse,
  UpdateStatusResponse,
  UpdateUserResponse,
  UpdateUserProfileResponse,
  DeleteUserResponse,
  PreferencesResponse,
  NotificationPreferences,
} from "../types";
import {withErrorHandling} from "../utils/ErrorHandlers";
import {createRoutedFunction} from "../utils/SwitchCaseRouting";
import {
  isValidEmail,
  sanitizeStringArray,
  isValidTimeString,
  isValidAlertSeverity,
} from "../utils/validators";

// ==================================================
// 🔹 VALIDATION HELPERS
// ==================================================

/**
 * Validates that the provided status is a valid user status.
 * @param {UserStatus} status - The status to validate
 * @throws {HttpsError} If the status is invalid
 */
function validateStatus(status: UserStatus): void {
  if (!VALID_USER_STATUSES.includes(status)) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.INVALID_STATUS(VALID_USER_STATUSES) // eslint-disable-line new-cap
    );
  }
}

/**
 * Validates that the provided role is a valid user role.
 * @param {UserRole} role - The role to validate
 * @throws {HttpsError} If the role is invalid
 */
function validateRole(role: UserRole): void {
  if (!VALID_USER_ROLES.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.INVALID_ROLE(VALID_USER_ROLES) // eslint-disable-line new-cap
    );
  }
}

/**
 * Validates that a user is not attempting to suspend themselves.
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {string} targetUserId - The ID of the target user
 * @param {UserStatus} newStatus - The new status being set
 * @throws {HttpsError} If user attempts to suspend themselves
 */
function validateNotSuspendingSelf(
  currentUserId: string,
  targetUserId: string,
  newStatus: UserStatus
): void {
  if (currentUserId === targetUserId && newStatus === "Suspended") {
    throw new HttpsError(
      "failed-precondition",
      USER_MANAGEMENT_ERRORS.CANNOT_SUSPEND_SELF
    );
  }
}

/**
 * Validates that a user is not attempting to change their own role to Staff.
 * @param {string} currentUserId - The ID of the user performing the action
 * @param {string} targetUserId - The ID of the target user
 * @param {UserRole} newRole - The new role being set
 * @throws {HttpsError} If user attempts to change own role to Staff
 */
function validateNotChangingOwnRole(
  currentUserId: string,
  targetUserId: string,
  newRole: UserRole
): void {
  if (currentUserId === targetUserId && newRole === "Staff") {
    throw new HttpsError(
      "failed-precondition",
      USER_MANAGEMENT_ERRORS.CANNOT_CHANGE_OWN_ROLE
    );
  }
}

// ==================================================
// 🔹 TRANSFORMERS & UTILITIES
// ==================================================

/**
 * Builds an update data object for Firestore operations.
 * @param {string} performedBy - The ID of the user performing the update
 * @param {object} updates - The updates to apply
 * @param {UserStatus} [updates.status] - Optional status update
 * @param {UserRole} [updates.role] - Optional role update
 * @return {Record<string, unknown>} The update data object
 */
function buildUpdateData(
  performedBy: string,
  updates: Partial<{ status: UserStatus; role: UserRole }>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    // eslint-disable-next-line new-cap
    [FIELD_NAMES.UPDATED_AT]: FieldValue.serverTimestamp(),
    [FIELD_NAMES.UPDATED_BY]: performedBy,
  };

  if (updates.status) updateData[FIELD_NAMES.STATUS] = updates.status;
  if (updates.role) updateData[FIELD_NAMES.ROLE] = updates.role;

  return updateData;
}

// ==================================================
// 🔹 HANDLERS: USER MANAGEMENT
// ==================================================

/**
 * Handles updating a user's status (Active, Suspended).
 * @param {CallableRequest<UserManagementRequest>} request - The callable request
 * @return {Promise<UpdateStatusResponse>} Response with updated status
 * @throws {HttpsError} If validation fails or user not found
 */
async function handleUpdateStatus(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateStatusResponse> {
  const {userId, status} = request.data;
  if (!userId || !status) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.STATUS_REQUIRED);
  }

  validateStatus(status);

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
      }

      validateNotSuspendingSelf(request.auth!.uid, userId, status);

      await userRef.update(buildUpdateData(request.auth!.uid, {status}));

      // Self-update: user changed their own status - requires logout
      const isSelfUpdate = request.auth!.uid === userId;

      return {
        success: true,
        // eslint-disable-next-line new-cap
        message: USER_MANAGEMENT_MESSAGES.STATUS_UPDATED(status),
        userId,
        status,
        requiresLogout: isSelfUpdate,
      };
    },
    "updating user status",
    USER_MANAGEMENT_ERRORS.UPDATE_STATUS_FAILED
  );
}

/**
 * Handles updating a user's status and/or role.
 * @param {CallableRequest<UserManagementRequest>} request - The callable request
 * @return {Promise<UpdateUserResponse>} Response with updated user data
 * @throws {HttpsError} If validation fails or user not found
 */
async function handleUpdateUser(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateUserResponse> {
  const {userId, status, role} = request.data;

  if (!userId) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED);
  }
  if (!status && !role) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.UPDATE_FIELD_REQUIRED);
  }

  if (status) validateStatus(status);
  if (role) validateRole(role);

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
      }

      const isSelfUpdate = request.auth!.uid === userId;
      if (isSelfUpdate) {
        if (status === "Suspended") {
          validateNotSuspendingSelf(request.auth!.uid, userId, status);
        }
        if (role === "Staff") {
          validateNotChangingOwnRole(request.auth!.uid, userId, role);
        }
      }

      await userRef.update(buildUpdateData(request.auth!.uid, {status, role}));

      // Self-update: user changed their own role or status - requires logout
      return {
        success: true,
        message: USER_MANAGEMENT_MESSAGES.USER_UPDATED,
        userId,
        updates: {status, role},
        requiresLogout: isSelfUpdate,
      };
    },
    "updating user",
    USER_MANAGEMENT_ERRORS.UPDATE_USER_FAILED
  );
}

/**
 * Handles updating a user's profile information (name, department, phone).
 * @param {CallableRequest<UserManagementRequest>} request - The callable request
 * @return {Promise<UpdateUserProfileResponse>} Response with updated user profile
 * @throws {HttpsError} If validation fails or user not found
 */
async function handleUpdateUserProfile(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateUserProfileResponse> {
  const {userId, firstname, middlename, lastname, department, phoneNumber} = request.data;

  if (!userId) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED);
  }

  // At least one field must be provided
  if (!firstname && !middlename && !lastname && !department && !phoneNumber) {
    throw new HttpsError("invalid-argument", "At least one field must be provided for update");
  }

  // Validate phone number format (exactly 11 digits)
  if (phoneNumber !== undefined) {
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new HttpsError("invalid-argument", "Phone number must be exactly 11 digits");
    }
  }

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
      }

      // Build update data with only provided fields
      const updateData: Record<string, unknown> = {
        // eslint-disable-next-line new-cap
        [FIELD_NAMES.UPDATED_AT]: FieldValue.serverTimestamp(),
        [FIELD_NAMES.UPDATED_BY]: request.auth!.uid,
      };

      if (firstname !== undefined) updateData.firstname = firstname.trim();
      if (middlename !== undefined) updateData.middlename = middlename.trim();
      if (lastname !== undefined) updateData.lastname = lastname.trim();
      if (department !== undefined) updateData.department = department.trim();
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber.trim();

      await userRef.update(updateData);

      return {
        success: true,
        message: "User profile updated successfully",
        userId,
        updates: {firstname, middlename, lastname, department, phoneNumber},
      };
    },
    "updating user profile",
    "Failed to update user profile"
  );
}

/**
 * Handles deleting a user account (both Firebase Auth and Firestore).
 * @param {CallableRequest<UserManagementRequest>} request - The callable request
 * @return {Promise<DeleteUserResponse>} Response with deletion status
 * @throws {HttpsError} If validation fails or user not found
 */
async function handleDeleteUser(
  request: CallableRequest<UserManagementRequest>
): Promise<DeleteUserResponse> {
  const {userId} = request.data;

  if (!userId) {
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED);
  }

  // Prevent self-deletion (this validation ensures requiresLogout won't be true for self-delete)
  if (request.auth!.uid === userId) {
    throw new HttpsError("failed-precondition", USER_MANAGEMENT_ERRORS.CANNOT_DELETE_SELF);
  }

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);
      }

      const userData = userDoc.data();
      const authUid = userData?.uuid; // UUID is the Firebase Auth UID

      let deletedFromAuth = false;
      let deletedFromFirestore = false;

      // Delete from Firebase Auth
      if (authUid) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const {auth} = require("../config/firebase");
          await auth.deleteUser(authUid);
          deletedFromAuth = true;
          console.log(`[DeleteUser] Deleted user ${userId} from Firebase Auth (UID: ${authUid})`);
        } catch (authError: unknown) {
          console.error("[DeleteUser] Failed to delete from Auth:", authError);
          // Continue to delete from Firestore even if Auth deletion fails
          if ((authError as {code?: string}).code === "auth/user-not-found") {
            // Auth account doesn't exist, that's okay
            deletedFromAuth = true;
          } else {
            throw new HttpsError("internal", USER_MANAGEMENT_ERRORS.DELETE_AUTH_FAILED);
          }
        }
      } else {
        console.warn(`[DeleteUser] No UUID found for user ${userId}, skipping Auth deletion`);
        deletedFromAuth = true; // Mark as true since there's nothing to delete
      }

      // Delete notification preferences subcollection
      try {
        const prefsSnapshot = await userRef.collection("notificationPreferences").get();
        const batch = db.batch();
        prefsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        console.log(`[DeleteUser] Deleted notification preferences for user ${userId}`);
      } catch (prefsError) {
        console.error("[DeleteUser] Failed to delete preferences:", prefsError);
        // Continue with user deletion even if prefs deletion fails
      }

      // Delete from Firestore
      try {
        await userRef.delete();
        deletedFromFirestore = true;
        console.log(`[DeleteUser] Deleted user ${userId} from Firestore`);
      } catch (firestoreError) {
        console.error("[DeleteUser] Failed to delete from Firestore:", firestoreError);
        throw new HttpsError("internal", USER_MANAGEMENT_ERRORS.DELETE_FIRESTORE_FAILED);
      }

      // Note: requiresLogout is false because self-deletion is blocked by validation above
      return {
        success: true,
        message: USER_MANAGEMENT_MESSAGES.USER_DELETED,
        userId,
        deletedFromAuth,
        deletedFromFirestore,
        requiresLogout: false,
      };
    },
    "deleting user",
    USER_MANAGEMENT_ERRORS.DELETE_USER_FAILED
  );
}

// ==================================================
// 🔹 HANDLERS: NOTIFICATION PREFERENCES
// ==================================================

/**
 * Handles setting up or updating notification preferences for a user.
 * @param {CallableRequest<UserManagementRequest>} request - The callable request
 * @return {Promise<PreferencesResponse>} Response with saved preferences
 * @throws {HttpsError} If validation fails or user not found
 */
async function handleSetupPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const {
    userId,
    email,
    emailNotifications,
    sendScheduledAlerts,
    alertSeverities,
    parameters,
    devices,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
  } = request.data;

  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  // Validation: Required fields
  if (!userId || !email) {
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_REQUIRED_FIELDS
    );
  }

  // Validation: Email format
  if (!isValidEmail(email)) {
    throw new HttpsError("invalid-argument", "Invalid email format");
  }

  // Validation: Authentication
  if (!requestingUserId) {
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);
  }

  // Validation: Authorization
  if (userId !== requestingUserId && !isAdmin) {
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);
  }

  // Validation: Email required if notifications enabled
  if (emailNotifications && !email) {
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.EMAIL_REQUIRED);
  }

  // Validation: Quiet hours time format
  if (quietHoursStart && !isValidTimeString(quietHoursStart)) {
    throw new HttpsError("invalid-argument", "Invalid quietHoursStart format. Use HH:MM (24-hour)");
  }
  if (quietHoursEnd && !isValidTimeString(quietHoursEnd)) {
    throw new HttpsError("invalid-argument", "Invalid quietHoursEnd format. Use HH:MM (24-hour)");
  }

  // Sanitize: Alert severities
  const sanitizedAlertSeverities = alertSeverities ?
    sanitizeStringArray(alertSeverities, 10).filter(isValidAlertSeverity) :
    undefined;

  // Sanitize: Parameters
  const sanitizedParameters = parameters ?
    sanitizeStringArray(parameters, 20) :
    undefined;

  // Sanitize: Devices
  const sanitizedDevices = devices ?
    sanitizeStringArray(devices, 50) :
    undefined;

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", NOTIFICATION_PREFERENCES_ERRORS.USER_NOT_FOUND);
      }

      // Check if preferences already exist in subcollection
      const prefsCollectionRef = userRef.collection("notificationPreferences");
      const existingPrefsSnapshot = await prefsCollectionRef.limit(1).get();

      const preferencesData: Record<string, unknown> = {
        userId,
        email,
        emailNotifications: emailNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.EMAIL_NOTIFICATIONS,
        sendScheduledAlerts: sendScheduledAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.SEND_SCHEDULED_ALERTS,
        alertSeverities: sanitizedAlertSeverities ?? DEFAULT_NOTIFICATION_PREFERENCES.ALERT_SEVERITIES,
        parameters: sanitizedParameters ?? DEFAULT_NOTIFICATION_PREFERENCES.PARAMETERS,
        devices: sanitizedDevices ?? DEFAULT_NOTIFICATION_PREFERENCES.DEVICES,
        quietHoursEnabled: quietHoursEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_ENABLED,
        quietHoursStart: quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_START,
        quietHoursEnd: quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_END,
        // eslint-disable-next-line new-cap
        updatedAt: FieldValue.serverTimestamp(),
      };

      // eslint-disable-next-line new-cap
      if (existingPrefsSnapshot.empty) {
        // Create new document
        preferencesData.createdAt = FieldValue.serverTimestamp();
        await prefsCollectionRef.add(preferencesData);
      } else {
        // Update existing document
        await existingPrefsSnapshot.docs[0].ref.update(preferencesData);
      }

      // Retrieve the saved preferences
      const savedPrefsSnapshot = await prefsCollectionRef.limit(1).get();
      const savedPrefs = savedPrefsSnapshot.empty ? null :
        savedPrefsSnapshot.docs[0].data() as NotificationPreferences;

      return {
        success: true,
        message: existingPrefsSnapshot.empty ?
          NOTIFICATION_PREFERENCES_MESSAGES.CREATE_SUCCESS :
          NOTIFICATION_PREFERENCES_MESSAGES.UPDATE_SUCCESS,
        data: savedPrefs ? {...savedPrefs, userId} : null,
      };
    },
    "setting up preferences",
    NOTIFICATION_PREFERENCES_ERRORS.SETUP_FAILED
  );
}

// ==================================================
// 🔹 EXPORT FUNCTION ENTRYPOINT
// ==================================================

export const UserCalls = onCall<
  UserManagementRequest,
  Promise<UserManagementResponse>
>(
  createRoutedFunction<UserManagementRequest, UserManagementResponse>(
    {
      updateStatus: handleUpdateStatus,
      updateUser: handleUpdateUser,
      updateUserProfile: handleUpdateUserProfile,
      deleteUser: handleDeleteUser,
      setupPreferences: handleSetupPreferences,
    },
    {
      requireAuth: true,
      requireAdmin: false,
      actionField: "action",
    }
  )
);

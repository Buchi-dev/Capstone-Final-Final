/**
 * User Management & Notification Preferences Function
 * Centralized single callable for all user-related operations.
 */

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

import { db } from "../config/firebase";
import type { UserStatus, UserRole } from "../constants";
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
  SORT_ORDERS,
} from "../constants";

import type {
  UserManagementRequest,
  UserManagementResponse,
  UpdateStatusResponse,
  UpdateUserResponse,
  ListUsersResponse,
  PreferencesResponse,
  NotificationPreferences,
  ListUserData,
} from "../types";

import { createRoutedFunction } from "../utils/SwitchCaseRouting";
import { withErrorHandling } from "../utils/ErrorHandlers";

// ==================================================
// 🔹 VALIDATION HELPERS
// ==================================================

function validateStatus(status: UserStatus): void {
  if (!VALID_USER_STATUSES.includes(status)) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.INVALID_STATUS(VALID_USER_STATUSES)
    );
  }
}

function validateRole(role: UserRole): void {
  if (!VALID_USER_ROLES.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      USER_MANAGEMENT_ERRORS.INVALID_ROLE(VALID_USER_ROLES)
    );
  }
}

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

function transformUserDocToListData(
  docId: string,
  data: FirebaseFirestore.DocumentData
): ListUserData {
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

function buildUpdateData(
  performedBy: string,
  updates: Partial<{ status: UserStatus; role: UserRole }>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    [FIELD_NAMES.UPDATED_AT]: admin.firestore.FieldValue.serverTimestamp(),
    [FIELD_NAMES.UPDATED_BY]: performedBy,
  };

  if (updates.status) updateData[FIELD_NAMES.STATUS] = updates.status;
  if (updates.role) updateData[FIELD_NAMES.ROLE] = updates.role;

  return updateData;
}

async function updateUserCustomClaims(
  userId: string,
  claims: Partial<{ status: UserStatus; role: UserRole }>
): Promise<void> {
  return await withErrorHandling(
    async () => {
      const customClaims: Record<string, string> = {};

      if (claims.status) customClaims[FIELD_NAMES.STATUS] = claims.status;
      if (claims.role) customClaims[FIELD_NAMES.ROLE] = claims.role;

      await admin.auth().setCustomUserClaims(userId, customClaims);
    },
    "updating user custom claims",
    "Failed to update authentication claims"
  );
}

// ==================================================
// 🔹 HANDLERS: USER MANAGEMENT
// ==================================================

async function handleUpdateStatus(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateStatusResponse> {
  const { userId, status } = request.data;
  if (!userId || !status)
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.STATUS_REQUIRED);

  validateStatus(status);

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists)
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);

      validateNotSuspendingSelf(request.auth!.uid, userId, status);

      await userRef.update(buildUpdateData(request.auth!.uid, { status }));
      await updateUserCustomClaims(userId, { status });

      return {
        success: true,
        message: USER_MANAGEMENT_MESSAGES.STATUS_UPDATED(status),
        userId,
        status,
      };
    },
    "updating user status",
    USER_MANAGEMENT_ERRORS.UPDATE_STATUS_FAILED
  );
}

async function handleUpdateUser(
  request: CallableRequest<UserManagementRequest>
): Promise<UpdateUserResponse> {
  const { userId, status, role } = request.data;

  if (!userId)
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.USER_ID_REQUIRED);
  if (!status && !role)
    throw new HttpsError("invalid-argument", USER_MANAGEMENT_ERRORS.UPDATE_FIELD_REQUIRED);

  if (status) validateStatus(status);
  if (role) validateRole(role);

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists)
        throw new HttpsError("not-found", USER_MANAGEMENT_ERRORS.USER_NOT_FOUND);

      const isSelfUpdate = request.auth!.uid === userId;
      if (isSelfUpdate) {
        if (status === "Suspended")
          validateNotSuspendingSelf(request.auth!.uid, userId, status);
        if (role === "Staff")
          validateNotChangingOwnRole(request.auth!.uid, userId, role);
      }

      await userRef.update(buildUpdateData(request.auth!.uid, { status, role }));
      await updateUserCustomClaims(userId, { status, role });

      return {
        success: true,
        message: USER_MANAGEMENT_MESSAGES.USER_UPDATED,
        userId,
        updates: { status, role },
      };
    },
    "updating user",
    USER_MANAGEMENT_ERRORS.UPDATE_USER_FAILED
  );
}

async function handleListUsers(
  _request: CallableRequest<UserManagementRequest>
): Promise<ListUsersResponse> {
  return await withErrorHandling(
    async () => {
      const snapshot = await db
        .collection(COLLECTIONS.USERS)
        .orderBy(SORT_ORDERS.CREATED_AT_DESC.field, SORT_ORDERS.CREATED_AT_DESC.direction)
        .get();

      const users = snapshot.docs.map((doc) =>
        transformUserDocToListData(doc.id, doc.data())
      );

      return { success: true, users, count: users.length };
    },
    "listing users",
    USER_MANAGEMENT_ERRORS.LIST_USERS_FAILED
  );
}

// ==================================================
// 🔹 HANDLERS: NOTIFICATION PREFERENCES
// ==================================================

async function handleGetUserPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const { userId } = request.data;
  const requestingUserId = request.auth?.uid;
  const isAdmin = request.auth?.token?.role === "Admin";

  if (!userId)
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.MISSING_USER_ID);
  if (!requestingUserId)
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);
  if (userId !== requestingUserId && !isAdmin)
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);

  return await withErrorHandling(
    async () => {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();

      if (!userDoc.exists)
        return { success: true, message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND, data: null };

      const preferences = userDoc.get(
        FIELD_NAMES.NOTIFICATION_PREFERENCES
      ) as NotificationPreferences | undefined;

      if (!preferences)
        return { success: true, message: NOTIFICATION_PREFERENCES_MESSAGES.NOT_FOUND, data: null };

      return {
        success: true,
        message: NOTIFICATION_PREFERENCES_MESSAGES.GET_SUCCESS,
        data: { ...preferences, userId: preferences.userId ?? userId },
      };
    },
    "getting user preferences",
    NOTIFICATION_PREFERENCES_ERRORS.GET_FAILED
  );
}

async function handleSetupPreferences(
  request: CallableRequest<UserManagementRequest>
): Promise<PreferencesResponse> {
  const {
    userId,
    email,
    emailNotifications,
    pushNotifications,
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

  if (!userId || !email)
    throw new HttpsError(
      "invalid-argument",
      NOTIFICATION_PREFERENCES_ERRORS.MISSING_REQUIRED_FIELDS
    );

  if (!requestingUserId)
    throw new HttpsError("unauthenticated", NOTIFICATION_PREFERENCES_ERRORS.UNAUTHENTICATED);

  if (userId !== requestingUserId && !isAdmin)
    throw new HttpsError("permission-denied", NOTIFICATION_PREFERENCES_ERRORS.PERMISSION_DENIED);

  if (emailNotifications && !email)
    throw new HttpsError("invalid-argument", NOTIFICATION_PREFERENCES_ERRORS.EMAIL_REQUIRED);

  return await withErrorHandling(
    async () => {
      const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists)
        throw new HttpsError("not-found", NOTIFICATION_PREFERENCES_ERRORS.USER_NOT_FOUND);

      const existingPrefs = userDoc.get(
        FIELD_NAMES.NOTIFICATION_PREFERENCES
      ) as NotificationPreferences | undefined;

      const preferencesData: Record<string, unknown> = {
        userId,
        email,
        emailNotifications: emailNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.EMAIL_NOTIFICATIONS,
        pushNotifications: pushNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.PUSH_NOTIFICATIONS,
        sendScheduledAlerts: sendScheduledAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.SEND_SCHEDULED_ALERTS,
        alertSeverities: alertSeverities ?? DEFAULT_NOTIFICATION_PREFERENCES.ALERT_SEVERITIES,
        parameters: parameters ?? DEFAULT_NOTIFICATION_PREFERENCES.PARAMETERS,
        devices: devices ?? DEFAULT_NOTIFICATION_PREFERENCES.DEVICES,
        quietHoursEnabled: quietHoursEnabled ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_ENABLED,
        quietHoursStart: quietHoursStart ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_START,
        quietHoursEnd: quietHoursEnd ?? DEFAULT_NOTIFICATION_PREFERENCES.QUIET_HOURS_END,
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (!existingPrefs) preferencesData.createdAt = FieldValue.serverTimestamp();

      await userRef.set(
        { [FIELD_NAMES.NOTIFICATION_PREFERENCES]: preferencesData },
        { merge: true }
      );

      const savedDoc = await userRef.get();
      const savedPrefs = savedDoc.get(
        FIELD_NAMES.NOTIFICATION_PREFERENCES
      ) as NotificationPreferences | undefined;

      return {
        success: true,
        message: existingPrefs
          ? NOTIFICATION_PREFERENCES_MESSAGES.UPDATE_SUCCESS
          : NOTIFICATION_PREFERENCES_MESSAGES.CREATE_SUCCESS,
        data: savedPrefs ? { ...savedPrefs, userId } : null,
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
      listUsers: handleListUsers,
      getUserPreferences: handleGetUserPreferences,
      setupPreferences: handleSetupPreferences,
    },
    {
      requireAuth: true,
      requireAdmin: false,
      actionField: "action",
    }
  )
);

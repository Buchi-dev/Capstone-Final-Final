/**
 * User Management Callable Functions
 * Secure server-side functions for managing users, roles, and status
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {db} from "../config/firebase";
import {FieldValue} from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import {UserRole, UserStatus} from "../types";

interface UpdateUserStatusRequest {
  userId: string;
  status: UserStatus;
}

interface UpdateUserRequest {
  userId: string;
  status?: UserStatus;
  role?: UserRole;
}

/**
 * Verify that the caller is an admin
 */
function requireAdmin(auth: any) {
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to perform this action"
    );
  }

  if (auth.token.role !== "Admin") {
    throw new HttpsError(
      "permission-denied",
      "Only administrators can perform this action"
    );
  }
}

/**
 * Update user status (Approve/Suspend/Pending)
 */
export const updateUserStatus = onCall<UpdateUserStatusRequest>(
  async (request) => {
    // Verify admin permissions
    requireAdmin(request.auth);

    const {userId, status} = request.data;

    // Validate input
    if (!userId || !status) {
      throw new HttpsError(
        "invalid-argument",
        "userId and status are required"
      );
    }

    const validStatuses: UserStatus[] = ["Pending", "Approved", "Suspended"];
    if (!validStatuses.includes(status)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    try {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      // Prevent admin from suspending themselves
      if (request.auth?.uid === userId && status === "Suspended") {
        throw new HttpsError(
          "failed-precondition",
          "You cannot suspend your own account"
        );
      }

      // Update user status
      await userRef.update({
        status: status,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth?.uid,
      });

      // Set custom claims for Firebase Auth
      await admin.auth().setCustomUserClaims(userId, {
        status: status,
      });

      return {
        success: true,
        message: `User status updated to ${status}`,
        userId: userId,
        status: status,
      };
    } catch (error: any) {
      console.error("Error updating user status:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", "Failed to update user status");
    }
  }
);

/**
 * Update both user status and role in a single operation
 */
export const updateUser = onCall<UpdateUserRequest>(async (request) => {
  // Verify admin permissions
  requireAdmin(request.auth);

  const {userId, status, role} = request.data;

  // Validate input
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId is required");
  }

  if (!status && !role) {
    throw new HttpsError(
      "invalid-argument",
      "At least one of status or role must be provided"
    );
  }

  // Validate status if provided
  if (status) {
    const validStatuses: UserStatus[] = ["Pending", "Approved", "Suspended"];
    if (!validStatuses.includes(status)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }
  }

  // Validate role if provided
  if (role) {
    const validRoles: UserRole[] = ["Admin", "Staff"];
    if (!validRoles.includes(role)) {
      throw new HttpsError(
        "invalid-argument",
        `Invalid role. Must be one of: ${validRoles.join(", ")}`
      );
    }
  }

  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    // Prevent admin from modifying their own account
    if (request.auth?.uid === userId) {
      if (status === "Suspended") {
        throw new HttpsError(
          "failed-precondition",
          "You cannot suspend your own account"
        );
      }
      if (role === "Staff") {
        throw new HttpsError(
          "failed-precondition",
          "You cannot change your own role"
        );
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth?.uid,
    };

    if (status) {
      updateData.status = status;
    }

    if (role) {
      updateData.role = role;
    }

    // Update Firestore document
    await userRef.update(updateData);

    // Update custom claims in Firebase Auth
    const customClaims: any = {};
    if (status) customClaims.status = status;
    if (role) customClaims.role = role;

    await admin.auth().setCustomUserClaims(userId, customClaims);

    return {
      success: true,
      message: "User updated successfully",
      userId: userId,
      updates: {status, role},
    };
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to update user");
  }
});

/**
 * List all users (for admin viewing)
 */
export const listUsers = onCall(async (request) => {
  // Verify admin permissions
  requireAdmin(request.auth);

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.orderBy("createdAt", "desc").get();

    const users: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
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
      });
    });

    return {
      success: true,
      users: users,
      count: users.length,
    };
  } catch (error: any) {
    console.error("Error listing users:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to list users");
  }
});

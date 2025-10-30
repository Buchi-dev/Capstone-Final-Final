import {beforeUserSignedIn, HttpsError} from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
import type {UserProfile, LoginLog} from "../types";

/**
 * beforeSignIn — Validate user status before allowing sign-in
 * Triggered on every sign-in attempt (including first sign-in after creation)
 *
 * This function:
 * - Restricts login to @smu.edu.ph domain only
 * - Checks if user exists in Firestore
 * - Logs all sign-in attempts to login_logs collection
 * - Allows sign-in for all user statuses (Pending, Approved, Suspended)
 * - Client-side routing handles redirects based on user status
 * - Updates lastLogin timestamp on successful sign-in
 */
export const beforeSignIn = beforeUserSignedIn(
  {
    region: "us-central1",
  },
  async (event) => {
    const user = event.data;

    // Guard clause for undefined user
    if (!user) {
      console.error("User data is undefined in beforeSignIn");
      throw new HttpsError("internal", "User data is missing");
    }

    // Restrict to smu.edu.ph domain only
    const email = (user.email || "").toLowerCase();
    const allowedDomain = "@smu.edu.ph";

    if (!email.endsWith(allowedDomain)) {
      console.warn(`Blocked sign-in attempt for ${email}: Not an SMU account`);

      // Log rejected attempt
      await db.collection("login_logs").add({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        statusAttempted: "Pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: "rejected",
        message: "Sign-in blocked: Not an SMU email address",
      } as LoginLog);

      throw new HttpsError(
        "permission-denied",
        "Only Saint Mary's University (smu.edu.ph) accounts are allowed."
      );
    }

    console.log(`Sign-in attempt by: ${user.email}`);

    try {
      // Get user profile from Firestore
      const userDoc = await db.collection("users").doc(user.uid).get();

      if (!userDoc.exists) {
        // User record not found (shouldn't happen due to beforeCreate)
        const errorLog: LoginLog = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          statusAttempted: "Pending",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          result: "error",
          message: "User record not found in database",
        };

        await db.collection("login_logs").add(errorLog);

        throw new HttpsError(
          "not-found",
          "User record not found. Please contact administrator."
        );
      }

      const userData = userDoc.data() as UserProfile;
      const status = userData.status;

      // Log the sign-in attempt
      const loginLog: LoginLog = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        statusAttempted: status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: "success",
        message: `Sign-in allowed with status: ${status}`,
      };

      await db.collection("login_logs").add(loginLog);

      // Update last login timestamp
      await db.collection("users").doc(user.uid).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const email = user.email || "unknown";
      console.log(`Sign-in allowed for ${email} (Status: ${status})`);

      // Allow sign-in to proceed
      return;
    } catch (error) {
      // If it's already an HttpsError, re-throw it
      if (error instanceof HttpsError) {
        throw error;
      }

      // Log unexpected errors
      console.error("Unexpected error in beforeSignIn:", error);

      await db.collection("login_logs").add({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        statusAttempted: "Pending",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        result: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      throw new HttpsError(
        "internal",
        "An error occurred during sign-in. Please try again."
      );
    }
  }
);

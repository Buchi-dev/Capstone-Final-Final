/**
 * System Configuration Callable Function
 * Manages system-wide configuration including timing intervals
 *
 * @module callable/systemConfig
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

import { db } from "../config/firebase";
import {
  SYSTEM_CONFIG_COLLECTION,
  SYSTEM_CONFIG_DOC,
  validateCheckInterval,
  TIMING_ERRORS,
  TIMING_MESSAGES,
  MIN_CHECK_INTERVAL_MINUTES,
  MAX_CHECK_INTERVAL_MINUTES,
  MANILA_TIMEZONE,
  type SystemTimingConfig,
} from "../constants/timing.constants";
import { clearTimingCache } from "../utils/timingConfig";

/**
 * System configuration request
 */
interface SystemConfigRequest {
  action: "getTimingConfig" | "updateTimingConfig";
  checkIntervalMinutes?: number;
}

/**
 * System configuration response
 */
interface SystemConfigResponse {
  success: boolean;
  message?: string;
  config?: SystemTimingConfig;
  error?: string;
}

/**
 * System Configuration Callable Function
 *
 * Actions:
 * - getTimingConfig: Retrieve current timing configuration
 * - updateTimingConfig: Update timing configuration (admin only)
 *
 * @param {CallableRequest<SystemConfigRequest>} req - Request with action and parameters
 * @returns {Promise<SystemConfigResponse>} Response with configuration
 */
export const systemConfig = onCall<SystemConfigRequest, Promise<SystemConfigResponse>>(
  {
    region: "us-central1",
    enforceAppCheck: false, // Set to true in production
  },
  async (req: CallableRequest<SystemConfigRequest>): Promise<SystemConfigResponse> => {
    try {
      const { action, checkIntervalMinutes } = req.data;
      const userId = req.auth?.uid;

      if (!userId) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      // Route to appropriate handler
      switch (action) {
        case "getTimingConfig":
          return await getTimingConfig();

        case "updateTimingConfig":
          return await updateTimingConfig(userId, checkIntervalMinutes);

        default:
          throw new HttpsError("invalid-argument", "Invalid action specified");
      }
    } catch (error: unknown) {
      logger.error("System config error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);

/**
 * Get current timing configuration
 */
async function getTimingConfig(): Promise<SystemConfigResponse> {
  try {
    const configRef = db.collection(SYSTEM_CONFIG_COLLECTION).doc(SYSTEM_CONFIG_DOC);
    const doc = await configRef.get();

    if (doc.exists) {
      const config = doc.data() as SystemTimingConfig;
      return {
        success: true,
        config,
      };
    }

    // Return default if not found
    return {
      success: true,
      config: {
        checkIntervalMinutes: 5,
        timezone: MANILA_TIMEZONE,
        updatedAt: admin.firestore.Timestamp.now(),
      },
    };
  } catch (error: unknown) {
    logger.error("Failed to get timing config:", error);
    throw new HttpsError("internal", "Failed to retrieve configuration");
  }
}

/**
 * Update timing configuration (admin only)
 *
 * @param {string} userId - User ID requesting the update
 * @param {number} checkIntervalMinutes - New check interval in minutes
 * @return {Promise<SystemConfigResponse>} Response with updated configuration
 */
async function updateTimingConfig(
  userId: string,
  checkIntervalMinutes?: number
): Promise<SystemConfigResponse> {
  try {
    // Verify admin role
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only administrators can update system configuration"
      );
    }

    // Validate interval
    if (checkIntervalMinutes === undefined) {
      throw new HttpsError("invalid-argument", "checkIntervalMinutes is required");
    }

    if (!validateCheckInterval(checkIntervalMinutes)) {
      throw new HttpsError(
        "invalid-argument",
        `${TIMING_ERRORS.INVALID_INTERVAL} (${MIN_CHECK_INTERVAL_MINUTES}-${MAX_CHECK_INTERVAL_MINUTES})`
      );
    }

    // Update configuration
    const configRef = db.collection(SYSTEM_CONFIG_COLLECTION).doc(SYSTEM_CONFIG_DOC);
    const newConfig: SystemTimingConfig = {
      checkIntervalMinutes,
      timezone: MANILA_TIMEZONE,
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: userId,
    };

    await configRef.set(newConfig, { merge: true });

    // Clear cache to force reload
    clearTimingCache();

    logger.info("Timing configuration updated", {
      userId,
      checkIntervalMinutes,
      timezone: MANILA_TIMEZONE,
    });

    return {
      success: true,
      message: TIMING_MESSAGES.CONFIG_UPDATED,
      config: newConfig,
    };
  } catch (error: unknown) {
    logger.error("Failed to update timing config:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", TIMING_ERRORS.CONFIG_UPDATE_FAILED);
  }
}

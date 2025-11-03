/**
 * Check Offline Devices - Scheduled Function
 *
 * HIGH PRIORITY: Marks devices as offline when they haven't sent data recently
 *
 * @module scheduler/checkOfflineDevices
 *
 * Functionality:
 * - Runs based on configurable interval (default: every 5 minutes)
 * - Uses Manila Time (UTC+8) for all operations
 * - Checks lastSeen timestamp for all devices
 * - Marks devices as offline if lastSeen > (interval × 2) minutes old
 * - Provides grace period to account for network delays
 *
 * Configuration:
 * - Interval configurable via Firestore: systemConfig/timing
 * - Timezone: Asia/Manila (UTC+8)
 * - Offline threshold: interval × 2 (allows 1 missed heartbeat + delays)
 */

import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { db } from "../config/firebase";
import { COLLECTIONS } from "../constants/database.constants";
import {
  MANILA_TIMEZONE,
  calculateOfflineThreshold,
  DEFAULT_CHECK_INTERVAL_MINUTES,
} from "../constants/timing.constants";
import { loadTimingConfig } from "../utils/timingConfig";

/**
 * Check for offline devices and update their status
 *
 * Schedule: Configurable via Firestore (default: every 5 minutes)
 * Time Zone: Asia/Manila (UTC+8)
 *
 * Process:
 * 1. Load timing configuration from Firestore
 * 2. Calculate offline threshold based on current interval
 * 3. Query all devices from Firestore
 * 4. Check lastSeen timestamp for each device (in Manila time)
 * 5. If lastSeen > threshold, mark as offline with offlineSince timestamp
 * 6. Only update devices that are currently marked as "online"
 *
 * @example
 * // Deployed as scheduled function:
 * firebase deploy --only functions:checkOfflineDevices
 */
export const checkOfflineDevices = onSchedule(
  {
    schedule: `*/${DEFAULT_CHECK_INTERVAL_MINUTES} * * * *`, // Default schedule
    timeZone: MANILA_TIMEZONE, // Manila Time (UTC+8)
    region: "us-central1",
    retryCount: 0, // Don't retry on failure
    minInstances: 0,
    maxInstances: 1,
  },
  async () => {
    try {
      logger.info("Starting offline device check (Manila Time)...");

      // Load timing configuration from Firestore
      const config = await loadTimingConfig();
      const offlineThresholdMs = calculateOfflineThreshold(config.checkIntervalMinutes);

      // Get current time in Manila timezone
      const now = Date.now();
      const offlineThreshold = now - offlineThresholdMs;

      logger.info("Offline check configuration", {
        checkInterval: config.checkIntervalMinutes,
        offlineThresholdMinutes: config.checkIntervalMinutes * 2,
        timezone: MANILA_TIMEZONE,
      });

      // Query all devices
      const devicesSnapshot = await db.collection(COLLECTIONS.DEVICES).get();

      if (devicesSnapshot.empty) {
        logger.info("No devices found in database");
        return;
      }

      const batch = db.batch();
      let devicesChecked = 0;
      let devicesMarkedOffline = 0;

      // Check each device
      devicesSnapshot.forEach((doc) => {
        devicesChecked++;
        const deviceData = doc.data();
        const deviceId = doc.id;

        // Skip if device is already offline or in maintenance
        if (deviceData.status === "offline" || deviceData.status === "maintenance") {
          return;
        }

        // Check lastSeen timestamp
        if (deviceData.lastSeen) {
          const lastSeenTimestamp = deviceData.lastSeen.toMillis();

          // Mark as offline if lastSeen is older than threshold
          if (lastSeenTimestamp < offlineThreshold) {
            const timeSinceLastSeen = Math.floor((now - lastSeenTimestamp) / 1000 / 60); // minutes
            logger.info(
              `Marking device ${deviceId} as offline (last seen ${timeSinceLastSeen} minutes ago)`,
              {
                deviceId,
                lastSeen: new Date(lastSeenTimestamp).toISOString(),
                threshold: config.checkIntervalMinutes * 2,
                timezone: MANILA_TIMEZONE,
              }
            );

            batch.update(doc.ref, {
              status: "offline",
              offlineSince: admin.firestore.FieldValue.serverTimestamp(),
            });

            devicesMarkedOffline++;
          }
        } else {
          // No lastSeen timestamp - mark as offline
          logger.warn(`Device ${deviceId} has no lastSeen timestamp, marking as offline`);
          batch.update(doc.ref, {
            status: "offline",
            offlineSince: admin.firestore.FieldValue.serverTimestamp(),
          });
          devicesMarkedOffline++;
        }
      });

      // Commit batch updates
      if (devicesMarkedOffline > 0) {
        await batch.commit();
        logger.info(
          `Offline check complete: ${devicesChecked} devices checked, ${devicesMarkedOffline} marked as offline`,
          {
            timezone: MANILA_TIMEZONE,
            timestamp: new Date().toISOString(),
          }
        );
      } else {
        logger.info(`Offline check complete: ${devicesChecked} devices checked, all online`, {
          timezone: MANILA_TIMEZONE,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      logger.error("Error checking offline devices:", error);
      // Don't throw - allow next scheduled run to proceed
    }
  }
);

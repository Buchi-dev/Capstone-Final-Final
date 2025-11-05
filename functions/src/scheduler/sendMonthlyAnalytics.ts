/**
 * Monthly Analytics Scheduler
 * Sends comprehensive monthly analytics reports on the 1st of each month at 8:00 AM Manila time
 * Only sends to users who have enabled "sendScheduledAlerts" in their notification preferences
 *
 * @module scheduler/sendMonthlyAnalytics
 *
 * Features:
 * - Runs on 1st of every month at 8:00 AM Asia/Manila timezone
 * - Respects user notification preferences (sendScheduledAlerts toggle)
 * - Includes 30-day device trends, alerts summary, and water quality metrics
 * - Professional HTML email with monthly statistics
 * - Comprehensive logging for audit trail
 */

import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { sendAnalyticsEmail } from "../config/email";
import type { AnalyticsEmailData } from "../config/email";
import { db } from "../config/firebase";
import { COLLECTIONS, SCHEDULER_CONFIG, SCHEDULER_MESSAGES, ANALYTICS_PERIODS } from "../constants";
import type { NotificationPreferences } from "../types";
import {
  generateDeviceStatusReport,
  getAlertCounts,
  getRecentAlerts,
} from "../utils/analyticsHelpers";

/**
 * Send Monthly Analytics Scheduler
 *
 * Runs on 1st of every month at 8:00 AM Manila time
 * Generates and sends 30-day analytics reports to subscribed users
 *
 * Business Rules:
 * - Only sends to users with sendScheduledAlerts: true
 * - Respects emailNotifications toggle
 * - Generates fresh analytics for the past 30 days
 * - Logs all activities for audit trail
 *
 * Email Contents:
 * - System health summary (device counts, health score)
 * - Alert summary by severity for the month
 * - Top 5 devices with monthly uptime
 * - Recent 10 alerts from the month
 */
export const sendMonthlyAnalytics = onSchedule(
  {
    schedule: SCHEDULER_CONFIG.MONTHLY_ANALYTICS_SCHEDULE,
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
  },
  async () => {
    logger.info("[MONTHLY][Asia/Manila] Starting monthly analytics report generation...");

    try {
      const end = Date.now();
      const start = end - ANALYTICS_PERIODS.MONTHLY;

      // ===================================
      // 1. FETCH NOTIFICATION PREFERENCES
      // ===================================
      const subscribedUsersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where("notificationPreferences.emailNotifications", "==", true)
        .where("notificationPreferences.sendScheduledAlerts", "==", true)
        .get();

      if (subscribedUsersSnapshot.empty) {
        logger.info("[MONTHLY][Asia/Manila] " + SCHEDULER_MESSAGES.NO_RECIPIENTS);
        return;
      }

      logger.info(
        `[MONTHLY][Asia/Manila] Found ${subscribedUsersSnapshot.size} users subscribed to monthly analytics`
      );

      // ===================================
      // 2. GENERATE ANALYTICS DATA
      // ===================================
      logger.info("[MONTHLY][Asia/Manila] Generating monthly analytics data...");

      const deviceReport = await generateDeviceStatusReport();
      const alertCounts = await getAlertCounts(start, end);
      const recentAlerts = await getRecentAlerts(start, 10);

      logger.info(
        "[MONTHLY][Asia/Manila] Monthly analytics generated: " +
          `${deviceReport.summary.totalDevices} devices, ` +
          `${alertCounts.total} alerts (${alertCounts.Critical} critical) in past 30 days`
      );

      // ===================================
      // 3. SEND REPORTS TO EACH USER
      // ===================================
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const userDoc of subscribedUsersSnapshot.docs) {
        const userData = userDoc.data() as FirebaseFirestore.DocumentData & {
          notificationPreferences?: NotificationPreferences;
        };

        const rawPreferences = userData.notificationPreferences;
        if (!rawPreferences) {
          logger.warn(
            `[MONTHLY][Asia/Manila] User ${userDoc.id} matched preference query but has no notificationPreferences field`
          );
          continue;
        }

        const preferences: NotificationPreferences = {
          ...rawPreferences,
          userId: rawPreferences.userId ?? userDoc.id,
        };

        if (!preferences.email) {
          logger.warn(
            `[MONTHLY][Asia/Manila] Skipping user ${preferences.userId} due to missing notification email`
          );
          continue;
        }

        const firstName = (userData.firstname as string) || "User";
        const lastName = (userData.lastname as string) || "";
        const nameCandidate = `${firstName} ${lastName}`.trim();
        const recipientName = nameCandidate.length > 0 ? nameCandidate : "Team Member";

        const emailData: AnalyticsEmailData = {
          recipientEmail: preferences.email,
          recipientName,
          reportType: "monthly",
          periodStart: new Date(start),
          periodEnd: new Date(end),
          deviceSummary: deviceReport.summary,
          alertCounts,
          topDevices: deviceReport.devices.slice(0, 5).map((d) => ({
            deviceId: d.deviceId,
            name: d.name,
            status: d.status,
            uptime: d.uptime,
            latestReading: d.latestReading,
          })),
          recentAlerts: recentAlerts.map((alert) => ({
            id: alert.alertId || "",
            severity: alert.severity,
            deviceName: alert.deviceName,
            parameter: alert.parameter,
            value: alert.currentValue,
            createdAt:
              alert.createdAt instanceof Date
                ? alert.createdAt
                : new Date(alert.createdAt.toMillis()),
          })),
        };

        try {
          await sendAnalyticsEmail(emailData);
          emailsSent++;
          logger.info(`[MONTHLY][Asia/Manila] Sent monthly analytics to ${preferences.email}`);
        } catch (error) {
          emailsFailed++;
          logger.error(
            `[MONTHLY][Asia/Manila] Failed to send monthly analytics to ${preferences.email}:`,
            error
          );
        }
      }

      // ===================================
      // 4. LOG SUMMARY
      // ===================================
      logger.info(
        "[MONTHLY][Asia/Manila] Monthly analytics completed: " +
          `${emailsSent} emails sent, ` +
          `${emailsFailed} emails failed`
      );

      if (emailsSent > 0) {
        logger.info("[MONTHLY][Asia/Manila] " + SCHEDULER_MESSAGES.ANALYTICS_COMPLETE);
      }
    } catch (error) {
      logger.error("[MONTHLY][Asia/Manila] Error sending monthly analytics:", error);
      throw error; // Allow retry
    }
  }
);

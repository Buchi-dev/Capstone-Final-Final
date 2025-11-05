/**
 * Daily Analytics Scheduler
 * Sends comprehensive daily analytics reports every morning at 6:00 AM Manila time
 * Only sends to users who have enabled "sendScheduledAlerts" in their notification preferences
 *
 * @module scheduler/sendDailyAnalytics
 *
 * Features:
 * - Runs daily at 6:00 AM Asia/Manila timezone
 * - Respects user notification preferences (sendScheduledAlerts toggle)
 * - Includes device status, alerts summary, and water quality metrics
 * - Professional HTML email with tables and statistics
 * - Comprehensive logging for audit trail
 */

import {logger} from "firebase-functions/v2";
import {onSchedule} from "firebase-functions/v2/scheduler";

import {sendAnalyticsEmail} from "../config/email";
import type {AnalyticsEmailData} from "../config/email";
import {db} from "../config/firebase";
import {COLLECTIONS, SCHEDULER_CONFIG, SCHEDULER_MESSAGES, ANALYTICS_PERIODS} from "../constants";
import type {NotificationPreferences} from "../types";
import {
  generateDeviceStatusReport,
  getAlertCounts,
  getRecentAlerts,
} from "../utils/analyticsHelpers";

/**
 * Send Daily Analytics Scheduler
 *
 * Runs every morning at 6:00 AM Manila time
 * Generates and sends 24-hour analytics reports to subscribed users
 *
 * Business Rules:
 * - Only sends to users with sendScheduledAlerts: true
 * - Respects emailNotifications toggle
 * - Generates fresh analytics for the past 24 hours
 * - Logs all activities for audit trail
 *
 * Email Contents:
 * - System health summary (device counts, health score)
 * - Alert summary by severity (Critical, Warning, Advisory)
 * - Top 5 devices with status and latest readings
 * - Recent 10 alerts with details
 */
export const sendDailyAnalytics = onSchedule(
  {
    schedule: SCHEDULER_CONFIG.DAILY_ANALYTICS_SCHEDULE,
    timeZone: SCHEDULER_CONFIG.TIMEZONE,
    retryCount: SCHEDULER_CONFIG.RETRY_COUNT,
  },
  async () => {
    logger.info("[DAILY][Asia/Manila] Starting daily analytics report generation...");

    try {
      const end = Date.now();
      const start = end - ANALYTICS_PERIODS.DAILY;

      // ===================================
      // 1. FETCH NOTIFICATION PREFERENCES
      // ===================================
      // Get users with:
      // - emailNotifications enabled
      // - sendScheduledAlerts enabled
      const subscribedUsersSnapshot = await db
        .collection(COLLECTIONS.USERS)
        .where("notificationPreferences.emailNotifications", "==", true)
        .where("notificationPreferences.sendScheduledAlerts", "==", true)
        .get();

      if (subscribedUsersSnapshot.empty) {
        logger.info("[DAILY][Asia/Manila] " + SCHEDULER_MESSAGES.NO_RECIPIENTS);
        return;
      }

      logger.info(
        `[DAILY][Asia/Manila] Found ${subscribedUsersSnapshot.size} users subscribed to daily analytics`
      );

      // ===================================
      // 2. GENERATE ANALYTICS DATA
      // ===================================
      logger.info("[DAILY][Asia/Manila] Generating analytics data...");

      // Generate device status report
      const deviceReport = await generateDeviceStatusReport();

      // Get alert counts for the period
      const alertCounts = await getAlertCounts(start, end);

      // Get recent alerts
      const recentAlerts = await getRecentAlerts(start, 10);

      logger.info(
        "[DAILY][Asia/Manila] Analytics generated: " +
          `${deviceReport.summary.totalDevices} devices, ` +
          `${alertCounts.total} alerts (${alertCounts.Critical} critical)`
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
            `[DAILY][Asia/Manila] User ${userDoc.id} matched preference query but has no notificationPreferences field`
          );
          continue;
        }

        const preferences: NotificationPreferences = {
          ...rawPreferences,
          userId: rawPreferences.userId ?? userDoc.id,
        };

        if (!preferences.email) {
          logger.warn(
            `[DAILY][Asia/Manila] Skipping user ${preferences.userId} due to missing notification email`
          );
          continue;
        }

        const firstName = (userData.firstname as string) || "User";
        const lastName = (userData.lastname as string) || "";
        const nameCandidate = `${firstName} ${lastName}`.trim();
        const recipientName = nameCandidate.length > 0 ? nameCandidate : "Team Member";

        // Prepare email data
        const emailData: AnalyticsEmailData = {
          recipientEmail: preferences.email,
          recipientName,
          reportType: "daily",
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
              alert.createdAt instanceof Date ?
                alert.createdAt :
                new Date(alert.createdAt.toMillis()),
          })),
        };

        // Send email
        try {
          await sendAnalyticsEmail(emailData);
          emailsSent++;
          logger.info(`[DAILY][Asia/Manila] Sent daily analytics to ${preferences.email}`);
        } catch (error) {
          emailsFailed++;
          logger.error(
            `[DAILY][Asia/Manila] Failed to send daily analytics to ${preferences.email}:`,
            error
          );
          // Continue with other recipients
        }
      }

      // ===================================
      // 4. LOG SUMMARY
      // ===================================
      logger.info(
        "[DAILY][Asia/Manila] Daily analytics completed: " +
          `${emailsSent} emails sent, ` +
          `${emailsFailed} emails failed`
      );

      if (emailsSent > 0) {
        logger.info("[DAILY][Asia/Manila] " + SCHEDULER_MESSAGES.ANALYTICS_COMPLETE);
      }
    } catch (error) {
      logger.error("[DAILY][Asia/Manila] Error sending daily analytics:", error);
      throw error; // Allow retry
    }
  }
);

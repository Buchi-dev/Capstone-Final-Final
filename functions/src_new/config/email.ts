/**
 * Email Configuration
 * Nodemailer setup for sending alert notifications
 *
 * @module config/email
 *
 * SECURITY NOTE:
 * Email credentials MUST be stored in Firebase Secret Manager.
 * Use Firebase CLI to set secrets:
 *   firebase functions:secrets:set EMAIL_USER
 *   firebase functions:secrets:set EMAIL_PASSWORD
 *
 * Then update function declarations to include secrets:
 *   export const myFunction = onSchedule(
 *     { schedule: '...', secrets: [EMAIL_USER, EMAIL_PASSWORD] },
 *     async (event) => { ... }
 *   );
 */

import {defineSecret} from "firebase-functions/params";
import {logger} from "firebase-functions/v2";
import * as nodemailer from "nodemailer";

/**
 * Email credentials from Firebase Secret Manager
 * These secrets must be configured before deploying functions that send emails
 */
const EMAIL_USER_SECRET = defineSecret("EMAIL_USER");
const EMAIL_PASSWORD_SECRET = defineSecret("EMAIL_PASSWORD");

/**
 * Get email configuration from secrets
 * Call this function inside your Cloud Function handlers
 * @return {object} Email credentials object with user and password
 */
export function getEmailCredentials(): { user: string; password: string } {
  const user = EMAIL_USER_SECRET.value();
  const password = EMAIL_PASSWORD_SECRET.value();

  if (!user || !password) {
    throw new Error(
      "Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD secrets using Firebase CLI."
    );
  }

  return {user, password};
}

export const EMAIL_USER_SECRET_REF = EMAIL_USER_SECRET;
export const EMAIL_PASSWORD_SECRET_REF = EMAIL_PASSWORD_SECRET;

/**
 * Create Nodemailer transporter with credentials
 * This should be called inside Cloud Function handlers where secrets are available
 *
 * @param {Object} credentials - Email credentials from getEmailCredentials()
 * @return {nodemailer.Transporter} Configured transporter
 */
function createEmailTransporter(credentials: {
  user: string;
  password: string;
}): nodemailer.Transporter {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: credentials.user,
      pass: credentials.password,
    },
  });

  return transporter;
}

/**
 * Email template for analytics reports
 */
export interface AnalyticsEmailData {
  recipientEmail: string;
  recipientName: string;
  reportType: "daily" | "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  deviceSummary: {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    healthScore: number;
  };
  alertCounts: {
    Critical: number;
    Warning: number;
    Advisory: number;
    total: number;
  };
  topDevices: Array<{
    deviceId: string;
    name: string;
    status: string;
    uptime: number;
    latestReading?: {
      ph?: number;
      tds?: number;
      turbidity?: number;
    };
  }>;
  recentAlerts: Array<{
    id: string;
    severity: string;
    deviceName?: string;
    parameter: string;
    value: number;
    createdAt: Date;
  }>;
}

/**
 * Send analytics report email
 *
 * @param {*} data - Email data with analytics information
 * @return {Promise<void>} Promise that resolves when email is sent
 *
 * @example
 * await sendAnalyticsEmail({
 *   recipientEmail: 'admin@example.com',
 *   recipientName: 'John Admin',
 *   reportType: 'daily',
 *   ...analyticsData
 * });
 */
export async function sendAnalyticsEmail(data: AnalyticsEmailData): Promise<void> {
  const {
    recipientEmail,
    recipientName,
    reportType,
    periodStart,
    periodEnd,
    deviceSummary,
    alertCounts,
    topDevices,
    recentAlerts,
  } = data;

  // Import email service dynamically
  const {sendEmail, getSeverityColor, getHealthScoreColor, formatEmailTimestamp} = await import("../utils/emailService");

  const reportTitle = reportType.charAt(0).toUpperCase() + reportType.slice(1);
  const periodText =
    reportType === "daily" ?
      "Last 24 Hours" :
      reportType === "weekly" ?
        "Last 7 Days" :
        "Last 30 Days";

  // Generate device rows HTML
  const deviceRows = topDevices
    .slice(0, 5)
    .map(
      (device) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${device.name}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        <span style="color: ${device.status === "online" ? "#10b981" : "#ef4444"}; font-weight: 600;">
          ${device.status.toUpperCase()}
        </span>
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${device.uptime}%
      </td>
      <td style="padding: 12px;">
        ${
  device.latestReading ?
    `pH: ${device.latestReading.ph?.toFixed(1) || "N/A"} | 
           TDS: ${device.latestReading.tds?.toFixed(0) || "N/A"} | 
           Turb: ${device.latestReading.turbidity?.toFixed(1) || "N/A"}` :
    "No data"
}
      </td>
    </tr>
  `
    )
    .join("");

  // Generate alert rows HTML
  const alertRows = recentAlerts
    .slice(0, 10)
    .map(
      (alert) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; 
          background: ${getSeverityColor(alert.severity)}; color: white; font-size: 11px; font-weight: 600;">
          ${alert.severity}
        </span>
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.deviceName || "Unknown"}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.parameter.toUpperCase()}
      </td>
      <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
        ${alert.value.toFixed(2)}
      </td>
      <td style="padding: 12px;">
        ${alert.createdAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  })}
      </td>
    </tr>
  `
    )
    .join("");

  // Generate device table section
  const deviceTable = topDevices.length > 0 ?
    `
      <div style="margin: 25px 0;">
        <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">
          🏆 Top Devices Status
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Device</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Status</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Uptime</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Latest Readings</th>
            </tr>
          </thead>
          <tbody>
            ${deviceRows}
          </tbody>
        </table>
      </div>
      ` :
    "";

  // Generate alert table section
  const alertTable = recentAlerts.length > 0 ?
    `
      <div style="margin: 25px 0;">
        <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">
          🚨 Recent Alerts
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 4px;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Severity</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Device</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Parameter</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Value</th>
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151; font-size: 13px; border-bottom: 2px solid #e5e7eb;">Time</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </div>
      ` :
    `
      <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="color: #166534; margin: 0; font-weight: 600;">
          ✅ No alerts during this period - System running smoothly!
        </p>
      </div>
      `;

  // Prepare template data
  const templateData = {
    recipientName,
    reportTitle,
    reportType,
    periodText,
    periodTextLower: periodText.toLowerCase(),
    periodRange: `${periodStart.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})} - ${periodEnd.toLocaleDateString("en-US", {timeZone: "Asia/Manila"})}`,
    totalDevices: deviceSummary.totalDevices,
    onlineDevices: deviceSummary.onlineDevices,
    offlineDevices: deviceSummary.offlineDevices,
    healthScore: deviceSummary.healthScore,
    healthScoreColor: getHealthScoreColor(deviceSummary.healthScore),
    criticalCount: alertCounts.Critical,
    warningCount: alertCounts.Warning,
    advisoryCount: alertCounts.Advisory,
    totalAlerts: alertCounts.total,
    alertSummaryBg: alertCounts.Critical > 0 ? "#fef2f2" : "#f0fdf4",
    alertSummaryBorder: alertCounts.Critical > 0 ? "#dc2626" : "#10b981",
    deviceTable,
    alertTable,
    dashboardUrl: `${process.env.APP_URL || "https://your-app-url.com"}/dashboard`,
    timestamp: formatEmailTimestamp(new Date(), "Asia/Manila"),
  };

  // Send email using centralized service
  try {
    await sendEmail({
      to: recipientEmail,
      subject: `📊 ${reportTitle} Analytics Report - ${periodText}`,
      templateName: "analytics",
      templateData,
      fromName: "Water Quality Analytics",
    });
    logger.info(`Analytics email (${reportType}) sent successfully to ${recipientEmail}`);
  } catch (error) {
    logger.error(`Failed to send analytics email to ${recipientEmail}:`, error);
    throw error;
  }
}

/**
 * Helper function to get severity badge color
 *
 * @param {string} severity - The severity level
 * @return {string} The color hex code for the severity badge
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
  case "Critical":
    return "#dc2626";
  case "Warning":
    return "#f59e0b";
  case "Advisory":
    return "#3b82f6";
  default:
    return "#6b7280";
  }
}

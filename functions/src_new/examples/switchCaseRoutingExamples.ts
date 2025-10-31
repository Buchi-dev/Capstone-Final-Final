/**
 * Switch Case Routing Examples
 * 
 * This file demonstrates how to use the switchCaseRouting utility
 * to create reusable, well-structured callable functions.
 * 
 * @module examples/switchCaseRoutingExamples
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  routeAction,
  createRoutedFunction,
  type ActionHandlers,
} from "../utils/switchCaseRouting";

// ============================================================================
// EXAMPLE 1: Basic Usage with routeAction
// ============================================================================

interface DeviceRequest {
  action: "create" | "update" | "delete" | "list";
  deviceId?: string;
  name?: string;
  type?: string;
}

interface DeviceResponse {
  success: boolean;
  message: string;
  device?: any;
  devices?: any[];
}

/**
 * Example: Device Management using routeAction directly
 * 
 * This approach gives you full control over the function structure
 * while using the routing utility for action dispatching.
 */
export const deviceManagement = onCall<DeviceRequest, Promise<DeviceResponse>>(
  async (request) => {
    // Custom auth check
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    // Define handlers inline or reference separate functions
    const handlers: ActionHandlers<DeviceRequest, DeviceResponse> = {
      create: async (req) => {
        const {name, type} = req.data;
        // Implementation here
        return {
          success: true,
          message: "Device created",
          device: {id: "123", name, type},
        };
      },
      update: async (req) => {
        const {deviceId, name} = req.data;
        // Implementation here
        return {
          success: true,
          message: "Device updated",
          device: {id: deviceId, name},
        };
      },
      delete: async (req) => {
        const {deviceId} = req.data;
        // Implementation here
        return {success: true, message: "Device deleted"};
      },
      list: async (req) => {
        // Implementation here
        return {success: true, message: "Devices listed", devices: []};
      },
    };

    // Use routeAction to dispatch to appropriate handler
    return await routeAction(request, handlers);
  }
);

// ============================================================================
// EXAMPLE 2: Using createRoutedFunction (Recommended)
// ============================================================================

interface ReportRequest {
  action: "generate" | "export" | "schedule" | "list";
  reportId?: string;
  format?: string;
  schedule?: string;
}

interface ReportResponse {
  success: boolean;
  message: string;
  report?: any;
  reports?: any[];
}

// Define handlers as separate functions for better organization
async function handleGenerateReport(
  request: CallableRequest<ReportRequest>
): Promise<ReportResponse> {
  const {format} = request.data;
  // Generate report logic here
  return {
    success: true,
    message: "Report generated",
    report: {id: "report-123", format},
  };
}

async function handleExportReport(
  request: CallableRequest<ReportRequest>
): Promise<ReportResponse> {
  const {reportId, format} = request.data;
  // Export report logic here
  return {
    success: true,
    message: "Report exported",
    report: {id: reportId, format},
  };
}

async function handleScheduleReport(
  request: CallableRequest<ReportRequest>
): Promise<ReportResponse> {
  const {schedule} = request.data;
  // Schedule report logic here
  return {
    success: true,
    message: "Report scheduled",
    report: {schedule},
  };
}

async function handleListReports(
  request: CallableRequest<ReportRequest>
): Promise<ReportResponse> {
  // List reports logic here
  return {
    success: true,
    message: "Reports listed",
    reports: [],
  };
}

/**
 * Example: Report Management using createRoutedFunction
 * 
 * This is the recommended approach - clean, declarative, and consistent.
 * The routing utility handles auth, validation, and dispatching.
 */
export const reportManagement = onCall<ReportRequest, Promise<ReportResponse>>(
  createRoutedFunction<ReportRequest, ReportResponse>(
    {
      generate: handleGenerateReport,
      export: handleExportReport,
      schedule: handleScheduleReport,
      list: handleListReports,
    },
    {
      requireAuth: true,
      requireAdmin: false, // Staff can also generate reports
      actionField: "action",
    }
  )
);

// ============================================================================
// EXAMPLE 3: Admin-Only Operations
// ============================================================================

interface AdminRequest {
  action: "backup" | "restore" | "migrate" | "audit";
  backupId?: string;
  targetVersion?: string;
}

interface AdminResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Example: Admin Operations with strict permissions
 * 
 * Using createRoutedFunction with requireAdmin ensures all
 * operations are protected and only accessible to admins.
 */
export const adminOperations = onCall<AdminRequest, Promise<AdminResponse>>(
  createRoutedFunction<AdminRequest, AdminResponse>(
    {
      backup: async (req) => ({
        success: true,
        message: "Backup created",
        data: {backupId: "backup-123"},
      }),
      restore: async (req) => ({
        success: true,
        message: "Restore completed",
        data: {backupId: req.data.backupId},
      }),
      migrate: async (req) => ({
        success: true,
        message: "Migration started",
        data: {version: req.data.targetVersion},
      }),
      audit: async (req) => ({
        success: true,
        message: "Audit completed",
        data: {logs: []},
      }),
    },
    {
      requireAuth: true,
      requireAdmin: true, // Only admins can perform these operations
    }
  )
);

// ============================================================================
// EXAMPLE 4: Custom beforeRoute Hook
// ============================================================================

interface NotificationRequest {
  action: "send" | "schedule" | "cancel";
  userId?: string;
  message?: string;
  scheduleTime?: string;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  notificationId?: string;
}

/**
 * Example: Custom validation with beforeRoute hook
 * 
 * The beforeRoute hook allows you to add custom validation
 * or preprocessing logic before routing to handlers.
 */
export const notificationManager = onCall<
  NotificationRequest,
  Promise<NotificationResponse>
>(
  createRoutedFunction<NotificationRequest, NotificationResponse>(
    {
      send: async (req) => ({
        success: true,
        message: "Notification sent",
        notificationId: "notif-123",
      }),
      schedule: async (req) => ({
        success: true,
        message: "Notification scheduled",
        notificationId: "notif-124",
      }),
      cancel: async (req) => ({
        success: true,
        message: "Notification cancelled",
      }),
    },
    {
      requireAuth: true,
      beforeRoute: async (request) => {
        // Custom validation logic
        const {userId} = request.data;
        
        // Ensure user can only send notifications to themselves unless admin
        const isAdmin = request.auth?.token?.role === "Admin";
        const isSelf = request.auth?.uid === userId;
        
        if (!isAdmin && !isSelf) {
          throw new HttpsError(
            "permission-denied",
            "You can only send notifications to yourself"
          );
        }

        // Additional rate limiting check
        // ... implementation here
      },
    }
  )
);

// ============================================================================
// EXAMPLE 5: Different Action Field Name
// ============================================================================

interface AnalyticsRequest {
  operation: "track" | "report" | "export"; // Note: "operation" instead of "action"
  event?: string;
  metric?: string;
  format?: string;
}

interface AnalyticsResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Example: Using a custom action field name
 * 
 * If your API uses a different field name for the operation,
 * you can specify it with the actionField option.
 */
export const analyticsTracker = onCall<
  AnalyticsRequest,
  Promise<AnalyticsResponse>
>(
  createRoutedFunction<AnalyticsRequest, AnalyticsResponse>(
    {
      track: async (req) => ({
        success: true,
        message: "Event tracked",
        data: {event: req.data.event},
      }),
      report: async (req) => ({
        success: true,
        message: "Report generated",
        data: {metric: req.data.metric},
      }),
      export: async (req) => ({
        success: true,
        message: "Data exported",
        data: {format: req.data.format},
      }),
    },
    {
      requireAuth: true,
      actionField: "operation", // Use "operation" instead of "action"
    }
  )
);

// ============================================================================
// USAGE IN CLIENT
// ============================================================================

/**
 * Client-side usage examples:
 * 
 * // Device Management
 * const deviceMgmt = httpsCallable(functions, 'deviceManagement');
 * await deviceMgmt({ action: 'create', name: 'Sensor-1', type: 'temperature' });
 * 
 * // Report Management
 * const reportMgmt = httpsCallable(functions, 'reportManagement');
 * await reportMgmt({ action: 'generate', format: 'pdf' });
 * 
 * // Admin Operations
 * const adminOps = httpsCallable(functions, 'adminOperations');
 * await adminOps({ action: 'backup' });
 * 
 * // Notification Manager
 * const notifMgr = httpsCallable(functions, 'notificationManager');
 * await notifMgr({ action: 'send', userId: 'user123', message: 'Hello' });
 * 
 * // Analytics Tracker (note: different field name)
 * const analytics = httpsCallable(functions, 'analyticsTracker');
 * await analytics({ operation: 'track', event: 'page_view' });
 */

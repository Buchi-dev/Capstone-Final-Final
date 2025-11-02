import {onRequest, Request} from "firebase-functions/v2/https";
import type {Response} from "express";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";

/**
 * Alert Management Request Types
 */
interface AlertManagementRequest {
  action: 'acknowledgeAlert' | 'resolveAlert' | 'listAlerts';
  alertId?: string;
  notes?: string;
  filters?: {
    severity?: string[];
    status?: string[];
    parameter?: string[];
    deviceId?: string[];
  };
  userId?: string;
}

/**
 * Alert Management Response
 */
interface AlertManagementResponse {
  success: boolean;
  message?: string;
  alert?: any;
  alerts?: any[];
  error?: string;
}

/**
 * Alert Management API
 * Handles alert acknowledgment, resolution, and management
 * All business logic is centralized in Firebase Functions
 */
export const alertManagement = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {action, alertId, notes, filters, userId} =
        req.body as AlertManagementRequest;

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Action is required",
        } as AlertManagementResponse);
        return;
      }

      console.log(`Alert management action: ${action}`, {alertId});

      // Handle different actions
      switch (action) {
      case "acknowledgeAlert": {
        if (!alertId) {
          res.status(400).json({
            success: false,
            error: "Alert ID is required",
          } as AlertManagementResponse);
          return;
        }

        // Get alert document
        const alertRef = db.collection("alerts").doc(alertId);
        const alertDoc = await alertRef.get();

        if (!alertDoc.exists) {
          res.status(404).json({
            success: false,
            error: "Alert not found",
          } as AlertManagementResponse);
          return;
        }

        const alertData = alertDoc.data();

        // Validate: Cannot acknowledge if already resolved
        if (alertData?.status === "Resolved") {
          res.status(400).json({
            success: false,
            error: "Cannot acknowledge a resolved alert",
          } as AlertManagementResponse);
          return;
        }

        // Validate: Cannot acknowledge if already acknowledged
        if (alertData?.status === "Acknowledged") {
          res.status(400).json({
            success: false,
            error: "Alert is already acknowledged",
          } as AlertManagementResponse);
          return;
        }

        // Update alert with server timestamp and user tracking
        const updateData = {
          status: "Acknowledged",
          acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
          acknowledgedBy: userId || "system",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await alertRef.update(updateData);

        // Log the action
        console.log(`Alert ${alertId} acknowledged by ${userId || "system"}`);

        // Create audit log entry
        await db.collection("alertAuditLog").add({
          alertId,
          action: "acknowledge",
          userId: userId || "system",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          previousStatus: alertData?.status,
          newStatus: "Acknowledged",
        });

        res.status(200).json({
          success: true,
          message: "Alert acknowledged successfully",
          alert: {
            alertId,
            status: "Acknowledged",
          },
        } as AlertManagementResponse);
        return;
      }

      case "resolveAlert": {
        if (!alertId) {
          res.status(400).json({
            success: false,
            error: "Alert ID is required",
          } as AlertManagementResponse);
          return;
        }

        // Get alert document
        const alertRef = db.collection("alerts").doc(alertId);
        const alertDoc = await alertRef.get();

        if (!alertDoc.exists) {
          res.status(404).json({
            success: false,
            error: "Alert not found",
          } as AlertManagementResponse);
          return;
        }

        const alertData = alertDoc.data();

        // Validate: Cannot resolve if already resolved
        if (alertData?.status === "Resolved") {
          res.status(400).json({
            success: false,
            error: "Alert is already resolved",
          } as AlertManagementResponse);
          return;
        }

        // Validate: Should be acknowledged before resolving (warning only)
        if (alertData?.status === "Active") {
          console.warn(
            `Alert ${alertId} is being resolved without acknowledgment`
          );
        }

        // Update alert with server timestamp, user tracking, and notes
        const updateData: any = {
          status: "Resolved",
          resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
          resolvedBy: userId || "system",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Add resolution notes if provided
        if (notes) {
          updateData["metadata.resolutionNotes"] = notes;
        }

        await alertRef.update(updateData);

        // Log the action
        console.log(`Alert ${alertId} resolved by ${userId || "system"}`);

        // Create audit log entry
        await db.collection("alertAuditLog").add({
          alertId,
          action: "resolve",
          userId: userId || "system",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          previousStatus: alertData?.status,
          newStatus: "Resolved",
          notes: notes || "",
        });

        res.status(200).json({
          success: true,
          message: "Alert resolved successfully",
          alert: {
            alertId,
            status: "Resolved",
          },
        } as AlertManagementResponse);
        return;
      }

      case "listAlerts": {
        // Optional: Implement server-side filtering and pagination
        // This can be added later if needed for performance
        let query: admin.firestore.Query = db
          .collection("alerts")
          .orderBy("createdAt", "desc");

        // Apply filters if provided
        if (filters) {
          if (filters.status && filters.status.length > 0) {
            query = query.where("status", "in", filters.status);
          }
          if (filters.severity && filters.severity.length > 0) {
            query = query.where("severity", "in", filters.severity);
          }
          if (filters.deviceId && filters.deviceId.length > 0) {
            query = query.where("deviceId", "in", filters.deviceId);
          }
        }

        // Limit results
        query = query.limit(100);

        const snapshot = await query.get();
        const alerts = snapshot.docs.map((doc) => ({
          alertId: doc.id,
          ...doc.data(),
        }));

        res.status(200).json({
          success: true,
          alerts,
        } as AlertManagementResponse);
        return;
      }

      default:
        res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`,
        } as AlertManagementResponse);
        return;
      }
    } catch (error) {
      console.error("Alert management error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      } as AlertManagementResponse);
    }
  }
);

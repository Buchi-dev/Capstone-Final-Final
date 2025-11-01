/**
 * Alert Management Callable Function
 * Single function with switch case to handle alert management operations
 * 
 * @module callable/alertManagement
 * 
 * Supported actions:
 * - acknowledgeAlert: Change alert status to Acknowledged
 * - resolveAlert: Change alert status to Resolved with optional notes
 * - listAlerts: Retrieve alerts with optional filtering
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import {db} from "../config/firebase";
import {FieldValue} from "firebase-admin/firestore";
import {
  ALERT_MANAGEMENT_ERRORS,
  ALERT_MANAGEMENT_MESSAGES,
  COLLECTIONS,
} from "../constants";
import {createRoutedFunction} from "../utils";
import type {
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  ListAlertsRequest,
  AlertResponse,
  WaterQualityAlert,
  AlertFilters,
} from "../types";

/**
 * Request type for alert management operations
 */
type AlertManagementRequest = 
  | AcknowledgeAlertRequest 
  | ResolveAlertRequest 
  | ListAlertsRequest;

/**
 * Acknowledge Alert Handler
 * Changes alert status from Active to Acknowledged
 * 
 * Business Rules:
 * - Alert must exist
 * - Alert must be Active (cannot acknowledge if already Acknowledged or Resolved)
 * - Requires admin authentication
 * - Records who acknowledged and when
 * 
 * @param request - Callable request with alertId
 * @returns Success response with updated alert data
 * 
 * @throws {HttpsError} not-found - Alert not found
 * @throws {HttpsError} failed-precondition - Alert already acknowledged or resolved
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleAcknowledgeAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const {alertId} = request.data as AcknowledgeAlertRequest;
  const userId = request.auth?.uid;

  if (!alertId) {
    throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  }

  if (!userId) {
    throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
  }

  try {
    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new HttpsError("not-found", ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
    }

    const alertData = alertDoc.data() as WaterQualityAlert;

    // Business Logic: Cannot acknowledge if already acknowledged or resolved
    if (alertData.status === "Acknowledged") {
      throw new HttpsError(
        "failed-precondition",
        ALERT_MANAGEMENT_ERRORS.ALREADY_ACKNOWLEDGED
      );
    }

    if (alertData.status === "Resolved") {
      throw new HttpsError(
        "failed-precondition",
        ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED
      );
    }

    // Update alert with server timestamp and user tracking
    await alertRef.update({
      status: "Acknowledged",
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgedBy: userId,
    });

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.ACKNOWLEDGE_SUCCESS,
      alert: {
        alertId,
        status: "Acknowledged",
      },
    };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error acknowledging alert:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.ACKNOWLEDGE_FAILED);
  }
}

/**
 * Resolve Alert Handler
 * Changes alert status to Resolved with optional resolution notes
 * 
 * Business Rules:
 * - Alert must exist
 * - Alert must not already be Resolved
 * - Requires admin authentication
 * - Records who resolved, when, and optional notes
 * 
 * @param request - Callable request with alertId and optional notes
 * @returns Success response with updated alert data
 * 
 * @throws {HttpsError} not-found - Alert not found
 * @throws {HttpsError} failed-precondition - Alert already resolved
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleResolveAlert(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const {alertId, notes} = request.data as ResolveAlertRequest;
  const userId = request.auth?.uid;

  if (!alertId) {
    throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  }

  if (!userId) {
    throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
  }

  try {
    const alertRef = db.collection(COLLECTIONS.ALERTS).doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      throw new HttpsError("not-found", ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
    }

    const alertData = alertDoc.data() as WaterQualityAlert;

    // Business Logic: Cannot resolve if already resolved
    if (alertData.status === "Resolved") {
      throw new HttpsError(
        "failed-precondition",
        ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED
      );
    }

    // Prepare update data
    const updateData: any = {
      status: "Resolved",
      resolvedAt: FieldValue.serverTimestamp(),
      resolvedBy: userId,
    };

    // Add resolution notes if provided
    if (notes) {
      updateData.resolutionNotes = notes;
    }

    await alertRef.update(updateData);

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.RESOLVE_SUCCESS,
      alert: {
        alertId,
        status: "Resolved",
      },
    };
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error resolving alert:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.RESOLVE_FAILED);
  }
}

/**
 * List Alerts Handler
 * Retrieves alerts with optional server-side filtering
 * 
 * Filtering Options:
 * - severity: Filter by alert severity (Advisory, Warning, Critical)
 * - status: Filter by alert status (Active, Acknowledged, Resolved)
 * - parameter: Filter by water parameter (tds, ph, turbidity)
 * - deviceId: Filter by specific device(s)
 * 
 * @param request - Callable request with optional filters
 * @returns Success response with array of alerts
 * 
 * @throws {HttpsError} internal - Database operation failed
 */
async function handleListAlerts(
  request: CallableRequest<AlertManagementRequest>
): Promise<AlertResponse> {
  const {filters} = request.data as ListAlertsRequest;

  try {
    let query: FirebaseFirestore.Query = db
      .collection(COLLECTIONS.ALERTS)
      .orderBy("createdAt", "desc");

    // Apply server-side filters if provided
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.where("status", "in", filters.status);
      }

      if (filters.severity && filters.severity.length > 0) {
        query = query.where("severity", "in", filters.severity);
      }

      if (filters.parameter && filters.parameter.length > 0) {
        query = query.where("parameter", "in", filters.parameter);
      }

      if (filters.deviceId && filters.deviceId.length > 0) {
        query = query.where("deviceId", "in", filters.deviceId);
      }
    }

    const snapshot = await query.get();

    const alerts: WaterQualityAlert[] = snapshot.docs.map((doc) => ({
      alertId: doc.id,
      ...doc.data(),
    } as WaterQualityAlert));

    return {
      success: true,
      message: ALERT_MANAGEMENT_MESSAGES.LIST_SUCCESS,
      alerts,
    };
  } catch (error: any) {
    console.error("Error listing alerts:", error);
    throw new HttpsError("internal", ALERT_MANAGEMENT_ERRORS.LIST_FAILED);
  }
}

/**
 * Alert Management Callable Function
 * Single entry point for all alert management operations
 * 
 * Uses createRoutedFunction for clean switch-case routing
 * Requires admin authentication for all operations
 * 
 * @example
 * // Acknowledge alert
 * const result = await httpsCallable('alertManagement')({
 *   action: 'acknowledgeAlert',
 *   alertId: 'alert_12345'
 * });
 * 
 * @example
 * // Resolve alert with notes
 * const result = await httpsCallable('alertManagement')({
 *   action: 'resolveAlert',
 *   alertId: 'alert_12345',
 *   notes: 'Sensor replaced and recalibrated'
 * });
 * 
 * @example
 * // List alerts with filters
 * const result = await httpsCallable('alertManagement')({
 *   action: 'listAlerts',
 *   filters: {
 *     status: ['Active', 'Acknowledged'],
 *     severity: ['Critical']
 *   }
 * });
 */
export const alertManagement = onCall<AlertManagementRequest, Promise<AlertResponse>>(
  createRoutedFunction<AlertManagementRequest, AlertResponse>(
    {
      acknowledgeAlert: handleAcknowledgeAlert,
      resolveAlert: handleResolveAlert,
      listAlerts: handleListAlerts,
    },
    {
      requireAuth: true,
      requireAdmin: true,
    }
  )
);

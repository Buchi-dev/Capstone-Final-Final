import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import type { CallableRequest } from "firebase-functions/v2/https";

import { db } from "../config/firebase";
import { ALERT_MANAGEMENT_ERRORS, ALERT_MANAGEMENT_MESSAGES, COLLECTIONS } from "../constants";
import { DIGEST_COLLECTION, DIGEST_ERRORS, DIGEST_MESSAGES } from "../constants/digest.constants";
import type {
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  AcknowledgeDigestRequest,
  AlertResponse,
  WaterQualityAlert,
} from "../types";
import type { AlertDigest } from "../types/digest.types";
import { createRoutedFunction } from "../utils";
import { isValidAckToken } from "../utils/validators";

type AlertManagementRequest = AcknowledgeAlertRequest | ResolveAlertRequest | AcknowledgeDigestRequest;

// ============================================================================
// VALIDATION & DATABASE HELPERS
// ============================================================================

function validateAuth(userId: string | undefined, alertId?: string): asserts userId is string {
  if (!alertId) throw new HttpsError("invalid-argument", ALERT_MANAGEMENT_ERRORS.MISSING_ALERT_ID);
  if (!userId) throw new HttpsError("unauthenticated", ALERT_MANAGEMENT_ERRORS.UNAUTHENTICATED);
}

function validateAlertStatus(status: string, operation: "acknowledge" | "resolve"): void {
  const isAcknowledged = status === "Acknowledged";
  const isResolved = status === "Resolved";

  if ((operation === "acknowledge" && (isAcknowledged || isResolved)) || (operation === "resolve" && isResolved)) {
    const error = isResolved ? ALERT_MANAGEMENT_ERRORS.ALREADY_RESOLVED : ALERT_MANAGEMENT_ERRORS.ALREADY_ACKNOWLEDGED;
    throw new HttpsError("failed-precondition", error);
  }
}

async function getDocument<T>(collection: string, docId: string, notFoundError: string): Promise<T> {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) throw new HttpsError("not-found", notFoundError);
  return doc.data() as T;
}

async function updateAlert(alertId: string, status: string, userId: string, notes?: string): Promise<void> {
  const timestamp = FieldValue.serverTimestamp();
  const actionPrefix = status === "Acknowledged" ? "acknowledged" : "resolved";

  await db.collection(COLLECTIONS.ALERTS).doc(alertId).update({
    status,
    [`${actionPrefix}At`]: timestamp,
    [`${actionPrefix}By`]: userId,
    ...(notes && { resolutionNotes: notes }),
  });
}

// ============================================================================
// REQUEST HANDLERS
// ============================================================================

async function handleAcknowledgeAlert(request: CallableRequest<AlertManagementRequest>): Promise<AlertResponse> {
  const { alertId } = request.data as AcknowledgeAlertRequest;
  const userId = request.auth?.uid;

  validateAuth(userId, alertId);
  const alert = await getDocument<WaterQualityAlert>(COLLECTIONS.ALERTS, alertId, ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
  validateAlertStatus(alert.status, "acknowledge");
  await updateAlert(alertId, "Acknowledged", userId);

  return {
    success: true,
    message: ALERT_MANAGEMENT_MESSAGES.ACKNOWLEDGE_SUCCESS,
    alert: { alertId, status: "Acknowledged" },
  };
}

async function handleResolveAlert(request: CallableRequest<AlertManagementRequest>): Promise<AlertResponse> {
  const { alertId, notes } = request.data as ResolveAlertRequest;
  const userId = request.auth?.uid;

  validateAuth(userId, alertId);
  const alert = await getDocument<WaterQualityAlert>(COLLECTIONS.ALERTS, alertId, ALERT_MANAGEMENT_ERRORS.ALERT_NOT_FOUND);
  validateAlertStatus(alert.status, "resolve");
  await updateAlert(alertId, "Resolved", userId, notes);

  return {
    success: true,
    message: ALERT_MANAGEMENT_MESSAGES.RESOLVE_SUCCESS,
    alert: { alertId, status: "Resolved" },
  };
}

async function handleAcknowledgeDigest(request: CallableRequest<AlertManagementRequest>): Promise<AlertResponse> {
  const { digestId, token } = request.data as AcknowledgeDigestRequest;

  if (!digestId || !token) throw new HttpsError("invalid-argument", "Missing required parameters: digestId and token");
  if (!isValidAckToken(token)) throw new HttpsError("invalid-argument", "Invalid token format");

  const digest = await getDocument<AlertDigest>(DIGEST_COLLECTION, digestId, DIGEST_ERRORS.DIGEST_NOT_FOUND);

  if (digest.ackToken !== token) {
    logger.warn(`Invalid ack token for digest ${digestId}`);
    throw new HttpsError("permission-denied", DIGEST_ERRORS.INVALID_TOKEN);
  }

  if (digest.isAcknowledged) return { success: true, message: DIGEST_ERRORS.ALREADY_ACKNOWLEDGED };

  await db.collection(DIGEST_COLLECTION).doc(digestId).update({
    isAcknowledged: true,
    acknowledgedAt: FieldValue.serverTimestamp(),
    acknowledgedBy: digest.recipientUid,
  });

  logger.info(`Digest ${digestId} acknowledged by ${digest.recipientEmail}`);
  return { success: true, message: DIGEST_MESSAGES.ACKNOWLEDGED };
}

export const alertManagement = onCall<AlertManagementRequest, Promise<AlertResponse>>(
  createRoutedFunction<AlertManagementRequest, AlertResponse>(
    {
      acknowledgeAlert: handleAcknowledgeAlert,
      resolveAlert: handleResolveAlert,
      acknowledgeDigest: handleAcknowledgeDigest,
    },
    {
      requireAuth: true,
      requireAdmin: false,
    }
  )
);

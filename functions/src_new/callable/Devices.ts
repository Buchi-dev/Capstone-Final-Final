// ============================================================================
// 📦 IMPORTS
// ============================================================================

// Firebase Admin SDK
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";

// Configurations
import {db, rtdb} from "../config/firebase";
// Constants
import {
  DEVICE_MANAGEMENT_ERRORS,
  DEVICE_MANAGEMENT_MESSAGES,
} from "../constants/Device.Constants";
// Types
import type {
  DeviceManagementRequest,
  DeviceManagementResponse,
} from "../types/Device.Types";
// Utilities
import {createRoutedFunction} from "../utils/SwitchCaseRouting";
import type {ActionHandler} from "../utils/SwitchCaseRouting";


// ============================================================================
// 🧩 DEVICE MANAGEMENT HANDLERS
// ============================================================================
//
// ⚠️ MANUAL DEVICE CREATION REMOVED
// Devices are now auto-created by autoRegisterDevice.ts when detected via MQTT.
// Admin users assign location via updateDevice to complete registration.
//
// --------------------------------------------------------------------------
// 🔹 Update Device
// --------------------------------------------------------------------------
const handleUpdateDevice: ActionHandler<DeviceManagementRequest, DeviceManagementResponse> = async (
  req: CallableRequest<DeviceManagementRequest>
) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);
  }

  // OPTIMIZATION: Only update metadata and admin-controlled fields
  // DO NOT update lastSeen here - that's handled by processSensorData
  // This prevents manual updates from interfering with automatic status tracking
  await deviceRef.update({
    ...deviceData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // lastSeen is REMOVED - only updated by actual sensor data
  });

  return {success: true, message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_UPDATED};
};


// --------------------------------------------------------------------------
// 🔹 Delete Device
// --------------------------------------------------------------------------
const handleDeleteDevice: ActionHandler<DeviceManagementRequest, DeviceManagementResponse> = async (
  req: CallableRequest<DeviceManagementRequest>
) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", DEVICE_MANAGEMENT_ERRORS.MISSING_DEVICE_ID);
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", DEVICE_MANAGEMENT_ERRORS.DEVICE_NOT_FOUND);
  }

  await Promise.all([
    deviceRef.delete(),
    rtdb.ref(`sensorReadings/${deviceId}`).remove(),
  ]);

  return {success: true, message: DEVICE_MANAGEMENT_MESSAGES.DEVICE_DELETED};
};


// ============================================================================
// 🚀 EXPORT - Cloud Function Endpoint
// ============================================================================
export const DevicesCalls = onCall<
  DeviceManagementRequest,
  Promise<DeviceManagementResponse>
>(
  createRoutedFunction<DeviceManagementRequest, DeviceManagementResponse>(
    {
      updateDevice: handleUpdateDevice,
      deleteDevice: handleDeleteDevice,
    },
    {
      requireAuth: true,
      requireAdmin: true,
    }
  )
);

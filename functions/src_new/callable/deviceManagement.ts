/**
 * Device Management Callable Function
 * Single function with switch case to handle multiple device management operations
 * Migrated from HTTP to Callable for better security and consistency
 *
 * @module callable/deviceManagement
 */

import {HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {db} from "../config/firebase";
// Import device types from src (original location)
import {db as srcDb, rtdb, pubsub} from "../../src/config/firebase";
import type {
  Device,
  DeviceData,
  DeviceStatus,
  CommandMessage,
  SensorReading,
} from "../../src/types";
import {createRoutedFunction} from "../utils";
import type {ActionHandler, ActionHandlers} from "../utils/switchCaseRouting";

/**
 * Device Management Request Interface
 */
interface DeviceManagementRequest {
  action:
    | "discoverDevices"
    | "sendCommand"
    | "addDevice"
    | "getDevice"
    | "updateDevice"
    | "deleteDevice"
    | "listDevices"
    | "getSensorReadings"
    | "getSensorHistory";
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

/**
 * Device Management Response Interface
 */
interface DeviceManagementResponse {
  success: boolean;
  message?: string;
  device?: Device;
  devices?: Device[];
  count?: number;
  sensorData?: SensorReading;
  history?: SensorReading[];
}

/**
 * Handler: Discover Devices
 * Broadcasts discovery message via Pub/Sub → MQTT Bridge
 */
const handleDiscoverDevices: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const discoveryMessage: CommandMessage = {
    command: "DISCOVER",
    timestamp: Date.now(),
    requestId: `discovery_${Date.now()}`,
  };

  // Publish to Pub/Sub - Bridge will forward to MQTT
  await pubsub.topic("device-commands").publishMessage({
    json: discoveryMessage,
    attributes: {
      mqtt_topic: "device/discovery/request",
    },
  });

  return {
    success: true,
    message: "Discovery message sent to devices",
  };
};

/**
 * Handler: Send Command to Device
 * Publishes command to specific device via Pub/Sub → MQTT
 */
const handleSendCommand: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, command, params} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const commandMessage: CommandMessage = {
    command: command || "STATUS",
    params: params || {},
    timestamp: Date.now(),
    requestId: `cmd_${Date.now()}`,
  };

  // Publish command to Pub/Sub
  await pubsub.topic("device-commands").publishMessage({
    json: commandMessage,
    attributes: {
      mqtt_topic: `device/command/${deviceId}`,
      device_id: deviceId,
    },
  });

  return {
    success: true,
    message: `Command sent to device: ${deviceId}`,
  };
};

/**
 * Handler: Add Device
 * Registers a new device in Firestore and initializes Realtime DB
 */
const handleAddDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (doc.exists) {
    throw new HttpsError("already-exists", "Device already exists");
  }

  const newDevice: Device = {
    deviceId: deviceId,
    name: deviceData?.name || `Device-${deviceId}`,
    type: deviceData?.type || "Arduino UNO R4 WiFi",
    firmwareVersion: deviceData?.firmwareVersion || "1.0.0",
    macAddress: deviceData?.macAddress || "",
    ipAddress: deviceData?.ipAddress || "",
    sensors: deviceData?.sensors || ["turbidity", "tds", "ph"],
    status: (deviceData?.status as DeviceStatus) || "online",
    registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
    metadata: deviceData?.metadata || {},
  };

  await deviceRef.set(newDevice);

  // Initialize Realtime Database structure
  await rtdb.ref(`sensorReadings/${deviceId}`).set({
    deviceId: deviceId,
    latestReading: null,
    status: "waiting_for_data",
  });

  return {
    success: true,
    message: "Device added successfully",
    device: newDevice,
  };
};

/**
 * Handler: Get Device
 * Retrieves a specific device by ID
 */
const handleGetDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Device not found");
  }

  return {
    success: true,
    device: doc.data() as Device,
  };
};

/**
 * Handler: Update Device
 * Updates device information in Firestore
 */
const handleUpdateDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, deviceData} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Device not found");
  }

  const updateData = {
    ...deviceData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastSeen: admin.firestore.FieldValue.serverTimestamp(),
  };

  await deviceRef.update(updateData);

  return {
    success: true,
    message: "Device updated successfully",
  };
};

/**
 * Handler: Delete Device
 * Removes device from Firestore and Realtime DB
 */
const handleDeleteDevice: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const deviceRef = db.collection("devices").doc(deviceId);
  const doc = await deviceRef.get();

  if (!doc.exists) {
    throw new HttpsError("not-found", "Device not found");
  }

  await deviceRef.delete();

  // Delete sensor readings from Realtime Database
  await rtdb.ref(`sensorReadings/${deviceId}`).remove();

  return {
    success: true,
    message: "Device deleted successfully",
  };
};

/**
 * Handler: List Devices
 * Retrieves all devices from Firestore
 */
const handleListDevices: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const devicesSnapshot = await db.collection("devices").get();

  const devices: Device[] = [];
  devicesSnapshot.forEach((doc) => {
    const deviceData = doc.data() as Device;
    devices.push({...deviceData, id: doc.id} as any);
  });

  return {
    success: true,
    count: devices.length,
    devices: devices,
  };
};

/**
 * Handler: Get Sensor Readings
 * Retrieves latest sensor readings from Realtime DB
 */
const handleGetSensorReadings: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const snapshot = await rtdb
    .ref(`sensorReadings/${deviceId}/latestReading`)
    .once("value");

  if (!snapshot.exists()) {
    throw new HttpsError(
      "not-found",
      "No sensor readings found for this device"
    );
  }

  const sensorData: SensorReading = snapshot.val();

  return {
    success: true,
    sensorData: sensorData,
  };
};

/**
 * Handler: Get Sensor History
 * Retrieves historical sensor readings from Realtime DB
 */
const handleGetSensorHistory: ActionHandler<
  DeviceManagementRequest,
  DeviceManagementResponse
> = async (req: CallableRequest<DeviceManagementRequest>) => {
  const {deviceId, limit} = req.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  const historyLimit = limit || 50;
  const snapshot = await rtdb
    .ref(`sensorReadings/${deviceId}/history`)
    .orderByChild("timestamp")
    .limitToLast(historyLimit)
    .once("value");

  if (!snapshot.exists()) {
    throw new HttpsError(
      "not-found",
      "No sensor history found for this device"
    );
  }

  const history: SensorReading[] = [];
  snapshot.forEach((child: admin.database.DataSnapshot) => {
    history.push(child.val());
  });

  return {
    success: true,
    count: history.length,
    history: history.reverse(), // Most recent first
  };
};

/**
 * Device Management Callable Function
 * Uses createRoutedFunction for clean switch-case routing
 * 
 * Security: requireAuth = true, requireAdmin = true
 * All device management operations require admin authentication
 * 
 * @example
 * // List all devices
 * const result = await functions.httpsCallable('deviceManagement')({
 *   action: 'listDevices'
 * });
 * 
 * @example
 * // Add new device
 * const result = await functions.httpsCallable('deviceManagement')({
 *   action: 'addDevice',
 *   deviceId: 'arduino_001',
 *   deviceData: { name: 'Lab Device 1', type: 'Arduino UNO R4 WiFi' }
 * });
 */
// Define action handlers mapping
const handlers: ActionHandlers<DeviceManagementRequest, DeviceManagementResponse> = {
  discoverDevices: handleDiscoverDevices,
  sendCommand: handleSendCommand,
  addDevice: handleAddDevice,
  getDevice: handleGetDevice,
  updateDevice: handleUpdateDevice,
  deleteDevice: handleDeleteDevice,
  listDevices: handleListDevices,
  getSensorReadings: handleGetSensorReadings,
  getSensorHistory: handleGetSensorHistory,
};

export const deviceManagement = createRoutedFunction<
  DeviceManagementRequest,
  DeviceManagementResponse
>(
  handlers,
  {
    requireAuth: true,
    requireAdmin: true,
  }
);

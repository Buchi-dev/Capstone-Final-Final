import {onRequest, Request} from "firebase-functions/v2/https";
import {
  onMessagePublished,
  MessagePublishedData,
} from "firebase-functions/v2/pubsub";
import type {CloudEvent} from "firebase-functions/v2";
import {setGlobalOptions} from "firebase-functions/v2";
import * as admin from "firebase-admin";
import {PubSub} from "@google-cloud/pubsub";
import type {Response} from "express";

// ===========================
// INITIALIZATION
// ===========================

// Initialize Firebase Admin
admin.initializeApp();
const db: admin.firestore.Firestore = admin.firestore();
const rtdb: admin.database.Database = admin.database();
const pubsub = new PubSub();

// Set global options
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
  timeoutSeconds: 60,
  memory: "512MiB",
});

// ===========================
// TYPE DEFINITIONS
// ===========================

// Device Types
type DeviceStatus = "online" | "offline" | "error" | "maintenance";

interface DeviceMetadata {
  location?: string;
  description?: string;
  owner?: string;
  [key: string]: string | number | boolean | undefined;
}

interface DeviceData {
  deviceId?: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: DeviceStatus;
  metadata?: DeviceMetadata;
}

interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: admin.firestore.FieldValue;
  lastSeen: admin.firestore.FieldValue;
  updatedAt?: admin.firestore.FieldValue;
  metadata: DeviceMetadata;
}

// Sensor Types
interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt: number | object;
}

interface SensorData {
  turbidity?: number;
  tds?: number;
  ph?: number;
  timestamp?: number;
}

// Request/Response Types
type DeviceAction =
  | "DISCOVER_DEVICES"
  | "SEND_COMMAND"
  | "ADD_DEVICE"
  | "GET_DEVICE"
  | "UPDATE_DEVICE"
  | "DELETE_DEVICE"
  | "LIST_DEVICES"
  | "GET_SENSOR_READINGS"
  | "GET_SENSOR_HISTORY";

interface DeviceManagementRequest {
  action: DeviceAction;
  deviceId?: string;
  deviceData?: DeviceData;
  command?: string;
  params?: Record<string, unknown>;
  limit?: number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// MQTT/Pub-Sub Types
interface DeviceRegistrationInfo {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
}

interface CommandMessage {
  command: string;
  params?: Record<string, unknown>;
  timestamp: number;
  requestId?: string;
}

// ===========================
// HTTP-TRIGGERED FUNCTIONS
// ===========================

/**
 * Device Management API
 * Handles all device CRUD operations and command publishing
 */
export const deviceManagement = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {action, deviceId, deviceData, command, params, limit} =
        req.body as DeviceManagementRequest;

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Action is required",
        } as ApiResponse);
        return;
      }

      console.log(`Device management action: ${action}`);

      // Handle different actions
      switch (action) {
      case "DISCOVER_DEVICES": {
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

        res.status(200).json({
          success: true,
          message: "Discovery message sent to devices",
        } as ApiResponse);
        break;
      }

      case "SEND_COMMAND": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
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

        res.status(200).json({
          success: true,
          message: `Command sent to device: ${deviceId}`,
        } as ApiResponse);
        break;
      }

      case "ADD_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (doc.exists) {
          res.status(400).json({
            success: false,
            error: "Device already exists",
          } as ApiResponse);
          return;
        }

        const newDevice: Device = {
          deviceId: deviceId,
          name: deviceData?.name || `Device-${deviceId}`,
          type: deviceData?.type || "Arduino UNO R4 WiFi",
          firmwareVersion: deviceData?.firmwareVersion || "1.0.0",
          macAddress: deviceData?.macAddress || "",
          ipAddress: deviceData?.ipAddress || "",
          sensors: deviceData?.sensors || [
            "turbidity",
            "tds",
            "ph",
          ],
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

        res.status(200).json({
          success: true,
          message: "Device added successfully",
          data: {deviceId, device: newDevice},
        } as ApiResponse);
        break;
      }

      case "GET_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        res.status(200).json({
          success: true,
          device: doc.data(),
        } as ApiResponse);
        break;
      }

      case "UPDATE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        const updateData = {
          ...deviceData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        };

        await deviceRef.update(updateData);

        res.status(200).json({
          success: true,
          message: "Device updated successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "DELETE_DEVICE": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const deviceRef = db.collection("devices").doc(deviceId);
        const doc = await deviceRef.get();

        if (!doc.exists) {
          res.status(404).json({
            success: false,
            error: "Device not found",
          } as ApiResponse);
          return;
        }

        await deviceRef.delete();

        // Delete sensor readings from Realtime Database
        await rtdb.ref(`sensorReadings/${deviceId}`).remove();

        res.status(200).json({
          success: true,
          message: "Device deleted successfully",
          data: {deviceId},
        } as ApiResponse);
        break;
      }

      case "LIST_DEVICES": {
        const devicesSnapshot = await db.collection("devices").get();

        const devices = devicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.status(200).json({
          success: true,
          count: devices.length,
          devices: devices,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_READINGS": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/latestReading`)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor readings found for this device",
          } as ApiResponse);
          return;
        }

        const sensorData: SensorReading = snapshot.val();

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          sensorData: sensorData,
        } as ApiResponse);
        break;
      }

      case "GET_SENSOR_HISTORY": {
        if (!deviceId) {
          res.status(400).json({
            success: false,
            error: "Device ID is required",
          } as ApiResponse);
          return;
        }

        const historyLimit = limit || 50;
        const snapshot = await rtdb
          .ref(`sensorReadings/${deviceId}/history`)
          .orderByChild("timestamp")
          .limitToLast(historyLimit)
          .once("value");

        if (!snapshot.exists()) {
          res.status(404).json({
            success: false,
            error: "No sensor history found for this device",
          } as ApiResponse);
          return;
        }

        const history: SensorReading[] = [];
        snapshot.forEach((child) => {
          history.push(child.val());
        });

        res.status(200).json({
          success: true,
          deviceId: deviceId,
          count: history.length,
          history: history.reverse(), // Most recent first
        } as ApiResponse);
        break;
      }

      default: {
        res.status(400).json({
          success: false,
          error: "Invalid action specified",
        } as ApiResponse);
      }
      }
    } catch (error) {
      console.error("Error in deviceManagement:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse);
    }
  }
);

// ===========================
// PUB/SUB-TRIGGERED FUNCTIONS
// ===========================

/**
 * Process sensor data from devices
 * Triggered by: device/sensordata/+ → Bridge → Pub/Sub
 */
export const processSensorData = onMessagePublished(
  {
    topic: "iot-sensor-readings",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 5,
  },
  async (event: CloudEvent<MessagePublishedData<SensorData>>): Promise<void> => {
    try {
      // Extract device ID from message attributes
      const deviceId = event.data.message.attributes?.device_id;
      if (!deviceId) {
        console.error("No device_id in message attributes");
        return;
      }

      // Parse sensor data
      const sensorData = event.data.message.json;
      if (!sensorData) {
        console.error("No sensor data in message");
        return;
      }

      console.log(`Processing sensor data for device: ${deviceId}`);

      // Prepare reading data
      const readingData: SensorReading = {
        deviceId: deviceId,
        turbidity: sensorData.turbidity || 0,
        tds: sensorData.tds || 0,
        ph: sensorData.ph || 0,
        timestamp: sensorData.timestamp || Date.now(),
        receivedAt: admin.database.ServerValue.TIMESTAMP,
      };

      // Store in Realtime Database - Latest Reading
      await rtdb
        .ref(`sensorReadings/${deviceId}/latestReading`)
        .set(readingData);

      // Store in Realtime Database - Historical Data
      await rtdb
        .ref(`sensorReadings/${deviceId}/history`)
        .push(readingData);

      // Update device status in Firestore
      await db.collection("devices").doc(deviceId).update({
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        status: "online",
      });

      console.log(`✓ Sensor data processed for device: ${deviceId}`);
    } catch (error) {
      console.error("Error processing sensor data:", error);
      throw error; // Trigger retry
    }
  }
);

/**
 * Auto-register devices
 * Triggered by: device/registration/+ → Bridge → Pub/Sub
 */
export const autoRegisterDevice = onMessagePublished(
  {
    topic: "iot-device-registration",
    region: "us-central1",
    retry: true,
    minInstances: 0,
    maxInstances: 2, // Reduced: registration is infrequent
  },
  async (
    event: CloudEvent<MessagePublishedData<DeviceRegistrationInfo>>
  ): Promise<void> => {
    try {
      const deviceInfo = event.data.message.json;
      if (!deviceInfo || !deviceInfo.deviceId) {
        console.error("Invalid device registration data");
        return;
      }

      const deviceId = deviceInfo.deviceId;
      console.log(`Device registration request: ${deviceId}`);

      // Check if device already exists
      const deviceRef = db.collection("devices").doc(deviceId);
      const doc = await deviceRef.get();

      if (doc.exists) {
        console.log(
          `Device ${deviceId} already registered, updating last seen`
        );
        await deviceRef.update({
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
          status: "online",
        });
        return;
      }

      // Register new device
      const newDevice: Device = {
        deviceId: deviceId,
        name: deviceInfo.name,
        type: deviceInfo.type,
        firmwareVersion: deviceInfo.firmwareVersion,
        macAddress: deviceInfo.macAddress,
        ipAddress: deviceInfo.ipAddress,
        sensors: deviceInfo.sensors,
        status: "online",
        registeredAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {},
      };

      await deviceRef.set(newDevice);

      // Initialize Realtime Database structure
      await rtdb.ref(`sensorReadings/${deviceId}`).set({
        deviceId: deviceId,
        latestReading: null,
        status: "waiting_for_data",
      });

      console.log(`✓ Device registered successfully: ${deviceId}`);
    } catch (error) {
      console.error("Error registering device:", error);
      throw error; // Trigger retry
    }
  }
);

/**
 * Monitor device status changes
 * Triggered by: device/status/+ → Bridge → Pub/Sub
 */
export const monitorDeviceStatus = onMessagePublished(
  {
    topic: "iot-device-status",
    region: "us-central1",
    retry: false,
    minInstances: 0,
    maxInstances: 2, // Added: limit concurrent instances
  },
  async (event: CloudEvent<MessagePublishedData<{status: string}>>): Promise<void> => {
    try {
      const deviceId = event.data.message.attributes?.device_id;
      const statusData = event.data.message.json;
      const status = statusData?.status || "unknown";

      if (!deviceId) {
        console.error("No device_id in status message");
        return;
      }

      console.log(`Device ${deviceId} status update: ${status}`);

      // Update Firestore with device status
      await db.collection("devices").doc(deviceId).update({
        status: status,
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✓ Device status updated: ${deviceId} → ${status}`);
    } catch (error) {
      console.error("Error monitoring device status:", error);
      // Don't throw - status updates are informational only
    }
  }
);

// ===========================
// REPORT GENERATION FUNCTIONS
// ===========================

interface ReportRequest {
  reportType: "water_quality" | "device_status" | "data_summary" | "compliance";
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  format?: "json" | "pdf" | "excel";
  includeCharts?: boolean;
}

interface WaterQualityMetrics {
  avgTurbidity: number;
  maxTurbidity: number;
  minTurbidity: number;
  avgTDS: number;
  maxTDS: number;
  minTDS: number;
  avgPH: number;
  maxPH: number;
  minPH: number;
  totalReadings: number;
  timeRange: { start: number; end: number };
}

interface ComplianceStatus {
  parameter: string;
  value: number;
  standard: number;
  unit: string;
  status: "compliant" | "warning" | "violation";
  percentage: number;
}

/**
 * Generate Water Quality Report
 */
export const generateReport = onRequest(
  {
    cors: true,
    invoker: "public",
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        reportType,
        deviceId,
        startDate,
        endDate,
        format = "json",
        includeCharts = false,
      } = req.body as ReportRequest;

      if (!reportType) {
        res.status(400).json({
          success: false,
          error: "Report type is required",
        } as ApiResponse);
        return;
      }

      console.log(`Generating ${reportType} report`);

      switch (reportType) {
        case "water_quality": {
          const report = await generateWaterQualityReport(
            deviceId,
            startDate,
            endDate
          );
          res.status(200).json({
            success: true,
            reportType: "water_quality",
            generatedAt: Date.now(),
            data: report,
          } as ApiResponse);
          break;
        }

        case "device_status": {
          const report = await generateDeviceStatusReport();
          res.status(200).json({
            success: true,
            reportType: "device_status",
            generatedAt: Date.now(),
            data: report,
          } as ApiResponse);
          break;
        }

        case "data_summary": {
          const report = await generateDataSummaryReport(
            deviceId,
            startDate,
            endDate
          );
          res.status(200).json({
            success: true,
            reportType: "data_summary",
            generatedAt: Date.now(),
            data: report,
          } as ApiResponse);
          break;
        }

        case "compliance": {
          const report = await generateComplianceReport(
            deviceId,
            startDate,
            endDate
          );
          res.status(200).json({
            success: true,
            reportType: "compliance",
            generatedAt: Date.now(),
            data: report,
          } as ApiResponse);
          break;
        }

        default:
          res.status(400).json({
            success: false,
            error: "Invalid report type",
          } as ApiResponse);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Report generation failed",
      } as ApiResponse);
    }
  }
);

// ===========================
// REPORT GENERATION HELPERS
// ===========================

/**
 * Water Quality Report - Comprehensive analysis
 */
async function generateWaterQualityReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000; // Default: 7 days

  const devices = deviceId
    ? [deviceId]
    : (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const reportData: Record<string, unknown> = {
    title: "Water Quality Analysis Report",
    period: { start, end },
    devices: [],
  };

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("timestamp")
      .startAt(start)
      .endAt(end)
      .once("value");

    if (!snapshot.exists()) continue;

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    // Calculate metrics
    const metrics: WaterQualityMetrics = {
      avgTurbidity: readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length,
      maxTurbidity: Math.max(...readings.map((r) => r.turbidity)),
      minTurbidity: Math.min(...readings.map((r) => r.turbidity)),
      avgTDS: readings.reduce((sum, r) => sum + r.tds, 0) / readings.length,
      maxTDS: Math.max(...readings.map((r) => r.tds)),
      minTDS: Math.min(...readings.map((r) => r.tds)),
      avgPH: readings.reduce((sum, r) => sum + r.ph, 0) / readings.length,
      maxPH: Math.max(...readings.map((r) => r.ph)),
      minPH: Math.min(...readings.map((r) => r.ph)),
      totalReadings: readings.length,
      timeRange: { start, end },
    };

    // Device info
    const deviceDoc = await db.collection("devices").doc(devId).get();
    const deviceData = deviceDoc.data();

    (reportData.devices as Array<unknown>).push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      metrics,
      readings: readings.slice(-100), // Last 100 readings
      trends: calculateTrends(readings),
      alerts: generateAlerts(metrics),
    });
  }

  return reportData;
}

/**
 * Device Status Report - Operational health overview
 */
async function generateDeviceStatusReport(): Promise<unknown> {
  const devicesSnapshot = await db.collection("devices").get();

  const statusSummary: Record<string, number> = {
    online: 0,
    offline: 0,
    error: 0,
    maintenance: 0,
  };

  const devices = devicesSnapshot.docs.map((doc) => {
    const data = doc.data();
    const status = data.status || "offline";
    statusSummary[status]++;

    // Check if device is truly online (last seen < 5 minutes)
    const lastSeenTimestamp = data.lastSeen?.toMillis?.() || 0;
    const isActive = Date.now() - lastSeenTimestamp < 5 * 60 * 1000;

    return {
      deviceId: doc.id,
      name: data.name,
      type: data.type,
      status: isActive ? status : "offline",
      lastSeen: lastSeenTimestamp,
      firmwareVersion: data.firmwareVersion,
      sensors: data.sensors,
      location: data.metadata?.location,
      connectivity: isActive ? "active" : "inactive",
      uptime: calculateUptime(lastSeenTimestamp),
    };
  });

  return {
    title: "Device Status Report",
    generatedAt: Date.now(),
    summary: {
      totalDevices: devices.length,
      statusBreakdown: statusSummary,
      healthScore: ((statusSummary.online / devices.length) * 100).toFixed(1),
    },
    devices,
    recommendations: generateDeviceRecommendations(devices),
  };
}

/**
 * Data Summary Report - Statistical analysis
 */
async function generateDataSummaryReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 30 * 24 * 60 * 60 * 1000; // Default: 30 days

  const devices = deviceId
    ? [deviceId]
    : (await db.collection("devices").get()).docs.map((doc) => doc.id);

  let totalReadings = 0;
  const aggregatedData: Record<string, unknown> = {
    turbidity: [],
    tds: [],
    ph: [],
  };

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("timestamp")
      .startAt(start)
      .endAt(end)
      .once("value");

    if (!snapshot.exists()) continue;

    snapshot.forEach((child) => {
      const reading = child.val();
      (aggregatedData.turbidity as number[]).push(reading.turbidity);
      (aggregatedData.tds as number[]).push(reading.tds);
      (aggregatedData.ph as number[]).push(reading.ph);
      totalReadings++;
    });
  }

  return {
    title: "Data Summary Report",
    period: { start, end },
    summary: {
      totalReadings,
      totalDevices: devices.length,
      dataCompleteness: calculateDataCompleteness(totalReadings, start, end),
    },
    statistics: {
      turbidity: calculateStatistics(aggregatedData.turbidity as number[]),
      tds: calculateStatistics(aggregatedData.tds as number[]),
      ph: calculateStatistics(aggregatedData.ph as number[]),
    },
    hourlyDistribution: calculateHourlyDistribution(devices, start, end),
    dataQuality: assessDataQuality(aggregatedData),
  };
}

/**
 * Compliance Report - Regulatory standards verification
 */
async function generateComplianceReport(
  deviceId?: string,
  startDate?: number,
  endDate?: number
): Promise<unknown> {
  const end = endDate || Date.now();
  const start = startDate || end - 7 * 24 * 60 * 60 * 1000;

  // WHO/EPA Standards
  const standards = {
    turbidity: { max: 5, unit: "NTU", name: "Turbidity" },
    tds: { max: 500, unit: "ppm", name: "Total Dissolved Solids" },
    ph: { min: 6.5, max: 8.5, unit: "pH", name: "pH Level" },
  };

  const devices = deviceId
    ? [deviceId]
    : (await db.collection("devices").get()).docs.map((doc) => doc.id);

  const complianceData: Array<unknown> = [];

  for (const devId of devices) {
    const snapshot = await rtdb
      .ref(`sensorReadings/${devId}/history`)
      .orderByChild("timestamp")
      .startAt(start)
      .endAt(end)
      .once("value");

    if (!snapshot.exists()) continue;

    const readings: SensorReading[] = [];
    snapshot.forEach((child) => {
      readings.push(child.val());
    });

    if (readings.length === 0) continue;

    // Calculate compliance metrics
    const avgTurbidity = readings.reduce((sum, r) => sum + r.turbidity, 0) / readings.length;
    const avgTDS = readings.reduce((sum, r) => sum + r.tds, 0) / readings.length;
    const avgPH = readings.reduce((sum, r) => sum + r.ph, 0) / readings.length;

    const violations = {
      turbidity: readings.filter((r) => r.turbidity > standards.turbidity.max).length,
      tds: readings.filter((r) => r.tds > standards.tds.max).length,
      ph: readings.filter((r) => r.ph < standards.ph.min || r.ph > standards.ph.max).length,
    };

    const complianceStatus: ComplianceStatus[] = [
      {
        parameter: "Turbidity",
        value: avgTurbidity,
        standard: standards.turbidity.max,
        unit: standards.turbidity.unit,
        status: avgTurbidity <= standards.turbidity.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.turbidity) / readings.length) * 100,
      },
      {
        parameter: "TDS",
        value: avgTDS,
        standard: standards.tds.max,
        unit: standards.tds.unit,
        status: avgTDS <= standards.tds.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.tds) / readings.length) * 100,
      },
      {
        parameter: "pH",
        value: avgPH,
        standard: (standards.ph.min + standards.ph.max) / 2,
        unit: standards.ph.unit,
        status:
          avgPH >= standards.ph.min && avgPH <= standards.ph.max ? "compliant" : "violation",
        percentage: ((readings.length - violations.ph) / readings.length) * 100,
      },
    ];

    const deviceDoc = await db.collection("devices").doc(devId).get();
    const deviceData = deviceDoc.data();

    complianceData.push({
      deviceId: devId,
      deviceName: deviceData?.name,
      location: deviceData?.metadata?.location,
      totalReadings: readings.length,
      complianceStatus,
      overallCompliance: complianceStatus.every((s) => s.status === "compliant"),
      violations,
      recommendations: generateComplianceRecommendations(complianceStatus, violations),
    });
  }

  return {
    title: "Water Quality Compliance Report",
    period: { start, end },
    standards: {
      turbidity: `≤ ${standards.turbidity.max} ${standards.turbidity.unit}`,
      tds: `≤ ${standards.tds.max} ${standards.tds.unit}`,
      ph: `${standards.ph.min} - ${standards.ph.max}`,
      reference: "WHO/EPA Drinking Water Standards",
    },
    devices: complianceData,
    summary: {
      totalDevices: complianceData.length,
      compliantDevices: complianceData.filter((d: any) => d.overallCompliance).length,
      complianceRate: (
        (complianceData.filter((d: any) => d.overallCompliance).length / complianceData.length) *
        100
      ).toFixed(1),
    },
  };
}

// ===========================
// UTILITY FUNCTIONS
// ===========================

function calculateStatistics(data: number[]): Record<string, number> {
  if (data.length === 0) return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0 };

  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    min: Math.min(...data),
    max: Math.max(...data),
  };
}

function calculateTrends(readings: SensorReading[]): Record<string, string> {
  if (readings.length < 2) return { turbidity: "stable", tds: "stable", ph: "stable" };

  const recent = readings.slice(-10);
  const older = readings.slice(-20, -10);

  const avgRecentTurbidity = recent.reduce((s, r) => s + r.turbidity, 0) / recent.length;
  const avgOlderTurbidity = older.reduce((s, r) => s + r.turbidity, 0) / older.length;

  const avgRecentTDS = recent.reduce((s, r) => s + r.tds, 0) / recent.length;
  const avgOlderTDS = older.reduce((s, r) => s + r.tds, 0) / older.length;

  const avgRecentPH = recent.reduce((s, r) => s + r.ph, 0) / recent.length;
  const avgOlderPH = older.reduce((s, r) => s + r.ph, 0) / older.length;

  return {
    turbidity:
      avgRecentTurbidity > avgOlderTurbidity * 1.1
        ? "increasing"
        : avgRecentTurbidity < avgOlderTurbidity * 0.9
          ? "decreasing"
          : "stable",
    tds:
      avgRecentTDS > avgOlderTDS * 1.1
        ? "increasing"
        : avgRecentTDS < avgOlderTDS * 0.9
          ? "decreasing"
          : "stable",
    ph:
      avgRecentPH > avgOlderPH * 1.05
        ? "increasing"
        : avgRecentPH < avgOlderPH * 0.95
          ? "decreasing"
          : "stable",
  };
}

function generateAlerts(metrics: WaterQualityMetrics): Array<unknown> {
  const alerts: Array<unknown> = [];

  if (metrics.avgTurbidity > 5) {
    alerts.push({
      severity: "high",
      parameter: "turbidity",
      message: "Average turbidity exceeds WHO standards (5 NTU)",
      value: metrics.avgTurbidity.toFixed(2),
    });
  }

  if (metrics.avgTDS > 500) {
    alerts.push({
      severity: "medium",
      parameter: "tds",
      message: "Average TDS exceeds recommended limit (500 ppm)",
      value: metrics.avgTDS.toFixed(2),
    });
  }

  if (metrics.avgPH < 6.5 || metrics.avgPH > 8.5) {
    alerts.push({
      severity: "high",
      parameter: "ph",
      message: "pH level outside safe range (6.5-8.5)",
      value: metrics.avgPH.toFixed(2),
    });
  }

  return alerts;
}

function calculateUptime(lastSeenTimestamp: number): string {
  const now = Date.now();
  const diff = now - lastSeenTimestamp;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  return hours < 1 ? "< 1 hour" : `${hours} hours ago`;
}

function generateDeviceRecommendations(devices: Array<any>): Array<string> {
  const recommendations: Array<string> = [];
  const offlineCount = devices.filter((d) => d.connectivity === "inactive").length;

  if (offlineCount > 0) {
    recommendations.push(`${offlineCount} device(s) are offline - check connectivity`);
  }

  return recommendations;
}

function calculateDataCompleteness(
  totalReadings: number,
  start: number,
  end: number
): string {
  const expectedReadings = Math.floor((end - start) / (5 * 60 * 1000)); // Every 5 minutes
  const completeness = (totalReadings / expectedReadings) * 100;
  return `${Math.min(completeness, 100).toFixed(1)}%`;
}

function calculateHourlyDistribution(
  devices: string[],
  start: number,
  end: number
): Promise<Record<string, number>> {
  // Simplified - return empty for now
  return Promise.resolve({});
}

function assessDataQuality(data: Record<string, unknown>): Record<string, string> {
  return {
    overall: "good",
    turbidity: "good",
    tds: "good",
    ph: "good",
  };
}

function generateComplianceRecommendations(
  status: ComplianceStatus[],
  violations: Record<string, number>
): Array<string> {
  const recommendations: Array<string> = [];

  if (violations.turbidity > 0) {
    recommendations.push("Check and replace water filters - high turbidity detected");
  }

  if (violations.tds > 0) {
    recommendations.push("Consider RO system maintenance - elevated TDS levels");
  }

  if (violations.ph > 0) {
    recommendations.push("pH adjustment required - levels outside safe range");
  }

  return recommendations;
}
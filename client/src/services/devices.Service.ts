/**
 * Devices Service
 * 
 * Manages IoT devices and their sensor readings through Firebase services.
 * 
 * Write Operations: Cloud Functions (DevicesCalls)
 * Read Operations: Realtime Database (RTDB) listeners for sensor data
 * Metadata: Firestore for device configuration
 * 
 * Features:
 * - Device CRUD operations
 * - Real-time sensor reading subscriptions
 * - Sensor history with configurable limits
 * - Multi-device monitoring
 * - Defensive caching to prevent null propagation
 * 
 * Architecture Pattern:
 * - READ operations: Direct Firebase access (Firestore/RTDB) for real-time data
 * - WRITE operations: Cloud Functions only for security and validation
 * 
 * Cloud Functions (functions/src_new/callable/Devices.ts):
 *   - addDevice: Create new device (admin only)
 *   - updateDevice: Modify device properties (admin only)
 *   - deleteDevice: Remove device and sensor data (admin only)
 * 
 * @module services/devices
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/database';
import type { 
  Device, 
  SensorReading, 
  DeviceData, 
  DeviceResponse 
} from '../schemas';
import { dataFlowLogger, DataSource, FlowLayer } from '../utils/dataFlowLogger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * DevicesService
 * 
 * Client Direct Access (this service):
 *   - listDevices: Query Firestore devices collection
 *   - getSensorReadings: Read from RTDB sensorReadings/{deviceId}/latestReading
 *   - getSensorHistory: Read from RTDB sensorReadings/{deviceId}/history
 *   - subscribeToSensorReadings: Real-time RTDB listener
 *   - subscribeToSensorHistory: Real-time RTDB listener
 * 
 * Helper Methods:
 *   - registerDevice: Convenience wrapper for updateDevice with location metadata
 */
export class DevicesService {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly functions = getFunctions();
  private readonly db = getDatabase();
  private readonly firestore = getFirestore();
  private readonly functionName = 'DevicesCalls'; // Must match exported function name in functions/src_new/index.ts

  // ==========================================================================
  // ERROR MESSAGES
  // ==========================================================================
  
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission to perform this action',
    'functions/not-found': 'Device not found',
    'functions/already-exists': 'Device already exists',
    'functions/invalid-argument': 'Invalid request parameters',
    'functions/internal': 'An internal error occurred. Please try again',
    'functions/unavailable': 'Service temporarily unavailable. Please try again',
    'functions/deadline-exceeded': 'Request timeout. Please try again',
  };

  // ==========================================================================
  // READ OPERATIONS (Firestore Queries)
  // ==========================================================================

  /**
   * List all devices from Firestore
   * 
   * @returns Promise with array of devices
   * @throws {Error} If fetch fails
   */
  async listDevices(): Promise<Device[]> {
    try {
      console.log('≡ƒôí Fetching devices from Firestore...');
      const devicesRef = collection(this.firestore, 'devices');
      
      // Try without orderBy first to see if that's causing issues
      let snapshot;
      try {
        const q = query(devicesRef, orderBy('registeredAt', 'desc'));
        snapshot = await getDocs(q);
        console.log('≡ƒôè Firestore query with orderBy completed:', snapshot.size, 'documents found');
      } catch (orderError: any) {
        console.warn('ΓÜá∩╕Å OrderBy failed, trying without ordering:', orderError.message);
        // Fallback to query without orderBy
        snapshot = await getDocs(devicesRef);
        console.log('≡ƒôè Firestore query without orderBy completed:', snapshot.size, 'documents found');
      }
      
      const devices = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('≡ƒôä Device document:', doc.id, data);
        return {
          id: doc.id,
          deviceId: doc.id,
          ...data
        } as Device;
      });
      
      console.log('Γ£à Mapped devices:', devices);
      return devices;
    } catch (error: any) {
      console.error('Γ¥î Error fetching devices from Firestore:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error('Failed to list devices');
    }
  }

  /** READ - Real-time RTDB listener */
  subscribeToSensorReadings(
    deviceId: string,
    onUpdate: (reading: SensorReading | null) => void,
    onError: (error: Error) => void
  ): Unsubscribe {
    // Cache last valid reading to prevent null propagation during RTDB stalls
    let lastValidReading: SensorReading | null = null;
    let isFirstSnapshot = true;

    return onValue(
      ref(this.db, `sensorReadings/${deviceId}/latestReading`),
      (snapshot) => {
        const reading = snapshot.val() as SensorReading | null;
        
        dataFlowLogger.log(
          DataSource.RTDB,
          FlowLayer.SERVICE,
          `Device ${deviceId}: Reading received`,
          { reading: reading ? 'valid' : 'null', isFirstSnapshot }
        );
        
        // DEFENSIVE: If we get null on a subsequent update and had valid data before,
        // this might be a temporary RTDB disconnection - don't propagate it
        if (!isFirstSnapshot && reading === null && lastValidReading !== null) {
          dataFlowLogger.logStateRejection(
            DataSource.RTDB,
            FlowLayer.SERVICE,
            `Device ${deviceId}: Null reading during active session - likely RTDB stall`,
            reading,
            lastValidReading
          );
          console.warn(`[DeviceService] Device ${deviceId}: Rejecting null reading - likely RTDB stall`);
          console.warn(`[DeviceService] Device ${deviceId}: Maintaining cached reading`);
          return; // Don't propagate null
        }

        // Valid data (including legitimate null on first load) - cache and propagate
        lastValidReading = reading;
        isFirstSnapshot = false;
        
        dataFlowLogger.log(
          DataSource.RTDB,
          FlowLayer.SERVICE,
          `Device ${deviceId}: Propagating reading`,
          { reading }
        );
        
        onUpdate(reading);
      },
      (err) => {
        dataFlowLogger.log(
          DataSource.RTDB,
          FlowLayer.SERVICE,
          `Device ${deviceId}: Subscription error`,
          { error: err instanceof Error ? err.message : 'Unknown error' }
        );
        onError(err instanceof Error ? err : new Error('Failed to fetch sensor data'));
      }
    );
  }

  /** READ - Real-time RTDB listener */
  subscribeToSensorHistory(
    deviceId: string,
    onUpdate: (history: SensorReading[]) => void,
    onError: (error: Error) => void,
    limit: number = 50
  ): Unsubscribe {
    return onValue(
      ref(this.db, `sensorReadings/${deviceId}/history`),
      (snapshot) => {
        const data = snapshot.val();
        const readings = data ? (Object.values(data) as SensorReading[]) : [];
        onUpdate(readings.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit));
      },
      (err) => onError(err instanceof Error ? err : new Error('Failed to fetch sensor history'))
    );
  }

  /** READ - Get sensor readings once (async) */
  async getSensorReadings(deviceId: string): Promise<SensorReading | null> {
    try {
      const snapshot = await new Promise<any>((resolve, reject) => {
        const unsubscribe = onValue(
          ref(this.db, `sensorReadings/${deviceId}/latestReading`),
          (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });
      return snapshot.val() as SensorReading | null;
    } catch (error) {
      console.error(`Error fetching sensor readings for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch sensor readings for device ${deviceId}`);
    }
  }

  /** READ - Get sensor history once (async) */
  async getSensorHistory(deviceId: string, limit: number = 50): Promise<SensorReading[]> {
    try {
      const snapshot = await new Promise<any>((resolve, reject) => {
        const unsubscribe = onValue(
          ref(this.db, `sensorReadings/${deviceId}/history`),
          (snapshot) => {
            unsubscribe();
            resolve(snapshot);
          },
          (error) => {
            unsubscribe();
            reject(error);
          }
        );
      });
      
      const data = snapshot.val();
      const readings = data ? (Object.values(data) as SensorReading[]) : [];
      return readings.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    } catch (error) {
      console.error(`Error fetching sensor history for device ${deviceId}:`, error);
      throw new Error(`Failed to fetch sensor history for device ${deviceId}`);
    }
  }

  /** READ - Real-time RTDB listeners */
  subscribeToMultipleDevices(
    deviceIds: string[],
    onUpdate: (deviceId: string, reading: SensorReading | null) => void,
    onError: (deviceId: string, error: Error) => void
  ): () => void {
    const unsubscribers = deviceIds.map((deviceId) =>
      this.subscribeToSensorReadings(
        deviceId,
        (reading) => onUpdate(deviceId, reading),
        (error) => onError(deviceId, error)
      )
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }

  // ============================================================================
  // WRITE OPERATIONS (Cloud Functions)
  // ============================================================================

  /**
   * Generic Cloud Function caller with type safety
   * 
   * @template T - Request payload type
   * @param action - Cloud Function action name
   * @param data - Request data (without action field)
   * @throws {ErrorResponse} Transformed error with user-friendly message
   */
  private async callFunction<T>(action: string, data: Omit<T, 'action'>): Promise<DeviceResponse> {
    try {
      const callable = httpsCallable<T, DeviceResponse>(this.functions, this.functionName);
      const result = await callable({ action, ...data } as T);
      
      if (!result.data.success) {
        throw new Error(result.data.message || `Failed to ${action}`);
      }
      
      return result.data;
    } catch (error: any) {
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  /** WRITE - Cloud Function */
  async addDevice(deviceId: string, deviceData: DeviceData): Promise<Device> {
    const result = await this.callFunction<{ action: string; deviceId: string; deviceData: DeviceData }>(
      'addDevice',
      { deviceId, deviceData }
    );
    if (!result.device) throw new Error('Device creation failed');
    return result.device;
  }

  /** WRITE - Cloud Function */
  async updateDevice(deviceId: string, deviceData: DeviceData): Promise<void> {
    await this.callFunction<{ action: string; deviceId: string; deviceData: DeviceData }>(
      'updateDevice',
      { deviceId, deviceData }
    );
  }

  /** WRITE - Cloud Function */
  async deleteDevice(deviceId: string): Promise<void> {
    await this.callFunction<{ action: string; deviceId: string }>(
      'deleteDevice',
      { deviceId }
    );
  }

  /**
   * Register a device by updating its location metadata
   * This is a convenience method that calls updateDevice
   */
  async registerDevice(deviceId: string, building: string, floor: string, notes?: string): Promise<void> {
    await this.updateDevice(deviceId, {
      metadata: { location: { building, floor, notes: notes || '' } }
    });
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Transform errors into user-friendly messages
   * 
   * @param error - Raw error from Firebase or application
   * @param defaultMessage - Fallback message if error unmapped
   * @returns Standardized error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('[DevicesService] Error:', error);

    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const friendlyMessage = code === 'functions/failed-precondition' 
      ? message 
      : DevicesService.ERROR_MESSAGES[code] || message;

    return { code, message: friendlyMessage, details: error.details };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const devicesService = new DevicesService();
export default devicesService;

// ============================================================================
// DEPRECATED EXPORTS - For backwards compatibility
// TODO: Remove these after migrating all staff pages to use global hooks
// ============================================================================

/**
 * @deprecated Use devicesService instead
 */
export const deviceManagementService = devicesService;

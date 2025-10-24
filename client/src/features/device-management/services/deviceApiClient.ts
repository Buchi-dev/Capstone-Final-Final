/**
 * Device API Client
 * API client for device management operations using the shared HTTP client
 */

import { deviceHttpClient } from '../../../shared/services/http/httpClient';
import { safeParseApiResponse } from '../../../schemas';
import type { Device, SensorReading, ApiResponse } from '../../../schemas';

/**
 * Device API Operations
 */
export const deviceApiClient = {
  /**
   * List all devices
   */
  listDevices: async (): Promise<Device[]> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'LIST_DEVICES',
    });

    // Validate response with Zod
    const validationResult = safeParseApiResponse(data);
    if (!validationResult.success) {
      console.error('Invalid API response:', validationResult.error);
      throw new Error('Invalid response from server');
    }

    return validationResult.data.devices || [];
  },

  /**
   * Get specific device by ID
   */
  getDevice: async (deviceId: string): Promise<Device | null> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'GET_DEVICE',
      deviceId,
    });
    return data.device || null;
  },

  /**
   * Get latest sensor readings for a device
   */
  getSensorReadings: async (deviceId: string): Promise<SensorReading | null> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'GET_SENSOR_READINGS',
      deviceId,
    });
    return data.sensorData || null;
  },

  /**
   * Get sensor history for a device
   */
  getSensorHistory: async (deviceId: string, limit = 50): Promise<SensorReading[]> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'GET_SENSOR_HISTORY',
      deviceId,
      limit,
    });
    return data.history || [];
  },

  /**
   * Send command to device
   */
  sendCommand: async (
    deviceId: string,
    command: string,
    params?: Record<string, unknown>
  ): Promise<boolean> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'SEND_COMMAND',
      deviceId,
      command,
      params,
    });
    return data.success;
  },

  /**
   * Discover available devices
   */
  discoverDevices: async (): Promise<boolean> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'DISCOVER_DEVICES',
    });
    return data.success;
  },

  /**
   * Add a new device
   */
  addDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'ADD_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  /**
   * Update device information
   */
  updateDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'UPDATE_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  /**
   * Delete a device
   */
  deleteDevice: async (deviceId: string): Promise<boolean> => {
    const { data } = await deviceHttpClient.post<ApiResponse>('', {
      action: 'DELETE_DEVICE',
      deviceId,
    });
    return data.success;
  },
};

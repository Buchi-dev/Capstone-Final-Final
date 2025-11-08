/**
 * useCall_Devices - Write Hook
 * 
 * Handles device write operations (add, update, delete, register).
 * Wraps devicesService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * 
 * @module hooks/writes
 */

import { useState, useCallback } from 'react';
import { devicesService } from '../../services/devices.Service';
import type { Device, DeviceData } from '../../schemas';

/**
 * Device operation types
 */
type DeviceOperation = 'add' | 'update' | 'delete' | 'register';

/**
 * Hook return value
 */
interface UseCallDevicesReturn {
  /** Add a new device */
  addDevice: (deviceId: string, deviceData: DeviceData) => Promise<Device>;
  /** Update an existing device */
  updateDevice: (deviceId: string, deviceData: DeviceData) => Promise<void>;
  /** Delete a device */
  deleteDevice: (deviceId: string) => Promise<void>;
  /** Register a device with location */
  registerDevice: (deviceId: string, building: string, floor: string, notes?: string) => Promise<void>;
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Currently executing operation type */
  operationType: DeviceOperation | null;
  /** Result from last add operation */
  addedDevice: Device | null;
  /** Reset error, success states, and added device */
  reset: () => void;
}

/**
 * Hook for device write operations
 * 
 * Provides functions for all device CRUD operations with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   addDevice, 
 *   updateDevice, 
 *   deleteDevice, 
 *   registerDevice,
 *   isLoading, 
 *   error, 
 *   isSuccess,
 *   addedDevice
 * } = useCall_Devices();
 * 
 * // Add new device
 * const device = await addDevice('ESP32-001', {
 *   name: 'Water Quality Sensor 1',
 *   type: 'ESP32',
 *   sensors: ['tds', 'ph', 'turbidity']
 * });
 * 
 * // Update device
 * await updateDevice('ESP32-001', { status: 'maintenance' });
 * 
 * // Register device location
 * await registerDevice('ESP32-001', 'Building A', 'Floor 2', 'Near cafeteria');
 * 
 * // Delete device
 * await deleteDevice('ESP32-001');
 * ```
 * 
 * @returns Device operation functions and state
 */
export const useCall_Devices = (): UseCallDevicesReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [operationType, setOperationType] = useState<DeviceOperation | null>(null);
  const [addedDevice, setAddedDevice] = useState<Device | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setOperationType(null);
    setAddedDevice(null);
  }, []);

  const addDevice = useCallback(async (
    deviceId: string, 
    deviceData: DeviceData
  ): Promise<Device> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('add');
      setAddedDevice(null);

      const device = await devicesService.addDevice(deviceId, deviceData);

      setIsSuccess(true);
      setAddedDevice(device);
      return device;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add device');
      console.error('[useCall_Devices] Add error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateDevice = useCallback(async (
    deviceId: string, 
    deviceData: DeviceData
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('update');

      await devicesService.updateDevice(deviceId, deviceData);

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update device');
      console.error('[useCall_Devices] Update error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteDevice = useCallback(async (deviceId: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('delete');

      await devicesService.deleteDevice(deviceId);

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete device');
      console.error('[useCall_Devices] Delete error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const registerDevice = useCallback(async (
    deviceId: string,
    building: string,
    floor: string,
    notes?: string
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('register');

      await devicesService.registerDevice(deviceId, building, floor, notes);

      setIsSuccess(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register device');
      console.error('[useCall_Devices] Register error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    addDevice,
    updateDevice,
    deleteDevice,
    registerDevice,
    isLoading,
    error,
    isSuccess,
    operationType,
    addedDevice,
    reset,
  };
};

export default useCall_Devices;

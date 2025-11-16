/**
 * useCall_Devices - Write Hook
 * 
 * Handles device write operations (update, delete, register).
 * Wraps devicesService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Does not handle real-time subscriptions
 * ⚠️ MANUAL DEVICE CREATION REMOVED - Devices auto-created via MQTT
 * 
 * @module hooks/writes
 */

import { useState, useCallback } from 'react';
import { devicesService } from '../../services/devices.Service';
import type { DeviceData } from '../../schemas';

/**
 * Device operation types
 */
type DeviceOperation = 'update' | 'delete' | 'register';

/**
 * Hook return value
 */
interface UseCallDevicesReturn {
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
  /** Reset error, success states */
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
 *   updateDevice, 
 *   deleteDevice, 
 *   registerDevice,
 *   isLoading, 
 *   error, 
 *   isSuccess
 * } = useCall_Devices();
 * 
 * // Update device
 * await updateDevice('ESP32-001', { status: 'maintenance' });
 * 
 * // Register device location (assigns building + floor to unregistered device)
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

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setOperationType(null);
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
    updateDevice,
    deleteDevice,
    registerDevice,
    isLoading,
    error,
    isSuccess,
    operationType,
    reset,
  };
};

export default useCall_Devices;

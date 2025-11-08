/**
 * useRealtime_Devices - Read Hook
 * 
 * Real-time listener for device sensor data via RTDB and Firestore.
 * Combines device metadata (Firestore) with live sensor readings (RTDB).
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * Architecture:
 * - Device status comes from Firestore ONLY
 * - RTDB subscriptions update latestReading but NOT device status
 * 
 * @module hooks/reads
 */

import { useState, useEffect } from 'react';
import { devicesService } from '../../services/devices.Service';
import type { Device, SensorReading } from '../../schemas';

/**
 * Device with sensor data
 */
export interface DeviceWithSensorData {
  /** Unique device identifier */
  deviceId: string;
  /** Human-readable device name */
  deviceName: string;
  /** Latest sensor reading from RTDB */
  latestReading: SensorReading | null;
  /** Device status from Firestore (source of truth) */
  status: 'online' | 'offline' | 'error' | 'maintenance';
  /** Location string (building, floor) */
  location?: string;
  /** Full device metadata */
  metadata?: Device;
}

/**
 * Hook configuration options
 */
interface UseRealtimeDevicesOptions {
  /** Enable/disable auto-subscription (default: true) */
  enabled?: boolean;
  /** Include full device metadata in response (default: false) */
  includeMetadata?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeDevicesReturn {
  /** Array of devices with real-time sensor data */
  devices: DeviceWithSensorData[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function (reconnects listeners) */
  refetch: () => void;
}

/**
 * Subscribe to real-time device sensor data
 * 
 * Fetches device list from Firestore, then subscribes to RTDB for live readings.
 * Device status remains synced with Firestore (source of truth).
 * 
 * @example
 * ```tsx
 * const { devices, isLoading, error } = useRealtime_Devices();
 * 
 * // With metadata
 * const { devices } = useRealtime_Devices({ includeMetadata: true });
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time device data, loading state, and error state
 */
export const useRealtime_Devices = (
  options: UseRealtimeDevicesOptions = {}
): UseRealtimeDevicesReturn => {
  const { enabled = true, includeMetadata = false } = options;

  const [devices, setDevices] = useState<DeviceWithSensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let unsubscribeAll: (() => void) | null = null;

    const initDevices = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // READ: Fetch device list from Firestore
        const devicesData = await devicesService.listDevices();

        const formattedDevices: DeviceWithSensorData[] = devicesData.map((device) => ({
          deviceId: device.deviceId,
          deviceName: device.name || device.deviceId,
          latestReading: null,
          status: device.status || 'offline',
          location: device.metadata?.location
            ? `${device.metadata.location.building || ''}, ${device.metadata.location.floor || ''}`
            : undefined,
          ...(includeMetadata && { metadata: device }),
        }));

        setDevices(formattedDevices);

        // READ: Subscribe to real-time sensor readings from RTDB
        if (formattedDevices.length > 0) {
          const deviceIds = formattedDevices.map((d) => d.deviceId);
          
          unsubscribeAll = devicesService.subscribeToMultipleDevices(
            deviceIds,
            (deviceId, reading) => {
              if (reading) {
                // ✅ Update sensor reading, keep Firestore status as source of truth
                setDevices((prevDevices) =>
                  prevDevices.map((device) =>
                    device.deviceId === deviceId
                      ? { ...device, latestReading: reading }
                      : device
                  )
                );
              }
            },
            (deviceId, err) => {
              console.error(`[useRealtime_Devices] Error with device ${deviceId}:`, err);
              // Don't set global error for individual device failures
            }
          );
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[useRealtime_Devices] Error fetching devices:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
        setIsLoading(false);
      }
    };

    initDevices();

    return () => {
      if (unsubscribeAll) {
        unsubscribeAll();
      }
    };
  }, [enabled, includeMetadata, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    devices,
    isLoading,
    error,
    refetch,
  };
};

export default useRealtime_Devices;

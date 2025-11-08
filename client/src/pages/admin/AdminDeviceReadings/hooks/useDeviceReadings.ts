import { useState, useEffect, useCallback } from 'react';
import { deviceManagementService } from '../../../../services/devices.Service';
import { alertsService } from '../../../../services/alerts.Service';
import type { Device, SensorReading } from '../../../../schemas/deviceManagement.schema';
import type { WaterQualityAlert } from '../../../../schemas/alerts.schema';

export interface DeviceWithReadings extends Device {
  latestReading: SensorReading | null;
  activeAlerts: WaterQualityAlert[];
  severityScore: number; // Higher = more critical
  severityLevel: 'critical' | 'warning' | 'normal' | 'offline';
}

/**
 * Custom hook for device readings with real-time updates and severity-based sorting
 */
export const useDeviceReadings = () => {
  const [devices, setDevices] = useState<DeviceWithReadings[]>([]);
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Calculate severity score based on readings and alerts
  const calculateSeverity = useCallback(
    (device: Device, reading: SensorReading | null, deviceAlerts: WaterQualityAlert[]): {
      score: number;
      level: 'critical' | 'warning' | 'normal' | 'offline';
    } => {
      // Offline devices get lowest priority
      if (device.status === 'offline' || !reading) {
        return { score: 0, level: 'offline' };
      }

      let score = 100; // Base score for online devices

      // Critical alerts add massive score
      const criticalAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === 'Critical' && a.status === 'Active'
      );
      const warningAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === 'Warning' && a.status === 'Active'
      );
      const advisoryAlerts = deviceAlerts.filter(
        (a) => a.deviceId === device.deviceId && a.severity === 'Advisory' && a.status === 'Active'
      );

      score += criticalAlerts.length * 1000;
      score += warningAlerts.length * 500;
      score += advisoryAlerts.length * 100;

      // Check parameter thresholds (add to score even without alerts)
      // pH: ideal range 6.5-8.5
      if (reading.ph < 6.5 || reading.ph > 8.5) {
        score += Math.abs(reading.ph - 7.0) * 50;
      }

      // TDS: ideal < 500 ppm
      if (reading.tds > 500) {
        score += (reading.tds - 500) * 0.5;
      }

      // Turbidity: ideal < 5 NTU
      if (reading.turbidity > 5) {
        score += (reading.turbidity - 5) * 20;
      }

      // Determine severity level
      let level: 'critical' | 'warning' | 'normal' | 'offline';
      if (criticalAlerts.length > 0) {
        level = 'critical';
      } else if (warningAlerts.length > 0 || score > 300) {
        level = 'warning';
      } else {
        level = 'normal';
      }

      return { score, level };
    },
    []
  );

  // Refresh data manually
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const devicesData = await deviceManagementService.listDevices();
      
      // Get initial readings for all devices
      const devicesWithReadings = await Promise.all(
        devicesData.map(async (device) => {
          try {
            const reading = await deviceManagementService.getSensorReadings(device.deviceId);
            const deviceAlerts = alerts.filter((a) => a.deviceId === device.deviceId);
            const { score, level } = calculateSeverity(device, reading, deviceAlerts);
            
            return {
              ...device,
              latestReading: reading,
              activeAlerts: deviceAlerts,
              severityScore: score,
              severityLevel: level,
            };
          } catch (err) {
            console.error(`Error fetching readings for ${device.deviceId}:`, err);
            return {
              ...device,
              latestReading: null,
              activeAlerts: [],
              severityScore: 0,
              severityLevel: 'offline' as const,
            };
          }
        })
      );

      // Sort by severity score (highest first)
      devicesWithReadings.sort((a, b) => b.severityScore - a.severityScore);
      setDevices(devicesWithReadings);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error refreshing devices:', err);
      setError(err instanceof Error ? err : new Error('Failed to refresh devices'));
    } finally {
      setLoading(false);
    }
  }, [alerts, calculateSeverity]);

  useEffect(() => {
    let unsubscribeDevices: (() => void) | null = null;
    let unsubscribeAlerts: (() => void) | null = null;
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initial devices
        const devicesData = await deviceManagementService.listDevices();

        // Subscribe to alerts
        unsubscribeAlerts = alertsService.subscribeToAlerts(
          (alertsData) => {
            if (!mounted) return;
            setAlerts(alertsData);
          },
          (err) => {
            console.error('Alerts subscription error:', err);
          },
          100 // Get more alerts for comprehensive monitoring
        );

        // Initialize devices with readings and alerts
        const devicesWithReadings: DeviceWithReadings[] = await Promise.all(
          devicesData.map(async (device) => {
            const reading = await deviceManagementService.getSensorReadings(device.deviceId);
            return {
              ...device,
              latestReading: reading,
              activeAlerts: [],
              severityScore: 0,
              severityLevel: 'offline' as const,
            };
          })
        );

        if (!mounted) return;
        setDevices(devicesWithReadings);

        // Subscribe to real-time sensor readings
        if (devicesData.length > 0) {
          const deviceIds = devicesData.map((d) => d.deviceId);
          unsubscribeDevices = deviceManagementService.subscribeToMultipleDevices(
            deviceIds,
            (deviceId, reading) => {
              if (!mounted) return;
              setDevices((prev) => {
                const updated = prev.map((d) => {
                  if (d.deviceId === deviceId) {
                    const deviceAlerts = alerts.filter((a) => a.deviceId === deviceId);
                    const { score, level } = calculateSeverity(d, reading, deviceAlerts);
                    return {
                      ...d,
                      latestReading: reading,
                      activeAlerts: deviceAlerts,
                      severityScore: score,
                      severityLevel: level,
                    };
                  }
                  return d;
                });
                // Re-sort by severity
                updated.sort((a, b) => b.severityScore - a.severityScore);
                return updated;
              });
              setLastUpdate(new Date());
            },
            (deviceId, err) => {
              console.error(`Error with device ${deviceId}:`, err);
            }
          );
        }

        setLastUpdate(new Date());
      } catch (err) {
        console.error('Error initializing device readings:', err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load devices'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      unsubscribeDevices?.();
      unsubscribeAlerts?.();
    };
  }, []);

  // Re-calculate severity when alerts change
  useEffect(() => {
    setDevices((prev) => {
      const updated = prev.map((device) => {
        const deviceAlerts = alerts.filter(
          (a) => a.deviceId === device.deviceId && a.status === 'Active'
        );
        const { score, level } = calculateSeverity(device, device.latestReading, deviceAlerts);
        return {
          ...device,
          activeAlerts: deviceAlerts,
          severityScore: score,
          severityLevel: level,
        };
      });
      // Re-sort by severity
      updated.sort((a, b) => b.severityScore - a.severityScore);
      return updated;
    });
  }, [alerts, calculateSeverity]);

  return {
    devices,
    loading,
    error,
    lastUpdate,
    refresh,
    stats: {
      total: devices.length,
      online: devices.filter((d) => d.status === 'online').length,
      offline: devices.filter((d) => d.status === 'offline').length,
      critical: devices.filter((d) => d.severityLevel === 'critical').length,
      warning: devices.filter((d) => d.severityLevel === 'warning').length,
      normal: devices.filter((d) => d.severityLevel === 'normal').length,
    },
  };
};

/**
 * useDeviceRegistrations Hook
 * 
 * Listens to MQTT for device registration messages
 * Automatically detects new unregistered devices
 * 
 * @module hooks/useDeviceRegistrations
 */

import { useEffect, useCallback } from 'react';
import { subscribeToTopic, unsubscribeFromTopic, MQTT_TOPICS } from '../utils/mqtt';
import { message as antMessage } from 'antd';

export interface DeviceRegistrationData {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  timestamp?: string;
}

interface UseDeviceRegistrationsOptions {
  enabled?: boolean;
  onDeviceDetected?: (deviceData: DeviceRegistrationData) => void;
  onDeviceRegistered?: (deviceData: DeviceRegistrationData) => void;
}

/**
 * Hook to listen for device registration messages via MQTT
 * 
 * @example
 * useDeviceRegistrations({
 *   enabled: true,
 *   onDeviceDetected: (device) => {
 *     console.log('New device detected:', device);
 *     // Show notification or add to unregistered list
 *   }
 * });
 */
export function useDeviceRegistrations(options: UseDeviceRegistrationsOptions = {}) {
  const {
    enabled = true,
    onDeviceDetected,
    onDeviceRegistered,
  } = options;

  // Handle device registration messages
  const handleRegistration = useCallback(
    (topic: string, data: any) => {
      try {
        // Extract deviceId from topic: devices/{deviceId}/register
        const topicParts = topic.split('/');
        const deviceIdFromTopic = topicParts[1];

        // Validate required fields
        if (!data.deviceId || !data.name) {
          console.warn('[Device Registration] Invalid registration data:', data);
          return;
        }

        const deviceData: DeviceRegistrationData = {
          deviceId: data.deviceId,
          name: data.name,
          type: data.type || 'unknown',
          firmwareVersion: data.firmwareVersion || 'unknown',
          macAddress: data.macAddress || '',
          ipAddress: data.ipAddress || '',
          sensors: data.sensors || [],
          timestamp: data.timestamp || new Date().toISOString(),
        };

        console.log('[Device Registration] New device detected:', deviceData);

        // Show notification
        antMessage.info({
          content: `New device detected: ${deviceData.name} (${deviceData.deviceId})`,
          duration: 5,
          key: `device-register-${deviceData.deviceId}`,
        });

        // Callback for parent component
        if (onDeviceDetected) {
          onDeviceDetected(deviceData);
        }
      } catch (error) {
        console.error('[Device Registration] Error processing registration:', error);
      }
    },
    [onDeviceDetected]
  );

  // Subscribe to device registration topic
  useEffect(() => {
    if (!enabled) return;

    console.log('[Device Registration] Subscribing to device registrations');
    subscribeToTopic(MQTT_TOPICS.DEVICE_REGISTER, handleRegistration);

    return () => {
      console.log('[Device Registration] Unsubscribing from device registrations');
      unsubscribeFromTopic(MQTT_TOPICS.DEVICE_REGISTER, handleRegistration);
    };
  }, [enabled, handleRegistration]);

  return {
    // Can add methods here if needed
    subscribed: enabled,
  };
}

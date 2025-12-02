import { useMemo } from 'react';
import type { Device } from '../../../../schemas';
import { isDeviceRegistered } from '../../../../schemas';
import type { DeviceRegistrationData } from '../../../../hooks';

interface UseDeviceFilterProps {
  devices: Device[];
  mqttUnregisteredDevices?: DeviceRegistrationData[];
  activeTab: 'registered' | 'unregistered';
  searchText: string;
}

export const useDeviceFilter = ({ 
  devices, 
  mqttUnregisteredDevices = [], 
  activeTab, 
  searchText 
}: UseDeviceFilterProps) => {
  return useMemo(() => {
    const registered = devices.filter((d) => isDeviceRegistered(d));
    const dbUnregistered = devices.filter((d) => !isDeviceRegistered(d));
    
    // Convert MQTT registration data to Device-like format for display
    const mqttDevices: Partial<Device>[] = mqttUnregisteredDevices
      .filter((mqttDev) => {
        // Only show MQTT devices that aren't already in database
        const existsInDb = devices.some((d) => d.deviceId === mqttDev.deviceId);
        return !existsInDb;
      })
      .map((mqttDev) => ({
        deviceId: mqttDev.deviceId,
        name: mqttDev.name,
        type: mqttDev.type,
        status: 'online' as const, // Device is online if it just registered
        ipAddress: mqttDev.ipAddress,
        macAddress: mqttDev.macAddress,
        firmwareVersion: mqttDev.firmwareVersion,
        isRegistered: false,
        registrationStatus: 'pending' as const,
        // Add temporary fields for detection
        _isMqttDetected: true,
        _detectedAt: mqttDev.timestamp,
      }));
    
    // Merge database unregistered with MQTT-detected devices
    const allUnregistered = [...dbUnregistered, ...mqttDevices] as Device[];
    
    const currentDevices = activeTab === 'registered' ? registered : allUnregistered;
    const searchLower = searchText.toLowerCase();
    const filtered = searchText
      ? currentDevices.filter(
          (device) =>
            device.name.toLowerCase().includes(searchLower) ||
            device.deviceId.toLowerCase().includes(searchLower) ||
            device.type.toLowerCase().includes(searchLower) ||
            (device.ipAddress && device.ipAddress.toLowerCase().includes(searchLower))
        )
      : currentDevices;

    return {
      registeredDevices: registered,
      unregisteredDevices: allUnregistered,
      filteredDevices: filtered,
      stats: {
        total: devices.length + mqttDevices.length,
        online: devices.filter((d) => d.status === 'online').length + mqttDevices.length,
        offline: devices.filter((d) => d.status === 'offline').length,
        maintenance: devices.filter((d) => d.status === 'maintenance').length,
        registered: registered.length,
        unregistered: allUnregistered.length,
      },
    };
  }, [devices, mqttUnregisteredDevices, activeTab, searchText]);
};

import { useState, useRef, useEffect } from 'react';
import { Modal, message } from 'antd';
import { deviceManagementService } from '../../../../services/devices.Service';
import type { Device } from '../../../../schemas';

export const useDeviceActions = (loadDevices: () => Promise<void>) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isAddEditModalVisible, setIsAddEditModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isRegisterModalVisible, setIsRegisterModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  // Track ongoing registration to prevent duplicate submissions
  const isRegisteringRef = useRef(false);
  const registerTimeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (registerTimeoutRef.current) {
        window.clearTimeout(registerTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = (device: Device) => {
    Modal.confirm({
      title: 'Delete Device',
      content: `Are you sure you want to delete "${device.name}"? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deviceManagementService.deleteDevice(device.deviceId);
          message.success('Device deleted successfully');
          await loadDevices();
        } catch (error) {
          message.error('Failed to delete device');
          console.error('Error deleting device:', error);
        }
      },
    });
  };

  const handleEdit = (device: Device) => {
    setModalMode('edit');
    setSelectedDevice(device);
    setIsAddEditModalVisible(true);
  };

  const handleView = (device: Device) => {
    setSelectedDevice(device);
    setIsViewModalVisible(true);
  };

  const handleModalClose = () => {
    setIsAddEditModalVisible(false);
    setIsViewModalVisible(false);
    setIsRegisterModalVisible(false);
    setSelectedDevice(null);
  };

  const handleSave = async (deviceData: Partial<Device>) => {
    try {
      if (modalMode === 'add') {
        await deviceManagementService.addDevice(deviceData.deviceId!, deviceData);
        message.success('Device added successfully');
      } else {
        await deviceManagementService.updateDevice(selectedDevice!.deviceId, deviceData);
        message.success('Device updated successfully');
      }
      handleModalClose();
      await loadDevices();
    } catch (error) {
      message.error(`Failed to ${modalMode} device`);
      console.error(`Error ${modalMode}ing device:`, error);
    }
  };

  const handleRegister = (device: Device) => {
    setSelectedDevice(device);
    setIsRegisterModalVisible(true);
  };

  const handleRegisterSave = async (
    deviceId: string,
    locationData: { building: string; floor: string; notes?: string }
  ) => {
    // Prevent multiple simultaneous registrations
    if (isRegisteringRef.current) {
      message.warning('Registration is already in progress. Please wait...');
      return false;
    }

    // Clear any existing timeout
    if (registerTimeoutRef.current) {
      window.clearTimeout(registerTimeoutRef.current);
    }

    try {
      isRegisteringRef.current = true;

      await deviceManagementService.registerDevice(
        deviceId,
        locationData.building,
        locationData.floor,
        locationData.notes
      );

      message.success('Device registered successfully!');
      setIsRegisterModalVisible(false);
      setSelectedDevice(null);
      await loadDevices();
      
      // Reset the registration flag after a delay to prevent rapid re-registration
      registerTimeoutRef.current = window.setTimeout(() => {
        isRegisteringRef.current = false;
      }, 2000);
      
      return true;
    } catch (error) {
      message.error('Failed to register device');
      console.error('Error registering device:', error);
      
      // Reset the flag immediately on error
      isRegisteringRef.current = false;
      return false;
    }
  };

  return {
    selectedDevice,
    isAddEditModalVisible,
    isViewModalVisible,
    isRegisterModalVisible,
    modalMode,
    handleDelete,
    handleEdit,
    handleView,
    handleModalClose,
    handleSave,
    handleRegister,
    handleRegisterSave,
  };
};

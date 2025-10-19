import { Modal, Form, Input, Select, Space, Typography, Divider } from 'antd';
import { useEffect } from 'react';
import type { Device } from '../../../schemas';
import { ApiOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface AddEditDeviceModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  device: Device | null;
  onSave: (device: Partial<Device>) => void;
  onCancel: () => void;
}

export const AddEditDeviceModal = ({
  visible,
  mode,
  device,
  onSave,
  onCancel,
}: AddEditDeviceModalProps) => {
  const [form] = Form.useForm();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && device) {
        form.setFieldsValue({
          deviceId: device.deviceId,
          name: device.name,
          type: device.type,
          firmwareVersion: device.firmwareVersion,
          macAddress: device.macAddress,
          ipAddress: device.ipAddress,
          sensors: device.sensors,
          status: device.status,
          metadata: device.metadata ? JSON.stringify(device.metadata, null, 2) : '{}',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, mode, device, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Parse metadata JSON
      let metadata = {};
      if (values.metadata) {
        try {
          metadata = JSON.parse(values.metadata);
        } catch (error) {
          console.error('Invalid JSON in metadata:', error);
        }
      }

      const deviceData: Partial<Device> = {
        ...values,
        metadata,
        sensors: values.sensors || [],
      };

      onSave(deviceData);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <ApiOutlined style={{ color: '#001f3f' }} />
          <span>{mode === 'add' ? 'Add New Device' : 'Edit Device'}</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={700}
      okText={mode === 'add' ? 'Add Device' : 'Update Device'}
      cancelText="Cancel"
    >
      <Divider />
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'offline',
          sensors: [],
          metadata: '{}',
        }}
      >
        {/* Basic Information */}
        <Text strong style={{ fontSize: '16px' }}>Basic Information</Text>
        <Divider style={{ margin: '12px 0' }} />

        <Form.Item
          label="Device ID"
          name="deviceId"
          rules={[
            { required: true, message: 'Please enter device ID' },
            { pattern: /^[A-Z0-9-_a-z]+$/, message: 'Only uppercase letters, numbers, hyphens, and underscores' },
          ]}
          tooltip="Unique identifier for the device (e.g., DEV-001)"
        >
          <Input
            placeholder="DEV-001"
            disabled={mode === 'edit'}
            prefix={<ApiOutlined />}
          />
        </Form.Item>

        <Form.Item
          label="Device Name"
          name="name"
          rules={[{ required: true, message: 'Please enter device name' }]}
          tooltip="Human-readable name for the device"
        >
          <Input placeholder="Temperature Sensor - Room A" />
        </Form.Item>

        <Form.Item
          label="Device Type"
          name="type"
          rules={[{ required: true, message: 'Please select device type' }]}
          tooltip="Category of the device"
        >
          <Select placeholder="Select device type">
            <Option value="sensor">Sensor</Option>
            <Option value="actuator">Actuator</Option>
            <Option value="controller">Controller</Option>
            <Option value="gateway">Gateway</Option>
            <Option value="monitor">Monitor</Option>
            <Option value="other">Other</Option>
          </Select>
        </Form.Item>

        {/* Network Information */}
        <Text strong style={{ fontSize: '16px' }}>Network Information</Text>
        <Divider style={{ margin: '12px 0' }} />

        <Form.Item
          label="MAC Address"
          name="macAddress"
          rules={[
            { required: true, message: 'Please enter MAC address' },
            { 
              pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 
              message: 'Invalid MAC address format (e.g., 00:1A:2B:3C:4D:5E)' 
            },
          ]}
          tooltip="Physical address of the network interface"
        >
          <Input placeholder="00:1A:2B:3C:4D:5E" />
        </Form.Item>

        <Form.Item
          label="IP Address"
          name="ipAddress"
          rules={[
            { required: true, message: 'Please enter IP address' },
            { 
              pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 
              message: 'Invalid IP address format' 
            },
          ]}
          tooltip="Network IP address of the device"
        >
          <Input placeholder="192.168.1.100" />
        </Form.Item>

        {/* Device Configuration */}
        <Text strong style={{ fontSize: '16px' }}>Device Configuration</Text>
        <Divider style={{ margin: '12px 0' }} />

        <Form.Item
          label="Firmware Version"
          name="firmwareVersion"
          rules={[{ required: true, message: 'Please enter firmware version' }]}
          tooltip="Current firmware version installed on the device"
        >
          <Input placeholder="v1.0.0" />
        </Form.Item>

        <Form.Item
          label="Sensors"
          name="sensors"
          tooltip="Select the types of sensors available on this device"
        >
          <Select
            mode="tags"
            placeholder="Add sensors (e.g., temperature, humidity)"
            style={{ width: '100%' }}
          >
            <Option value="temperature">Temperature</Option>
            <Option value="humidity">Humidity</Option>
            <Option value="pressure">Pressure</Option>
            <Option value="turbidity">Turbidity</Option>
            <Option value="tds">TDS</Option>
            <Option value="ph">pH</Option>
            <Option value="motion">Motion</Option>
            <Option value="light">Light</Option>
            <Option value="sound">Sound</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
          tooltip="Current operational status of the device"
        >
          <Select placeholder="Select status">
            <Option value="online">Online</Option>
            <Option value="offline">Offline</Option>
            <Option value="error">Error</Option>
            <Option value="maintenance">Maintenance</Option>
          </Select>
        </Form.Item>

        {/* Advanced Settings */}
        <Text strong style={{ fontSize: '16px' }}>Advanced Settings</Text>
        <Divider style={{ margin: '12px 0' }} />

        <Form.Item
          label="Metadata (JSON)"
          name="metadata"
          tooltip="Additional device metadata in JSON format"
          rules={[
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                try {
                  JSON.parse(value);
                  return Promise.resolve();
                } catch (error) {
                  return Promise.reject('Invalid JSON format');
                }
              },
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder='{"location": "Room A", "floor": 2}'
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

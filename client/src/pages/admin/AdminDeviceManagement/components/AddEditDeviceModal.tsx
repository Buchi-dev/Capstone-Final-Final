import { Modal, Form, Input, Select, Space, Typography, Row, Col } from 'antd';
import { useEffect } from 'react';
import type { Device } from '../../../../schemas';
import { 
  ApiOutlined, 
  EditOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  WifiOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExperimentOutlined,
  FireOutlined,
  CloudOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { TextArea } = Input;
const { Option } = Select;
const { Text, Title } = Typography;

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
  const token = useThemeToken();

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
          // Location fields
          building: device.metadata?.location?.building || '',
          floor: device.metadata?.location?.floor || '',
          locationNotes: device.metadata?.location?.notes || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, mode, device, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Build metadata object with location
      const metadata: any = {};

      // Add location if building and floor are provided
      if (values.building && values.floor) {
        metadata.location = {
          building: values.building,
          floor: values.floor,
          notes: values.locationNotes || '',
        };
      }

      const deviceData: Partial<Device> = {
        deviceId: values.deviceId,
        name: values.name,
        type: values.type,
        firmwareVersion: values.firmwareVersion,
        macAddress: values.macAddress,
        ipAddress: values.ipAddress,
        sensors: values.sensors || [],
        metadata,
      };

      // Only include status when adding a new device
      if (mode === 'add') {
        deviceData.status = values.status;
      }

      onSave(deviceData);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  return (
    <Modal
      title={
        <div style={{ 
          padding: '8px 0',
          borderBottom: `2px solid ${token.colorPrimary}`,
          marginBottom: '16px'
        }}>
          <Space size="middle">
            {mode === 'add' ? (
              <ApiOutlined style={{ color: token.colorPrimary, fontSize: '24px' }} />
            ) : (
              <EditOutlined style={{ color: token.colorPrimary, fontSize: '24px' }} />
            )}
            <Title level={3} style={{ margin: 0 }}>
              {mode === 'add' ? 'Add New Device' : 'Edit Device'}
            </Title>
          </Space>
        </div>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={900}
      centered
      okText={mode === 'add' ? 'Add Device' : 'Save Changes'}
      cancelText="Cancel"
      okButtonProps={{ 
        size: 'large',
        style: { minWidth: '140px', fontWeight: 500, height: '44px' }
      }}
      cancelButtonProps={{ 
        size: 'large',
        style: { minWidth: '120px', height: '44px' }
      }}
      styles={{
        body: {
          maxHeight: '70vh',
          overflowY: 'auto',
          padding: '24px 24px 16px',
        },
        header: {
          padding: '20px 24px 0',
        }
      }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          status: 'offline',
          sensors: [],
        }}
      >
        {/* Basic Information Section */}
        <div style={{ marginBottom: '32px' }}>
          <Space size="small" style={{ marginBottom: '20px' }}>
            <InfoCircleOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
            <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
              Basic Information
            </Title>
          </Space>

          <div style={{ 
            backgroundColor: token.colorBgLayout,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${token.colorBorder}`
          }}>
            {mode === 'add' ? (
              <Row gutter={[24, 16]}>
                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>Device ID</Text>}
                    name="deviceId"
                    rules={[
                      { required: true, message: 'Device ID is required' },
                      { pattern: /^[A-Z0-9-_a-z]+$/, message: 'Only alphanumeric, hyphens, and underscores allowed' },
                    ]}
                  >
                    <Input
                      placeholder="e.g., arduino_uno_r4_wifi_1"
                      prefix={<ApiOutlined style={{ color: token.colorTextSecondary }} />}
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>Device Type</Text>}
                    name="type"
                    rules={[{ required: true, message: 'Device type is required' }]}
                  >
                    <Select 
                      placeholder="Select device type"
                      size="large"
                    >
                      <Option value="Arduino UNO R4 WiFi">
                        <Space>
                          <ApiOutlined />
                          Arduino UNO R4 WiFi
                        </Space>
                      </Option>
                      <Option value="ESP32 Dev Module">
                        <Space>
                          <ApiOutlined />
                          ESP32 Dev Module
                        </Space>
                      </Option>
                      <Option value="Sensor">Sensor</Option>
                      <Option value="Gateway">Gateway</Option>
                      <Option value="Monitor">Monitor</Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>Device Name</Text>}
                    name="name"
                    rules={[{ required: true, message: 'Device name is required' }]}
                  >
                    <Input 
                      placeholder="e.g., Water Quality Monitor 1" 
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              <Form.Item
                label={<Text strong style={{ fontSize: '14px' }}>Device Name</Text>}
                name="name"
                rules={[{ required: true, message: 'Device name is required' }]}
              >
                <Input 
                  placeholder="e.g., Water Quality Monitor 1" 
                  size="large"
                />
              </Form.Item>
            )}
          </div>
        </div>

        {/* Network Information - Only visible in Add mode */}
        {mode === 'add' && (
          <div style={{ marginBottom: '32px' }}>
            <Space size="small" style={{ marginBottom: '20px' }}>
              <WifiOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
                Network Configuration
              </Title>
            </Space>

            <div style={{ 
              backgroundColor: token.colorBgLayout,
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${token.colorBorder}`
            }}>
              <Row gutter={[24, 16]}>
                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>MAC Address</Text>}
                    name="macAddress"
                    rules={[
                      { required: true, message: 'MAC address is required' },
                      { 
                        pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 
                        message: 'Invalid MAC address format (e.g., 00:1A:2B:3C:4D:5E)' 
                      },
                    ]}
                  >
                    <Input 
                      placeholder="00:1A:2B:3C:4D:5E" 
                      size="large"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>IP Address</Text>}
                    name="ipAddress"
                    rules={[
                      { required: true, message: 'IP address is required' },
                      { 
                        pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 
                        message: 'Invalid IP address format (e.g., 192.168.1.100)' 
                      },
                    ]}
                  >
                    <Input 
                      placeholder="192.168.1.100" 
                      size="large"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>Firmware Version</Text>}
                    name="firmwareVersion"
                    rules={[{ required: true, message: 'Firmware version is required' }]}
                  >
                    <Input 
                      placeholder="v1.0.0" 
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} lg={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: '14px' }}>Device Status</Text>}
                    name="status"
                    rules={[{ required: true, message: 'Status is required' }]}
                  >
                    <Select 
                      placeholder="Select initial status"
                      size="large"
                    >
                      <Option value="online">
                        <Space>
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                          Online
                        </Space>
                      </Option>
                      <Option value="offline">
                        <Space>
                          <CloseCircleOutlined style={{ color: '#8c8c8c' }} />
                          Offline
                        </Space>
                      </Option>
                      <Option value="maintenance">
                        <Space>
                          <ToolOutlined style={{ color: '#faad14' }} />
                          Maintenance
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </div>
        )}

        {/* Device Configuration - Only visible in Add mode */}
        {mode === 'add' && (
          <div style={{ marginBottom: '32px' }}>
            <Space size="small" style={{ marginBottom: '20px' }}>
              <ToolOutlined style={{ color: token.colorPrimary, fontSize: '20px' }} />
              <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
                Sensors & Configuration
              </Title>
            </Space>

            <div style={{ 
              backgroundColor: token.colorBgLayout,
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${token.colorBorder}`
            }}>
              <Form.Item
                label={<Text strong style={{ fontSize: '14px' }}>Available Sensors</Text>}
                name="sensors"
                extra={<Text type="secondary" style={{ fontSize: '12px' }}>Select all sensors available on this device</Text>}
              >
                <Select
                  mode="multiple"
                  placeholder="Select sensor types"
                  style={{ width: '100%' }}
                  size="large"
                  allowClear
                >
                  <Option value="turbidity">
                    <Space>
                      <ExperimentOutlined />
                      Turbidity Sensor
                    </Space>
                  </Option>
                  <Option value="tds">
                    <Space>
                      <DashboardOutlined />
                      TDS (Total Dissolved Solids)
                    </Space>
                  </Option>
                  <Option value="ph">
                    <Space>
                      <ExperimentOutlined />
                      pH Level Sensor
                    </Space>
                  </Option>
                  <Option value="temperature">
                    <Space>
                      <FireOutlined />
                      Temperature Sensor
                    </Space>
                  </Option>
                  <Option value="humidity">
                    <Space>
                      <CloudOutlined />
                      Humidity Sensor
                    </Space>
                  </Option>
                  <Option value="pressure">
                    <Space>
                      <DashboardOutlined />
                      Pressure Sensor
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </div>
          </div>
        )}

        {/* Location Information */}
        <div style={{ marginBottom: '16px' }}>
          <Space size="small" style={{ marginBottom: '20px' }}>
            <EnvironmentOutlined style={{ color: token.colorSuccess, fontSize: '20px' }} />
            <Title level={4} style={{ margin: 0, color: token.colorSuccess }}>
              Location Assignment
            </Title>
            <Text type="secondary" style={{ fontSize: '13px' }}>(Required for registration)</Text>
          </Space>

          <div style={{ 
            backgroundColor: token.colorSuccessBg,
            padding: '24px',
            borderRadius: '8px',
            border: `2px solid ${token.colorSuccess}`
          }}>
            <Row gutter={[24, 16]}>
              <Col xs={24} lg={12}>
                <Form.Item
                  label={<Text strong style={{ fontSize: '14px' }}>Building</Text>}
                  name="building"
                  rules={[{ required: true, message: 'Building is required' }]}
                >
                  <Input 
                    placeholder="e.g., Main Building, Building A, Science Block" 
                    size="large"
                    prefix={<EnvironmentOutlined />}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  label={<Text strong style={{ fontSize: '14px' }}>Floor</Text>}
                  name="floor"
                  rules={[{ required: true, message: 'Floor is required' }]}
                >
                  <Select 
                    placeholder="Select floor level" 
                    size="large"
                  >
                    <Option value="Ground Floor">Ground Floor</Option>
                    <Option value="1st Floor">1st Floor</Option>
                    <Option value="2nd Floor">2nd Floor</Option>
                    <Option value="3rd Floor">3rd Floor</Option>
                    <Option value="4th Floor">4th Floor</Option>
                    <Option value="5th Floor">5th Floor</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  label={<Text strong style={{ fontSize: '14px' }}>Location Notes (Optional)</Text>}
                  name="locationNotes"
                >
                  <TextArea
                    rows={3}
                    placeholder="e.g., Near the main entrance, Room 201, Lab 3, Next to water tank"
                    maxLength={200}
                    showCount
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

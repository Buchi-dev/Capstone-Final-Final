/**
 * DevicesFilter Component
 * 
 * Card for selecting specific devices to monitor.
 */
import { Card, Form, Select, Typography, Tag, Space } from 'antd';
import { ApiOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface Device {
  deviceId: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  metadata?: {
    metadata?: {
      location?: {
        building: string;
        floor: string;
      };
    };
  };
}

interface DevicesFilterProps {
  devices: Device[];
}

/**
 * Devices filter card
 */
export default function DevicesFilter({ devices }: DevicesFilterProps) {
  return (
    <Card
      size="small"
      style={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #f6ffed 0%, #fff 100%)',
        border: '1px solid #b7eb8f',
      }}
    >
      <div style={{ 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '12px',
        borderBottom: '2px solid #b7eb8f'
      }}>
        <ApiOutlined style={{ fontSize: '18px', color: '#52c41a' }} />
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#389e0d' }}>Specific Devices</span>
      </div>
      <Form.Item
        name="devices"
        tooltip="Filter alerts by specific monitoring devices"
        style={{ marginBottom: 8 }}
      >
        <Select
          mode="multiple"
          placeholder="All devices"
          style={{ width: '100%' }}
          allowClear
          size="large"
          maxTagCount="responsive"
          loading={devices.length === 0}
          notFoundContent={devices.length === 0 ? "Loading devices..." : "No devices found"}
          optionLabelProp="label"
        >
          {devices.map((device) => (
            <Option 
              key={device.deviceId} 
              value={device.deviceId}
              label={device.name}
            >
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                padding: '4px 0'
              }}>
                <Text style={{ fontSize: '14px', fontWeight: 500 }}>{device.name}</Text>
                {device.metadata?.metadata?.location?.building && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    📍 {device.metadata.metadata.location.building} - Floor {device.metadata.metadata.location.floor}
                  </Text>
                )}
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Text type="secondary" style={{ fontSize: '12px', display: 'block', fontStyle: 'italic' }}>
        Leave empty to monitor all devices
      </Text>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        background: 'rgba(82, 196, 26, 0.05)',
        borderRadius: '6px',
        border: '1px dashed #b7eb8f'
      }}>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
          <strong>Active Devices:</strong>
        </Text>
        {devices.length > 0 ? (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            {devices.slice(0, 3).map((device) => (
              <div key={device.deviceId} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag color="green" style={{ margin: 0, fontSize: '10px' }}>●</Tag>
                <Text type="secondary" style={{ fontSize: '11px' }} ellipsis>
                  {device.name}
                </Text>
              </div>
            ))}
            {devices.length > 3 && (
              <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                + {devices.length - 3} more device{devices.length - 3 > 1 ? 's' : ''}
              </Text>
            )}
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
            Loading devices...
          </Text>
        )}
      </div>
    </Card>
  );
}

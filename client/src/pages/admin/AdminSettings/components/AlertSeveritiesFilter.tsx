/**
 * AlertSeveritiesFilter Component
 * 
 * Card for selecting which alert severity levels to receive.
 */
import { Card, Form, Select, Typography, Tag, Space } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

/**
 * Alert severities filter card
 */
export default function AlertSeveritiesFilter() {
  return (
    <Card
      size="small"
      style={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #fff5eb 0%, #fff 100%)',
        border: '1px solid #ffd591',
      }}
    >
      <div style={{ 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '12px',
        borderBottom: '2px solid #ffd591'
      }}>
        <ThunderboltOutlined style={{ fontSize: '18px', color: '#fa8c16' }} />
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#ad6800' }}>Alert Severities</span>
      </div>
      <Form.Item
        name="alertSeverities"
        tooltip="Select which severity levels trigger notifications"
        style={{ marginBottom: 8 }}
      >
        <Select
          mode="multiple"
          placeholder="Select severity levels"
          style={{ width: '100%' }}
          size="large"
          maxTagCount="responsive"
          optionLabelProp="label"
        >
          <Option value="Critical" label="Critical">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="error" style={{ margin: 0 }}>Critical</Tag>
                <Text style={{ fontSize: '14px' }}>Critical</Text>
              </Space>
            </div>
          </Option>
          <Option value="Warning" label="Warning">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="warning" style={{ margin: 0 }}>Warning</Tag>
                <Text style={{ fontSize: '14px' }}>Warning</Text>
              </Space>
            </div>
          </Option>
          <Option value="Advisory" label="Advisory">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="processing" style={{ margin: 0 }}>Advisory</Tag>
                <Text style={{ fontSize: '14px' }}>Advisory</Text>
              </Space>
            </div>
          </Option>
        </Select>
      </Form.Item>
      <Text type="secondary" style={{ fontSize: '12px', display: 'block', fontStyle: 'italic' }}>
        Leave empty to receive all severity levels
      </Text>
      
      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        background: 'rgba(250, 140, 22, 0.05)',
        borderRadius: '6px',
        border: '1px dashed #ffd591'
      }}>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
          <strong>Severity Levels:</strong>
        </Text>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="error" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>Critical</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Immediate action required</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="warning" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>Warning</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Monitor closely</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="processing" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>Advisory</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Informational only</Text>
          </div>
        </Space>
      </div>
    </Card>
  );
}

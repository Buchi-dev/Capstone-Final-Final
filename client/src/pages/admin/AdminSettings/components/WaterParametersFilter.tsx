/**
 * WaterParametersFilter Component
 * 
 * Card for selecting which water quality parameters to monitor.
 */
import { Card, Form, Select, Typography, Tag, Space } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

/**
 * Water parameters filter card
 */
export default function WaterParametersFilter() {
  return (
    <Card
      size="small"
      style={{ 
        height: '100%',
        background: 'linear-gradient(135deg, #e6f7ff 0%, #fff 100%)',
        border: '1px solid #91d5ff',
      }}
    >
      <div style={{ 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        paddingBottom: '12px',
        borderBottom: '2px solid #91d5ff'
      }}>
        <ExperimentOutlined style={{ fontSize: '18px', color: '#1890ff' }} />
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#096dd9' }}>Water Parameters</span>
      </div>
      <Form.Item
        name="parameters"
        tooltip="Filter alerts by specific water quality parameters"
        style={{ marginBottom: 8 }}
      >
        <Select
          mode="multiple"
          placeholder="All parameters"
          style={{ width: '100%' }}
          allowClear
          size="large"
          maxTagCount="responsive"
          optionLabelProp="label"
        >
          <Option value="ph" label="pH Level">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="blue" style={{ margin: 0 }}>pH</Tag>
                <Text style={{ fontSize: '14px' }}>pH Level</Text>
              </Space>
            </div>
          </Option>
          <Option value="tds" label="TDS">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="cyan" style={{ margin: 0 }}>TDS</Tag>
                <Text style={{ fontSize: '14px' }}>Total Dissolved Solids</Text>
              </Space>
            </div>
          </Option>
          <Option value="turbidity" label="Turbidity">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '4px 0'
            }}>
              <Space>
                <Tag color="geekblue" style={{ margin: 0 }}>Turbidity</Tag>
                <Text style={{ fontSize: '14px' }}>Turbidity</Text>
              </Space>
            </div>
          </Option>
        </Select>
      </Form.Item>
      <Text type="secondary" style={{ fontSize: '12px', display: 'block', fontStyle: 'italic' }}>
        Leave empty to receive alerts for all parameters
      </Text>

      <div style={{ 
        marginTop: '16px', 
        padding: '12px',
        background: 'rgba(24, 144, 255, 0.05)',
        borderRadius: '6px',
        border: '1px dashed #91d5ff'
      }}>
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
          <strong>Available Parameters:</strong>
        </Text>
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="blue" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>pH</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Acidity/Alkalinity (0-14)</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="cyan" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>TDS</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Dissolved minerals (ppm)</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag color="geekblue" style={{ margin: 0, minWidth: '70px', textAlign: 'center' }}>Turbidity</Tag>
            <Text type="secondary" style={{ fontSize: '11px' }}>Water clarity (NTU)</Text>
          </div>
        </Space>
      </div>
    </Card>
  );
}

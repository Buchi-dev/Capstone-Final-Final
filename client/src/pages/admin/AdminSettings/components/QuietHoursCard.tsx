/**
 * QuietHoursCard Component
 * 
 * Card for configuring quiet hours when notifications are paused.
 */
import { Card, Space, Form, Switch, Typography, TimePicker } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Quiet hours configuration card
 */
export default function QuietHoursCard() {
  return (
    <Card
      title={
        <Space size="middle">
          <ClockCircleOutlined style={{ fontSize: '20px', color: '#722ed1' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Quiet Hours</span>
        </Space>
      }
      bordered={false}
      style={{ 
        height: '100%',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '16px',
          background: '#fafafa',
          borderRadius: '8px',
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
              Enable Quiet Hours
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Pause non-critical notifications during rest hours
            </Text>
          </div>
          <Form.Item
            name="quietHoursEnabled"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch size="default" />
          </Form.Item>
        </div>

        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.quietHoursEnabled !== currentValues.quietHoursEnabled}>
          {({ getFieldValue }) =>
            getFieldValue('quietHoursEnabled') ? (
              <Form.Item
                name="quietHours"
                label={<span style={{ fontSize: '14px', fontWeight: 500 }}>Set Time Range</span>}
                rules={[
                  {
                    required: getFieldValue('quietHoursEnabled'),
                    message: 'Please select quiet hours period',
                  },
                ]}
                style={{ marginBottom: 0 }}
              >
                <TimePicker.RangePicker
                  format="HH:mm"
                  placeholder={['Start time', 'End time']}
                  style={{ width: '100%' }}
                  size="large"
                />
              </Form.Item>
            ) : (
              <div style={{ 
                padding: '20px',
                textAlign: 'center',
                color: '#8c8c8c',
                fontSize: '13px',
              }}>
                Enable quiet hours to set a time range
              </div>
            )
          }
        </Form.Item>
      </Space>
    </Card>
  );
}

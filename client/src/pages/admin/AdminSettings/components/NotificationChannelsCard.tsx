/**
 * NotificationChannelsCard Component
 * 
 * Card for configuring email and scheduled report notifications.
 */
import { Card, Space, Form, Switch, Typography } from 'antd';
import { BellOutlined, MailOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Notification channels configuration card
 */
export default function NotificationChannelsCard() {
  return (
    <Card
      title={
        <Space size="middle">
          <BellOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <span style={{ fontSize: '16px', fontWeight: 600 }}>Notification Channels</span>
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
          <Space size="middle">
            <MailOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
                Email Notifications
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Receive real-time alerts and scheduled reports via email
              </Text>
            </div>
          </Space>
          <Form.Item
            name="emailNotifications"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch size="default" />
          </Form.Item>
        </div>

      </Space>
    </Card>
  );
}

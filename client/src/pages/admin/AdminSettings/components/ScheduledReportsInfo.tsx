/**
 * ScheduledReportsInfo Component
 * 
 * Information alert about scheduled analytics reports.
 */
import { Alert, Space, Typography } from 'antd';
import { MailOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * Scheduled reports information alert
 */
export default function ScheduledReportsInfo() {
  return (
    <Alert
      message="Scheduled Analytics Reports"
      description={
        <Space direction="vertical" size={4}>
          <Text style={{ fontSize: '13px' }}>
            • <strong>Daily Reports:</strong> Sent every morning at 8:00 AM with yesterday's water quality summary
          </Text>
          <Text style={{ fontSize: '13px' }}>
            • <strong>Weekly Reports:</strong> Sent every Monday at 9:00 AM with the past week's trends and analysis
          </Text>
          <Text style={{ fontSize: '13px' }}>
            • <strong>Monthly Reports:</strong> Sent on the 1st of each month with comprehensive monthly performance review
          </Text>
        </Space>
      }
      type="info"
      showIcon
      icon={<MailOutlined />}
      style={{ marginTop: '24px' }}
    />
  );
}

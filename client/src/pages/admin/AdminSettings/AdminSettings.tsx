/**
 * AdminSettings Page
 * 
 * Settings management for administrators.
 * Currently focuses on notification preferences.
 * 
 * Uses global hooks for all data operations following architecture guidelines.
 * 
 * @module pages/admin/AdminSettings
 */
import { AdminLayout } from '../../../components/layouts';
import { Typography } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import NotificationSettings from './NotificationSettings';

const { Title, Paragraph } = Typography;

/**
 * Admin settings page with notification preferences
 */
export const AdminSettings = () => {
  return (
    <AdminLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ marginBottom: '32px' }}>
          <Title level={2} style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BellOutlined style={{ color: '#1890ff' }} />
            Notification Settings
          </Title>
          <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 0 }}>
            Manage your notification preferences and alerts for water quality monitoring
          </Paragraph>
        </div>

        <NotificationSettings />
      </div>
    </AdminLayout>
  );
};


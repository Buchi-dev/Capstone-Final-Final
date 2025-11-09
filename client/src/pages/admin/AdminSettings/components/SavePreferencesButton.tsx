/**
 * SavePreferencesButton Component
 * 
 * Save button for notification preferences form.
 */
import { Button, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

interface SavePreferencesButtonProps {
  loading: boolean;
}

/**
 * Form save button with loading state
 */
export default function SavePreferencesButton({ loading }: SavePreferencesButtonProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      marginTop: '32px',
      paddingTop: '24px',
      borderTop: '1px solid #f0f0f0'
    }}>
      <Button
        type="primary"
        size="large"
        htmlType="submit"
        loading={loading}
        icon={<SaveOutlined />}
        style={{
          minWidth: '200px',
          height: '48px',
          fontSize: '16px',
          fontWeight: 600,
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
        }}
      >
        <Space>
          Save Notification Preferences
        </Space>
      </Button>
    </div>
  );
}

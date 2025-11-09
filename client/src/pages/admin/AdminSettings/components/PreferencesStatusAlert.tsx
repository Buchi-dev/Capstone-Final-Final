/**
 * PreferencesStatusAlert Component
 * 
 * Displays status of notification preferences configuration.
 */
import { Alert } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface PreferencesStatusAlertProps {
  hasPreferences: boolean;
  userEmail?: string;
}

/**
 * Status alert showing preferences activation state
 */
export default function PreferencesStatusAlert({ 
  hasPreferences, 
  userEmail 
}: PreferencesStatusAlertProps) {
  return (
    <Alert
      message={hasPreferences ? "Notification Preferences Active" : "Set Up Your Notifications"}
      description={
        hasPreferences
          ? `You're receiving water quality alerts at ${userEmail}. Customize your notification channels and scheduled report preferences below.`
          : `Configure your notification preferences to start receiving real-time water quality alerts and scheduled analytics reports at ${userEmail}.`
      }
      type={hasPreferences ? "success" : "info"}
      showIcon
      icon={hasPreferences ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
      style={{ marginBottom: '24px' }}
    />
  );
}

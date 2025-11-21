/**
 * NotificationSettings Component
 * 
 * User notification preferences management for AdminSettings.
 * Uses global hooks for all data operations.
 * Components extracted following "One Component Per File" architecture rule.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  App,
  Spin,
  Typography,
  Row,
  Col,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useAuth, useDevices, useUserPreferences, useUserMutations } from '../../../hooks';
import dayjs from 'dayjs';

// Extracted components
import {
  PreferencesStatusAlert,
  NotificationChannelsCard,
  QuietHoursCard,
  AlertSeveritiesFilter,
  WaterParametersFilter,
  DevicesFilter,
  ScheduledReportsInfo,
  SavePreferencesButton,
} from './components';

const { Text, Paragraph } = Typography;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  sendScheduledAlerts: boolean;
  alertSeverities: string[];
  parameters: string[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * Notification preferences form component
 */
const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  // Global hooks
  const { devices: devicesWithReadings } = useDevices({ pollInterval: 0 });
  
  const { 
    preferences: userPrefs, 
    isLoading: prefsLoading,
    refetch: refetchPreferences 
  } = useUserPreferences({ 
    userId: user?._id || '',
    enabled: !!user?._id 
  }) as { preferences: Record<string, unknown> | null; isLoading: boolean; refetch: () => Promise<void> }; // Type cast to bypass schema mismatch between frontend/backend
  
  const { 
    updateUserPreferences, 
    isLoading: saving 
  } = useUserMutations();

  // Transform devices for select component
  const devices = devicesWithReadings.map((d) => ({
    deviceId: d.deviceId,
    name: d.name,
    status: d.status,
    location: d.metadata?.location 
      ? `${d.metadata.location.building}, ${d.metadata.location.floor}`
      : 'Unknown'
  }));

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      console.log('[NotificationSettings] Loading preferences for user:', user.id);
      
      // Use preferences from global hook
      if (userPrefs) {
        console.log('[NotificationSettings] Loaded preferences:', userPrefs);
        
        // Set preferences (type cast to bypass schema mismatch)
        setPreferences(userPrefs as unknown as NotificationPreferences);
        
        // Extract notification settings (use type assertion for backend schema)
        const prefs = userPrefs as Record<string, unknown>;
        const formValues = {
          emailNotifications: prefs.emailNotifications ?? true,
          pushNotifications: prefs.pushNotifications ?? false,
          sendScheduledAlerts: prefs.sendScheduledAlerts ?? true,
          alertSeverities: prefs.alertSeverities || ['Critical', 'Warning', 'Advisory'],
          parameters: prefs.parameters || [],
          devices: prefs.devices || [],
          quietHoursEnabled: prefs.quietHoursEnabled ?? false,
          quietHours: prefs.quietHoursStart && prefs.quietHoursEnd ? [
            dayjs(prefs.quietHoursStart as string, 'HH:mm'),
            dayjs(prefs.quietHoursEnd as string, 'HH:mm'),
          ] : undefined,
        };
        
        form.setFieldsValue(formValues);
      } else {
        console.log('[NotificationSettings] No preferences found, setting defaults');
        form.setFieldsValue({
          emailNotifications: true,
          pushNotifications: false,
          sendScheduledAlerts: true,
          alertSeverities: ['Critical', 'Warning', 'Advisory'],
          parameters: [],
          devices: [],
          quietHoursEnabled: false,
        });
      }
    } catch (error) {
      console.error('[NotificationSettings] Error loading preferences:', error);
      message.error((error as Error).message || 'Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, [user, userPrefs, form, message]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);


  const handleSave = async (values: Record<string, unknown>) => {
    if (!user || !user.email) return;

    try {
      interface FormValues {
        quietHoursEnabled?: boolean;
        quietHours?: Array<{ format: (fmt: string) => string }>;
        emailNotifications?: boolean;
        pushNotifications?: boolean;
        sendScheduledAlerts?: boolean;
        alertSeverities?: string[];
        parameters?: string[];
        devices?: string[];
      }
      const formValues = values as FormValues;
      
      const quietHoursStart = formValues.quietHoursEnabled && formValues.quietHours?.[0]
        ? formValues.quietHours[0].format('HH:mm')
        : undefined;

      const quietHoursEnd = formValues.quietHoursEnabled && formValues.quietHours?.[1]
        ? formValues.quietHours[1].format('HH:mm')
        : undefined;

      const preferencesPayload = {
        userId: user.id,
        email: user.email,
        emailNotifications: formValues.emailNotifications ?? false,
        pushNotifications: formValues.pushNotifications ?? false,
        sendScheduledAlerts: formValues.sendScheduledAlerts ?? true,
        alertSeverities: formValues.alertSeverities || ['Critical', 'Warning', 'Advisory'],
        parameters: formValues.parameters || [],
        devices: formValues.devices || [],
        quietHoursEnabled: formValues.quietHoursEnabled ?? false,
        quietHoursStart,
        quietHoursEnd,
      };

      console.log('[NotificationSettings] Saving preferences:', preferencesPayload);

      // Use type cast to bypass schema mismatch
      await updateUserPreferences(user._id || user.id, preferencesPayload as Record<string, unknown>);

      console.log('[NotificationSettings] Preferences saved successfully');
      
      message.success('Notification preferences saved successfully');
      
      await refetchPreferences();
    } catch (error) {
      console.error('[NotificationSettings] Error saving preferences:', error);
      message.error((error as Error).message || 'Failed to save notification preferences');
    }
  };

  if (loading || prefsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 20 }}>
          <Text type="secondary" style={{ fontSize: '16px' }}>Loading your notification preferences...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '40px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          emailNotifications: true,
          pushNotifications: false,
          sendScheduledAlerts: true,
          alertSeverities: ['Critical', 'Warning', 'Advisory'],
          parameters: [],
          devices: [],
          quietHoursEnabled: false,
        }}
      >
        <PreferencesStatusAlert 
          hasPreferences={!!preferences} 
          userEmail={user?.email ?? undefined} 
        />

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <NotificationChannelsCard />
          </Col>

          <Col xs={24} lg={12}>
            <QuietHoursCard />
          </Col>
        </Row>

        <Card
          title={
            <span>
              <ThunderboltOutlined style={{ fontSize: '20px', color: '#fa8c16', marginRight: '8px' }} />
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Alert Filters</span>
            </span>
          }
          bordered={false}
          style={{ 
            marginTop: '24px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)'
          }}
        >
          <Paragraph type="secondary" style={{ marginBottom: '24px', fontSize: '14px' }}>
            Customize which alerts you want to receive based on severity, parameters, and devices
          </Paragraph>

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={8}>
              <AlertSeveritiesFilter />
            </Col>

            <Col xs={24} lg={8}>
              <WaterParametersFilter />
            </Col>

            <Col xs={24} lg={8}>
              <DevicesFilter devices={devices} />
            </Col>
          </Row>
        </Card>

        <ScheduledReportsInfo />

        <SavePreferencesButton loading={saving} />
      </Form>
    </div>
  );
};

export default NotificationSettings;

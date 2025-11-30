/**
 * NotificationSettings Component
 * 
 * User notification preferences management for AdminSettings.
 * Uses global hooks for all data operations.
 * Components extracted following "One Component Per File" architecture rule.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Form,
  App,
  Spin,
  Typography,
} from 'antd';
import { useAuth, useDevices, useUserPreferences, useUserMutations } from '../../../hooks';

// Extracted components
import {
  PreferencesStatusAlert,
  NotificationChannelsCard,
  SavePreferencesButton,
} from './components';

const { Text } = Typography;

interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
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
  const { 
    preferences: userPrefs, 
    isLoading: prefsLoading,
    refetch: refetchPreferences 
  } = useUserPreferences({ 
    userId: user?._id || '',
    enabled: !!user?._id 
  }) as { preferences: Record<string, unknown> | null; isLoading: boolean; refetch: () => Promise<void> }; // Type cast to bypass schema mismatch
  
  const { 
    updateUserPreferences, 
    isLoading: saving 
  } = useUserMutations();

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
        };
        
        form.setFieldsValue(formValues);
      } else {
        console.log('[NotificationSettings] No preferences found, setting defaults');
        form.setFieldsValue({
          emailNotifications: true,
          pushNotifications: false,
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
        emailNotifications?: boolean;
        pushNotifications?: boolean;
      }
      const formValues = values as FormValues;

      const preferencesPayload = {
        userId: user.id,
        email: user.email,
        emailNotifications: formValues.emailNotifications ?? false,
        pushNotifications: formValues.pushNotifications ?? false,
        alertSeverities: ['Critical', 'Warning', 'Advisory'], // fixed
        parameters: [], // fixed
        devices: [], // fixed
        quietHoursEnabled: false, // fixed
        quietHoursStart: undefined,
        quietHoursEnd: undefined,
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
        }}
      >
        <PreferencesStatusAlert 
          hasPreferences={!!preferences} 
          userEmail={user?.email ?? undefined} 
        />

        <NotificationChannelsCard />

        <SavePreferencesButton loading={saving} />
      </Form>
    </div>
  );
};

export default NotificationSettings;

/**
 * StaffDashboard - Main Dashboard View for Staff Role
 * 
 * Displays real-time device status, alerts, and system health metrics.
 * Refactored to follow Service Layer → Global Hooks → UI architecture.
 * 
 * Architecture:
 * - Uses global hooks: useRealtime_Devices(), useRealtime_Alerts()
 * - Thin component - only orchestration and composition
 * - All sub-components extracted to components/ folder
 */

import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Space, Alert, Button, Skeleton } from 'antd';
import { EyeOutlined, AlertOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StaffLayout } from '../../../components/layouts/StaffLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useThemeToken } from '../../../theme';
import { useRealtime_Devices, useRealtime_Alerts, type DeviceWithSensorData } from '@/hooks';
import type { WaterQualityAlert } from '@/schemas';
import { RealtimeAlertMonitor } from '../../../components/RealtimeAlertMonitor';
import { calculateDeviceStatus } from '../../../utils/waterQualityUtils';
import {
  DashboardHeader,
  DeviceStatsCards,
  DeviceStatusTable,
  RecentAlertsTable,
  QuickActionsSidebar,
  type DeviceStatus,
  type RecentAlert,
} from './components';

/**
 * Staff Dashboard Page Component
 * Orchestrates global hooks and displays dashboard sections
 */
export const StaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const token = useThemeToken();
  
  // Global hooks for real-time data
  const { devices, isLoading: devicesLoading, refetch: refetchDevices } = useRealtime_Devices();
  const { alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useRealtime_Alerts({ maxAlerts: 20 });
  
  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Update last updated time when data changes
  useEffect(() => {
    if (!devicesLoading && !alertsLoading) {
      setLastUpdated(new Date());
    }
  }, [devices, alerts, devicesLoading, alertsLoading]);

  // Refresh handler using hooks' refetch functions
  const handleRefresh = () => {
    setRefreshing(true);
    refetchDevices();
    refetchAlerts();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Calculate device statistics using utility function
  const deviceStats = useMemo(() => {
    const devicesWithReadings = devices.map((device: DeviceWithSensorData) => {
      const status = calculateDeviceStatus(device.status, device.latestReading);
      return { ...device, computedStatus: status };
    });

    return {
      total: devices.length,
      online: devicesWithReadings.filter((d: typeof devicesWithReadings[0]) => d.computedStatus === 'online').length,
      offline: devicesWithReadings.filter((d: typeof devicesWithReadings[0]) => d.computedStatus === 'offline').length,
      warnings: devicesWithReadings.filter((d: typeof devicesWithReadings[0]) => d.computedStatus === 'warning').length,
    };
  }, [devices]);

  // Transform devices for table display using utility function
  const deviceStatusData: DeviceStatus[] = useMemo(() => {
    return devices.map((device: DeviceWithSensorData) => {
      const reading = device.latestReading;
      const status = calculateDeviceStatus(device.status, reading);

      const lastUpdate = reading?.timestamp 
        ? new Date(reading.timestamp).toLocaleString()
        : 'No data';

      return {
        id: device.deviceId,
        name: device.deviceName || device.deviceId,
        location: device.location || 'Unknown',
        status,
        lastUpdate,
        ph: reading?.ph || 0,
        tds: reading?.tds || 0,
        turbidity: reading?.turbidity || 0,
      };
    });
  }, [devices]);

  // Transform alerts for table display
  const recentAlertsData: RecentAlert[] = useMemo(() => {
    return alerts
      .filter((alert: WaterQualityAlert) => alert.status === 'Active' || alert.status === 'Acknowledged')
      .slice(0, 5)
      .map((alert: WaterQualityAlert) => ({
        key: alert.alertId,
        device: alert.deviceName || alert.deviceId || 'Unknown Device',
        parameter: alert.parameter || 'Unknown',
        value: alert.currentValue || 0,
        threshold: alert.thresholdValue || 0,
        time: alert.createdAt 
          ? new Date(alert.createdAt.seconds * 1000).toLocaleString() 
          : 'Unknown',
        severity: (alert.severity === 'Critical' ? 'high' : alert.severity === 'Warning' ? 'medium' : 'low'),
      }));
  }, [alerts]);

  // Loading state
  const isLoading = devicesLoading || alertsLoading;

  // Early return if token is not available
  if (!token) {
    return (
      <StaffLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Skeleton active paragraph={{ rows: 10 }} />
        </Space>
      </StaffLayout>
    );
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <StaffLayout>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Skeleton.Input active style={{ width: 300, height: 32 }} />
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map((i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Col>
            ))}
          </Row>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Space>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Dashboard Header */}
          <DashboardHeader
            userName={userProfile?.firstname}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

          {/* Device Statistics Cards */}
          <DeviceStatsCards stats={deviceStats} />

          {/* Warning Alert for High Severity Issues */}
          {deviceStats.warnings > 0 && (
            <Alert
              message={
                <Space>
                  <AlertOutlined />
                  <span style={{ fontWeight: 600 }}>
                    {deviceStats.warnings} device{deviceStats.warnings > 1 ? 's' : ''} require{deviceStats.warnings === 1 ? 's' : ''} attention
                  </span>
                </Space>
              }
              description="Please review and take necessary actions to maintain water quality standards."
              type="warning"
              showIcon
              action={
                <Button
                  type="primary"
                  size="small"
                  onClick={() => navigate('/staff/readings')}
                  icon={<EyeOutlined />}
                >
                  View All Alerts
                </Button>
              }
              style={{ marginBottom: 0 }}
            />
          )}

          {/* Real-Time Alert Monitor */}
          <RealtimeAlertMonitor />

          {/* Main Content Grid */}
          <Row gutter={[16, 16]}>
            {/* Left Column - Alerts & Device Status */}
            <Col xs={24} xl={16}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <RecentAlertsTable alerts={recentAlertsData} />
                <DeviceStatusTable devices={deviceStatusData} />
              </Space>
            </Col>

            {/* Right Column - Quick Actions & Info */}
            <Col xs={24} xl={8}>
              <QuickActionsSidebar deviceStats={deviceStats} />
            </Col>
          </Row>
        </Space>
      </div>
    </StaffLayout>
  );
};

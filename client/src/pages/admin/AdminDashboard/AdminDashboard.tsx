import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { Typography, Space, Row, Col } from 'antd';
import {
  StatisticsCards,
  SensorReadingsCard,
  HistoricalTrendsCard,
  RecentAlertsCard,
  MQTTBridgeHealthCard,
} from './components';
import {
  useAlerts,
  useDevices,
  useHistoricalData,
  useDashboardStats,
} from './hooks';
import { useState } from 'react';

const { Title, Text } = Typography;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AdminDashboard = () => {
  // UI State
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  // Custom Hooks
  const { alerts, loading: alertsLoading } = useAlerts();
  const { devices, loading: devicesLoading } = useDevices();
  const { historicalData } = useHistoricalData(selectedDevice);
  const stats = useDashboardStats(devices, alerts);

  // Combined loading state
  const loading = alertsLoading || devicesLoading;

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* ====== PAGE HEADER ====== */}
        <div>
          <Title level={2}>Real-Time Dashboard</Title>
          <Text type="secondary">
            Monitor water quality sensors, alerts, and MQTT Bridge in real-time
          </Text>
        </div>

        {/* ====== STATISTICS CARDS ====== */}
        <StatisticsCards
          totalDevices={stats.totalDevices}
          onlineDevices={stats.onlineDevices}
          activeAlerts={stats.activeAlerts}
          criticalAlerts={stats.criticalAlerts}
        />

        {/* ====== MQTT BRIDGE HEALTH MONITOR ====== */}
        <MQTTBridgeHealthCard />

        {/* ====== TWO-COLUMN LAYOUT FOR DESKTOP ====== */}
        <Row gutter={[16, 16]}>
          {/* Left Column - Sensor Readings & Historical Trends */}
          <Col xs={24} lg={14} xl={16}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* REAL-TIME SENSOR READINGS */}
              <SensorReadingsCard
                devices={devices}
                loading={loading}
                onlineDevices={stats.onlineDevices}
                onDeviceSelect={setSelectedDevice}
              />

              {/* DATA VISUALIZATION (Historical Trends) */}
              <HistoricalTrendsCard
                selectedDevice={selectedDevice}
                devices={devices}
                historicalData={historicalData}
                onDeviceChange={setSelectedDevice}
              />
            </Space>
          </Col>

          {/* Right Column - Recent Alerts */}
          <Col xs={24} lg={10} xl={8}>
            <RecentAlertsCard
              alerts={alerts}
              loading={loading}
              activeAlerts={stats.activeAlerts}
              criticalAlerts={stats.criticalAlerts}
            />
          </Col>
        </Row>
      </Space>
    </AdminLayout>
  );
};

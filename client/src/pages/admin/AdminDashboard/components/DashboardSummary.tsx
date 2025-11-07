import { Space, Card, Progress, Typography } from 'antd';
import { 
  DatabaseOutlined,
  CloudServerOutlined,
  ThunderboltOutlined,
  HddOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import { AlertStatusCard } from './AlertStatusCard';
import { MqttBridgeStatusCard } from './MqttBridgeStatusCard';
import { DeviceStatusCard } from './DeviceStatusCard';
import { MetricIndicator } from './MetricIndicator';
import { Row, Col } from 'antd';

const { Text, Title } = Typography;

interface DashboardSummaryProps {
  deviceStats: {
    total: number;
    online: number;
    offline: number;
    withReadings: number;
  };
  alertStats: {
    total: number;
    active: number;
    critical: number;
    warning: number;
    advisory: number;
  };
  mqttHealth: {
    status: 'healthy' | 'unhealthy';
    connected: boolean;
    metrics?: {
      received: number;
      published: number;
      failed: number;
    };
  } | null;
  mqttMemory?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  } | null;
  loading: boolean;
}

export const DashboardSummary = memo<DashboardSummaryProps>(({ 
  deviceStats, 
  alertStats, 
  mqttHealth,
  mqttMemory,
  loading 
}) => {
  // DEFENSIVE: Validate input data before calculations
  // Prevent 0% flashes when data is temporarily null/undefined
  const safeDeviceStats = useMemo(() => ({
    total: deviceStats?.total ?? 0,
    online: deviceStats?.online ?? 0,
    offline: deviceStats?.offline ?? 0,
    withReadings: deviceStats?.withReadings ?? 0,
  }), [deviceStats]);

  const safeAlertStats = useMemo(() => ({
    total: alertStats?.total ?? 0,
    active: alertStats?.active ?? 0,
    critical: alertStats?.critical ?? 0,
    warning: alertStats?.warning ?? 0,
    advisory: alertStats?.advisory ?? 0,
  }), [alertStats]);

  // Calculate RAM usage from MQTT Bridge memory data
  const ramUsage = useMemo(() => {
    if (!mqttMemory) return null;
    
    const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB limit for Cloud Run
    const used = mqttMemory.rss;
    const total = RAM_LIMIT_BYTES;
    const percent = Math.min(Math.round((used / total) * 100), 100);
    
    return { used, total, percent };
  }, [mqttMemory]);

  // Calculate component health scores for indicators
  const deviceHealth = useMemo(() => {
    if (safeDeviceStats.total === 0) return 100;
    return Math.round((safeDeviceStats.online / safeDeviceStats.total) * 100);
  }, [safeDeviceStats]);

  const alertHealth = useMemo(() => {
    if (safeAlertStats.total === 0) return 100;
    if (safeAlertStats.critical > 0) return 0;
    return Math.max(0, 100 - Math.round((safeAlertStats.active / safeAlertStats.total) * 100));
  }, [safeAlertStats]);

  const mqttHealthScore = useMemo(() => {
    if (!mqttHealth) return 0;
    if (mqttHealth.status === 'healthy' && mqttHealth.connected) return 100;
    if (mqttHealth.connected) return 50;
    return 0;
  }, [mqttHealth]);

  const ramHealthScore = useMemo(() => {
    if (!ramUsage) return 100;
    const usedPercent = ramUsage.percent;
    // Invert the percentage - lower RAM usage is better
    return Math.max(0, 100 - usedPercent);
  }, [ramUsage]);

  // Overall health calculation
  const overallHealth = useMemo(() => {
    const weighted = (
      (deviceHealth * 0.30) +
      (alertHealth * 0.30) +
      (mqttHealthScore * 0.25) +
      (ramHealthScore * 0.15)
    );
    return Math.round(weighted);
  }, [deviceHealth, alertHealth, mqttHealthScore, ramHealthScore]);

  const getHealthColor = (percent: number) => {
    if (percent >= 80) return '#52c41a';
    if (percent >= 60) return '#faad14';
    if (percent >= 40) return '#fa8c16';
    return '#ff4d4f';
  };

  const getHealthStatus = (percent: number) => {
    if (percent >= 80) return 'Excellent';
    if (percent >= 60) return 'Good';
    if (percent >= 40) return 'Fair';
    return 'Poor';
  };

  const formatBytes = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Reorganized Layout: Left (Device & MQTT) | Middle (Overall Health) | Right (Alert & RAM) */}
      <Row gutter={[16, 16]} align="top">
        {/* LEFT COLUMN - Device & MQTT Bridge Indicators */}
        <Col xs={24} lg={6}>
          <Space direction="vertical" size="middle" style={{ width: '100%', height: '100%' }}>
            <MetricIndicator
              title="Devices"
              percent={deviceHealth}
              icon={<DatabaseOutlined />}
              tooltip={`${safeDeviceStats.online} of ${safeDeviceStats.total} devices online`}
              loading={loading}
            />
            <MetricIndicator
              title="MQTT Bridge"
              percent={mqttHealthScore}
              icon={<CloudServerOutlined />}
              tooltip={`MQTT Bridge: ${mqttHealth?.status || 'unknown'} - ${mqttHealth?.connected ? 'connected' : 'disconnected'}`}
              loading={loading}
            />
          </Space>
        </Col>

        {/* MIDDLE COLUMN - Overall System Health */}
        <Col xs={24} lg={12}>
          <Card 
            loading={loading}
            bordered={false}
            style={{ 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              height: '100%',
              minHeight: '340px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
            bodyStyle={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '24px'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Header */}
              <div style={{ textAlign: 'center' }}>
                <Space direction="vertical" size={4}>
                  <DashboardOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                  <Title level={3} style={{ margin: '8px 0 4px 0' }}>Overall System Health</Title>
                  <Text type="secondary" style={{ fontSize: '14px' }}>Real-time monitoring across all systems</Text>
                </Space>
              </div>

              {/* Main Health Gauge */}
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Progress
                  type="dashboard"
                  percent={overallHealth}
                  strokeColor={getHealthColor(overallHealth)}
                  strokeWidth={10}
                  format={(percent) => (
                    <Space direction="vertical" size={0}>
                      <Text strong style={{ fontSize: '52px', color: getHealthColor(percent || 0), lineHeight: 1 }}>
                        {percent}%
                      </Text>
                      <Text type="secondary" style={{ fontSize: '18px', fontWeight: 500 }}>
                        {getHealthStatus(percent || 0)}
                      </Text>
                    </Space>
                  )}
                  size={200}
                />
              </div>
            </Space>
          </Card>
        </Col>

        {/* RIGHT COLUMN - Alert & RAM Usage Indicators */}
        <Col xs={24} lg={6}>
          <Space direction="vertical" size="middle" style={{ width: '100%', height: '100%' }}>
            <MetricIndicator
              title="Alerts"
              percent={alertHealth}
              icon={<ThunderboltOutlined />}
              tooltip={`${safeAlertStats.active} active alerts (${safeAlertStats.critical} critical)`}
              loading={loading}
            />
            <MetricIndicator
              title="RAM Usage"
              percent={ramUsage?.percent || 0}
              icon={<HddOutlined />}
              tooltip={
                ramUsage 
                  ? `RAM: ${formatBytes(ramUsage.used)}MB / ${formatBytes(ramUsage.total)}MB (${ramUsage.percent}%)`
                  : 'RAM usage data not available'
              }
              loading={loading}
              inverse={true}
            />
          </Space>
        </Col>
      </Row>

      {/* Detailed Stats Grid - Full Width Cards */}
      <Row gutter={[16, 16]}>
        {/* Device Statistics - Using new DeviceStatusCard */}
        <Col xs={24} md={8}>
          <DeviceStatusCard
            deviceStats={safeDeviceStats}
            loading={loading}
          />
        </Col>

        {/* Alert Statistics - Using new AlertStatusCard */}
        <Col xs={24} md={8}>
          <AlertStatusCard
            alertStats={safeAlertStats}
            loading={loading}
          />
        </Col>

        {/* MQTT Bridge Statistics - Using new MqttBridgeStatusCard */}
        <Col xs={24} md={8}>
          <MqttBridgeStatusCard
            mqttHealth={mqttHealth}
            loading={loading}
          />
        </Col>
      </Row>
    </Space>
  );
});

DashboardSummary.displayName = 'DashboardSummary';

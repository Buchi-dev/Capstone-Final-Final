/**
 * AdminAnalytics - Analytics Dashboard Page
 * 
 * Displays comprehensive water quality analytics including:
 * - System health metrics
 * - Real-time device readings
 * - Water quality alerts
 * - Historical trends and charts
 * 
 * Architecture: Uses GLOBAL read hooks for real-time data
 */
import { Space, Spin } from 'antd';
import { memo } from 'react';
import { AdminLayout } from '../../../components/layouts';
import { 
  useRealtime_Devices, 
  useRealtime_Alerts,
  useRealtime_MQTTMetrics 
} from '../../../hooks';
import { useAnalyticsProcessing, useAnalyticsStats } from './hooks';
import {
  AnalyticsHeader,
  KeyMetrics,
  WaterQualityStandards,
  ActiveAlerts,
  DeviceStatusOverview,
  WaterQualityMetrics,
  TimeSeriesCharts,
  WaterQualityAssessment,
} from './components';

export const AdminAnalytics = memo(() => {
  // ✅ GLOBAL READ HOOKS - Real-time data from service layer
  const {
    devices,
    isLoading: devicesLoading,
  } = useRealtime_Devices({ includeMetadata: true });

  const {
    alerts,
    isLoading: alertsLoading,
  } = useRealtime_Alerts({ maxAlerts: 100 });

  const {
    health: mqttHealth,
    status: mqttStatus,
    isLoading: mqttLoading,
  } = useRealtime_MQTTMetrics({ pollInterval: 3000 });

  // ✅ LOCAL HOOK - Calculate analytics statistics (UI logic only)
  const { 
    deviceStats, 
    alertStats,
    waterQualityMetrics,
    systemHealth 
  } = useAnalyticsStats(devices, alerts, mqttHealth, mqttStatus);

  // ✅ LOCAL HOOK - Process data for charts (UI logic only)
  const { 
    timeSeriesData, 
    parameterDistribution, 
    parameterComparisonData 
  } = useAnalyticsProcessing(devices);

  // Combined loading state
  const loading = devicesLoading || alertsLoading || mqttLoading;

  // Initial loading state
  if (loading && devices.length === 0) {
    return (
      <AdminLayout>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Loading analytics data..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <AnalyticsHeader />
        
        <KeyMetrics 
          systemHealth={systemHealth}
          deviceStats={deviceStats}
          alertStats={alertStats}
          waterQualityMetrics={waterQualityMetrics}
          loading={loading}
        />

        <WaterQualityStandards />

        <ActiveAlerts alerts={alerts} />

        <DeviceStatusOverview 
          devices={devices}
          deviceStats={deviceStats}
        />

        <WaterQualityMetrics 
          metrics={waterQualityMetrics}
          devices={devices}
        />

        <TimeSeriesCharts 
          timeSeriesData={timeSeriesData}
          parameterComparisonData={parameterComparisonData}
          parameterDistribution={parameterDistribution}
        />

        <WaterQualityAssessment 
          metrics={waterQualityMetrics}
          devices={devices}
          alerts={alerts}
        />
      </Space>
    </AdminLayout>
  );
});

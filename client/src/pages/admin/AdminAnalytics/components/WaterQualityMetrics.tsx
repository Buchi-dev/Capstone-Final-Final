/**
 * WaterQualityMetrics Component
 * 
 * Displays water quality metrics from real-time device readings
 */
import { Row, Col, Card, Statistic, Typography } from 'antd';
import {
  RiseOutlined,
  LineChartOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import type { WaterQualityMetrics as Metrics } from '../hooks';
import type { Device } from '../../../../schemas';

const { Text } = Typography;

const WATER_QUALITY_THRESHOLDS = {
  pH: {
    min: 6.5,
    max: 8.5,
  },
  TDS: {
    excellent: 300,
    good: 600,
    acceptable: 1000,
    maxEPPA: 500,
  },
  Turbidity: {
    max: 5,
  },
};

interface WaterQualityMetricsProps {
  metrics: Metrics;
  devices: Device[];
}

export const WaterQualityMetrics = memo<WaterQualityMetricsProps>(({ metrics, devices }) => {
  const token = useThemeToken();

  if (!metrics || devices.length === 0) {
    return (
      <Card>
        <Text type="secondary">No water quality data available</Text>
      </Card>
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average pH Level"
            value={metrics.averagePh || 0}
            precision={2}
            prefix={<RiseOutlined />}
            valueStyle={{ 
              color: (metrics.averagePh >= WATER_QUALITY_THRESHOLDS.pH.min && 
                      metrics.averagePh <= WATER_QUALITY_THRESHOLDS.pH.max) 
                ? token.colorSuccess 
                : token.colorError 
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minPh.toFixed(2)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxPh.toFixed(2)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: {WATER_QUALITY_THRESHOLDS.pH.min} - {WATER_QUALITY_THRESHOLDS.pH.max}
            </Text>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average TDS"
            value={metrics.averageTds || 0}
            precision={1}
            suffix="ppm"
            prefix={<LineChartOutlined />}
            valueStyle={{ 
              color: (metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.excellent) 
                ? token.colorSuccess 
                : (metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.good)
                ? token.colorInfo
                : (metrics.averageTds <= WATER_QUALITY_THRESHOLDS.TDS.acceptable)
                ? token.colorWarning
                : token.colorError
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minTds.toFixed(1)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxTds.toFixed(1)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: ≤{WATER_QUALITY_THRESHOLDS.TDS.maxEPPA} ppm (EPPA/DOH)
            </Text>
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="Average Turbidity"
            value={metrics.averageTurbidity || 0}
            precision={2}
            suffix="NTU"
            prefix={<FallOutlined />}
            valueStyle={{ 
              color: (metrics.averageTurbidity <= WATER_QUALITY_THRESHOLDS.Turbidity.max) 
                ? token.colorSuccess 
                : token.colorError 
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">Min: {metrics.minTurbidity.toFixed(2)}</Text>
            <Text type="secondary" style={{ float: 'right' }}>Max: {metrics.maxTurbidity.toFixed(2)}</Text>
          </div>
          <div style={{ marginTop: 4 }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Standard: ≤{WATER_QUALITY_THRESHOLDS.Turbidity.max} NTU (WHO/DOH)
            </Text>
          </div>
        </Card>
      </Col>
    </Row>
  );
});

WaterQualityMetrics.displayName = 'WaterQualityMetrics';

import { Card, Statistic, Row, Col } from 'antd';
import {
  BellOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import type { AlertStats } from '../hooks';

interface AlertStatisticsProps {
  stats: AlertStats;
}

/**
 * Alert Statistics Cards Component
 * Displays key metrics about alerts
 */
export const AlertStatistics: React.FC<AlertStatisticsProps> = ({ stats }) => {
  const token = useThemeToken();

  return (
    <Row gutter={16} style={{ marginTop: 24, marginBottom: 24 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Total Alerts"
            value={stats.total}
            prefix={<BellOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Active Alerts"
            value={stats.active}
            valueStyle={{ color: token.colorError }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Critical Alerts"
            value={stats.critical}
            valueStyle={{ color: token.colorError }}
            prefix={<WarningOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Resolved"
            value={stats.resolved}
            valueStyle={{ color: token.colorSuccess }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};

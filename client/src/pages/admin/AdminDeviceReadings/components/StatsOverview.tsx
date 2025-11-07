import { Card, Statistic, Row, Col } from 'antd';
import {
  DashboardOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { memo } from 'react';

interface StatsOverviewProps {
  stats: {
    total: number;
    online: number;
    offline: number;
    critical: number;
    warning: number;
    normal: number;
  };
}

export const StatsOverview = memo(({ stats }: StatsOverviewProps) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="Total Devices"
            value={stats.total}
            prefix={<DashboardOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="Online"
            value={stats.online}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card>
          <Statistic
            title="Offline"
            value={stats.offline}
            prefix={<DisconnectOutlined />}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card style={{ borderLeft: '4px solid #ff4d4f' }}>
          <Statistic
            title="Critical"
            value={stats.critical}
            prefix={<CloseCircleOutlined />}
            valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card style={{ borderLeft: '4px solid #faad14' }}>
          <Statistic
            title="Warning"
            value={stats.warning}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#faad14', fontWeight: 'bold' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8} lg={4}>
        <Card style={{ borderLeft: '4px solid #52c41a' }}>
          <Statistic
            title="Normal"
            value={stats.normal}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatsOverview.displayName = 'StatsOverview';

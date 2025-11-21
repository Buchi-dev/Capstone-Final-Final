import { Card, Statistic, Row, Col, Tag } from 'antd';
import {
  ThunderboltOutlined,
  MailOutlined,
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { memo, useMemo } from 'react';
import type { SystemHealth } from '../../../../services/health.Service';
import { HEALTH_COLORS } from '../config';

interface MetricsGridProps {
  health: SystemHealth | null;
  loading: boolean;
}

const cardStyle = { 
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};

export const MetricsGrid = memo(({ health, loading }: MetricsGridProps) => {
  const databaseStatus = health?.checks?.database?.status;
  const redisStatus = health?.checks?.redis?.status;
  const emailQueueStatus = health?.checks?.emailQueue?.status;
  const memoryStatus = health?.checks?.memory?.status;

  const databaseColor = useMemo(() => 
    databaseStatus === 'OK' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.ERROR,
    [databaseStatus]
  );

  const redisColor = useMemo(() => 
    redisStatus === 'OK' ? HEALTH_COLORS.EXCELLENT : 
    redisStatus === 'NOT_CONFIGURED' ? HEALTH_COLORS.UNKNOWN : HEALTH_COLORS.ERROR,
    [redisStatus]
  );

  const emailColor = useMemo(() => {
    if (emailQueueStatus === 'OK') return HEALTH_COLORS.EXCELLENT;
    if (emailQueueStatus === 'WARNING') return HEALTH_COLORS.WARNING;
    if (emailQueueStatus === 'NOT_CONFIGURED') return HEALTH_COLORS.UNKNOWN;
    return HEALTH_COLORS.ERROR;
  }, [emailQueueStatus]);

  const memoryColor = useMemo(() => 
    memoryStatus === 'OK' ? HEALTH_COLORS.EXCELLENT : HEALTH_COLORS.WARNING,
    [memoryStatus]
  );

  const systemStatusColor = useMemo(() => {
    if (health?.status === 'OK') return HEALTH_COLORS.EXCELLENT;
    if (health?.status === 'DEGRADED') return HEALTH_COLORS.WARNING;
    return HEALTH_COLORS.ERROR;
  }, [health?.status]);

  const emailQueueStats = health?.checks?.emailQueue?.stats;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Database"
            value={databaseStatus || 'UNKNOWN'}
            prefix={databaseStatus === 'OK' ? 
              <CheckCircleOutlined style={{ color: databaseColor }} /> : 
              <CloseCircleOutlined style={{ color: databaseColor }} />
            }
            valueStyle={{ color: databaseColor, fontWeight: 600, fontSize: '16px' }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Redis Cache"
            value={redisStatus || 'UNKNOWN'}
            prefix={redisStatus === 'OK' ? 
              <CheckCircleOutlined style={{ color: redisColor }} /> : 
              <CloseCircleOutlined style={{ color: redisColor }} />
            }
            valueStyle={{ color: redisColor, fontWeight: 600, fontSize: '16px' }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Email Queue"
            value={emailQueueStats?.waiting || 0}
            suffix="waiting"
            prefix={<MailOutlined style={{ color: emailColor }} />}
            valueStyle={{ color: emailColor, fontWeight: 600 }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={6}>
        <Card 
          loading={loading}
          bordered={false}
          style={cardStyle}
        >
          <Statistic
            title="Memory"
            value={memoryStatus || 'UNKNOWN'}
            prefix={<ThunderboltOutlined style={{ color: memoryColor }} />}
            valueStyle={{ color: memoryColor, fontWeight: 600, fontSize: '16px' }}
          />
        </Card>
      </Col>

      <Col xs={24} sm={12} lg={12}>
        <Card 
          loading={loading}
          bordered={false}
          style={{
            ...cardStyle,
            height: '100%'
          }}
        >
          <Statistic
            title="System Status"
            value={health?.status || 'UNKNOWN'}
            prefix={<CloudServerOutlined style={{ color: systemStatusColor }} />}
            valueStyle={{ 
              color: systemStatusColor,
              fontWeight: 600,
              fontSize: '18px'
            }}
            suffix={
              <Tag color={health?.status === 'OK' ? 'success' : health?.status === 'DEGRADED' ? 'warning' : 'error'}>
                {health?.status === 'OK' ? 'Healthy' : health?.status === 'DEGRADED' ? 'Degraded' : 'Unhealthy'}
              </Tag>
            }
          />
        </Card>
      </Col>
    </Row>
  );
});

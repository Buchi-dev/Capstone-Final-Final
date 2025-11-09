/**
 * DashboardHeader Component
 * Displays welcome message and refresh control for Staff Dashboard
 */

import { Card, Row, Col, Space, Typography, Button, Badge } from 'antd';
import { SmileOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { Title, Text } = Typography;

interface DashboardHeaderProps {
  userName?: string;
  lastUpdated: Date;
  onRefresh: () => void;
  refreshing: boolean;
}

/**
 * Header section with welcome message and refresh button
 * @param props - Component props
 */
export default function DashboardHeader({
  userName,
  lastUpdated,
  onRefresh,
  refreshing,
}: DashboardHeaderProps) {
  const token = useThemeToken();

  return (
    <Card
      style={{
        background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorPrimary}05 100%)`,
        border: `1px solid ${token.colorPrimary}20`,
      }}
    >
      <Row justify="space-between" align="middle">
        <Col>
          <Space direction="vertical" size={4}>
            <Title level={3} style={{ margin: 0 }}>
              <SmileOutlined style={{ marginRight: '8px' }} />
              Welcome back, {userName || 'Staff Member'}!
            </Title>
            <Text type="secondary">
              Here's what's happening with your water quality monitoring system today
            </Text>
            <Space size="small" style={{ marginTop: 8 }}>
              <Badge status="processing" />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            </Space>
          </Space>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={refreshing ? <SyncOutlined spin /> : <ReloadOutlined />}
            size="large"
            onClick={onRefresh}
            loading={refreshing}
          >
            Refresh Data
          </Button>
        </Col>
      </Row>
    </Card>
  );
}

/**
 * QuickActionsSidebar Component
 * Displays quick action buttons and system health summary
 */

import { Card, Space, Button, Typography, Divider } from 'antd';
import {
  RiseOutlined,
  ApiOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';

const { Text, Title } = Typography;

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
  warnings: number;
}

interface QuickActionsSidebarProps {
  deviceStats: DeviceStats;
}

/**
 * Sidebar with quick action buttons and system health summary
 * @param props - Component props
 */
export default function QuickActionsSidebar({ deviceStats }: QuickActionsSidebarProps) {
  const navigate = useNavigate();
  const token = useThemeToken();

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Quick Actions */}
      <Card
        title={
          <Space>
            <RiseOutlined />
            <Text strong>Quick Actions</Text>
          </Space>
        }
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            type="default"
            block
            size="large"
            icon={<ApiOutlined />}
            onClick={() => navigate('/staff/devices')}
            style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
          >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text strong>View All Devices</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Monitor {deviceStats.total} devices
              </Text>
            </Space>
          </Button>

          <Button
            type="default"
            block
            size="large"
            icon={<LineChartOutlined />}
            onClick={() => navigate('/staff/readings')}
            style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
          >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text strong>Sensor Readings</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Real-time data analysis
              </Text>
            </Space>
          </Button>

          <Button
            type="default"
            block
            size="large"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/staff/analytics')}
            style={{ textAlign: 'left', height: 'auto', padding: '12px 16px' }}
          >
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text strong>Analytics</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                View trends and insights
              </Text>
            </Space>
          </Button>
        </Space>
      </Card>

      {/* System Health Summary */}
      <Card
        title={
          <Space>
            <SafetyOutlined style={{ color: token.colorSuccess }} />
            <Text strong>System Health</Text>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: '36px', fontWeight: 700 }}>
              {deviceStats.total}
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Total Active Devices
            </Text>
          </div>

          <Divider style={{ margin: 0 }} />

          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                <Text>Online</Text>
              </Space>
              <Text strong>{deviceStats.online}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <WarningOutlined style={{ color: token.colorWarning }} />
                <Text>Warnings</Text>
              </Space>
              <Text strong>{deviceStats.warnings}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Space>
                <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                <Text>Offline</Text>
              </Space>
              <Text strong>{deviceStats.offline}</Text>
            </div>
          </Space>
        </Space>
      </Card>

      {/* Water Quality Standards */}
      <Card
        title={
          <Space>
            <ExperimentOutlined style={{ color: token.colorInfo }} />
            <Text strong>Quality Standards</Text>
          </Space>
        }
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '12px' }}>
              pH Level
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Normal Range: 6.5 - 8.5
              </Text>
            </div>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Text strong style={{ fontSize: '12px' }}>
              TDS
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Normal Range: 0 - 500 ppm
              </Text>
            </div>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Text strong style={{ fontSize: '12px' }}>
              Turbidity
            </Text>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Normal Range: 0 - 5 NTU
              </Text>
            </div>
          </div>
        </Space>
      </Card>
    </Space>
  );
}

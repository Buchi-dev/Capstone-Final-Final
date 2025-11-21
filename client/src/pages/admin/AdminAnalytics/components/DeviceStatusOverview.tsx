/**
 * DeviceStatusOverview Component
 * 
 * Displays device status distribution and summary from real-time data
 */
import { Row, Col, Card, Space, Typography, Progress } from 'antd';
import {
  ApiOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useThemeToken } from '../../../../theme';
import type { Device } from '../../../../schemas';
import type { DeviceStats } from '../hooks';

const { Text } = Typography;

interface DeviceStatusOverviewProps {
  devices: Device[];
  deviceStats: DeviceStats;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const DeviceStatusOverview = memo<DeviceStatusOverviewProps>(({ 
  devices, 
  deviceStats 
}) => {
  const token = useThemeToken();

  // Calculate status breakdown
  const statusBreakdown = {
    online: deviceStats.online,
    offline: deviceStats.offline,
    error: devices.filter(d => d.status === 'error').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
  };

  const deviceStatusPieData = [
    { name: 'Online', value: statusBreakdown.online },
    { name: 'Offline', value: statusBreakdown.offline },
    { name: 'Error', value: statusBreakdown.error },
    { name: 'Maintenance', value: statusBreakdown.maintenance },
  ].filter(item => item.value > 0);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title={<><ApiOutlined /> Device Status Distribution</>}>
          {deviceStatusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceStatusPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {deviceStatusPieData.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Text type="secondary">No device status data available</Text>
            </div>
          )}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title={<><DashboardOutlined /> Device Status Summary</>}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 20 }} />
                    <Text strong>Online Devices</Text>
                  </Space>
                </Col>
                <Col>
                  <Text strong style={{ fontSize: 24, color: token.colorSuccess }}>
                    {statusBreakdown?.online || 0}
                  </Text>
                </Col>
              </Row>
              <Progress 
                percent={deviceStats.total 
                  ? (statusBreakdown.online / deviceStats.total) * 100 
                  : 0} 
                showInfo={false}
                strokeColor={token.colorSuccess}
              />
            </div>

            <div>
              <Row justify="space-between" align="middle">
                <Col>
                  <Space>
                    <CloseCircleOutlined style={{ color: token.colorTextSecondary, fontSize: 20 }} />
                    <Text strong>Offline Devices</Text>
                  </Space>
                </Col>
                <Col>
                  <Text strong style={{ fontSize: 24 }}>
                    {statusBreakdown.offline}
                  </Text>
                </Col>
              </Row>
              <Progress 
                percent={deviceStats.total 
                  ? (statusBreakdown.offline / deviceStats.total) * 100 
                  : 0} 
                showInfo={false}
                strokeColor={token.colorTextSecondary}
              />
            </div>

            {statusBreakdown.error > 0 && (
              <div>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Space>
                      <CloseCircleOutlined style={{ color: token.colorError, fontSize: 20 }} />
                      <Text strong>Error Devices</Text>
                    </Space>
                  </Col>
                  <Col>
                    <Text strong style={{ fontSize: 24, color: token.colorError }}>
                      {statusBreakdown.error}
                    </Text>
                  </Col>
                </Row>
              </div>
            )}
          </Space>
        </Card>
      </Col>
    </Row>
  );
});

DeviceStatusOverview.displayName = 'DeviceStatusOverview';

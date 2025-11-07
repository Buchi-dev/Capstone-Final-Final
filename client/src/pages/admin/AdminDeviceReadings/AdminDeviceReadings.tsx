import { useState, useMemo } from 'react';
import {
  Space,
  Typography,
  Alert,
  Row,
  Col,
  Spin,
  Empty,
  Card,
  Divider,
  Segmented,
  Tooltip,
  List,
} from 'antd';
import {
  DashboardOutlined,
  InfoCircleOutlined,
  BarChartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import { useDeviceReadings } from './hooks';
import { StatsOverview, DeviceCard, DeviceListItem, RefreshControl, FilterControls } from './components';

const { Title, Text, Paragraph } = Typography;

export const AdminDeviceReadings = () => {
  const { devices, loading, error, lastUpdate, refresh, stats } = useDeviceReadings();
  
  // Filter states
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');

  // Apply filters
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Severity filter
      if (severityFilter !== 'all' && device.severityLevel !== severityFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && device.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = device.name.toLowerCase().includes(searchLower);
        const matchesId = device.deviceId.toLowerCase().includes(searchLower);
        const matchesLocation =
          device.metadata?.location?.building?.toLowerCase().includes(searchLower) ||
          device.metadata?.location?.floor?.toLowerCase().includes(searchLower);
        
        if (!matchesName && !matchesId && !matchesLocation) {
          return false;
        }
      }

      return true;
    });
  }, [devices, severityFilter, statusFilter, searchTerm]);

  // Group devices by severity
  const criticalDevices = filteredDevices.filter((d) => d.severityLevel === 'critical');
  const warningDevices = filteredDevices.filter((d) => d.severityLevel === 'warning');
  const normalDevices = filteredDevices.filter((d) => d.severityLevel === 'normal');
  const offlineDevices = filteredDevices.filter((d) => d.severityLevel === 'offline');

  return (
    <AdminLayout>
      <div style={{ padding: '24px', maxWidth: '1800px', margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <DashboardOutlined style={{ color: '#1890ff' }} />
                Device Readings Monitor
              </Title>
              <Paragraph type="secondary" style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                Real-time water quality monitoring • Auto-sorted by severity
              </Paragraph>
            </div>
            <RefreshControl onRefresh={refresh} loading={loading} lastUpdate={lastUpdate} />
          </div>

          {/* Info Alert */}
          <Alert
            message="Smart Severity Sorting"
            description="Devices are automatically sorted by severity level. Critical issues appear first for immediate attention."
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
            closable
          />

          {/* Error Alert */}
          {error && (
            <Alert
              message="Error Loading Devices"
              description={error.message}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Statistics Overview */}
          <StatsOverview stats={stats} />

          <Divider style={{ margin: '12px 0' }} />

          {/* Filters and View Mode */}
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <FilterControls
                severityFilter={severityFilter}
                statusFilter={statusFilter}
                searchTerm={searchTerm}
                onSeverityChange={setSeverityFilter}
                onStatusChange={setStatusFilter}
                onSearchChange={setSearchTerm}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary">
                  Showing {filteredDevices.length} of {devices.length} device{devices.length !== 1 ? 's' : ''}
                </Text>
                <Segmented
                  options={[
                    {
                      label: (
                        <Tooltip title="Grid View">
                          <AppstoreOutlined />
                        </Tooltip>
                      ),
                      value: 'grid',
                    },
                    {
                      label: (
                        <Tooltip title="Compact View">
                          <BarChartOutlined />
                        </Tooltip>
                      ),
                      value: 'compact',
                    },
                  ]}
                  value={viewMode}
                  onChange={(value) => setViewMode(value as 'grid' | 'compact')}
                />
              </div>
            </Space>
          </Card>

          {/* Loading State */}
          {loading && devices.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="Loading devices..." />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredDevices.length === 0 && (
            <Card>
              <Empty
                description={
                  searchTerm || severityFilter !== 'all' || statusFilter !== 'all'
                    ? 'No devices match your filters'
                    : 'No devices found'
                }
              />
            </Card>
          )}

          {/* Critical Devices Section */}
          {criticalDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fff2e8',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #ff4d4f',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#ff4d4f' }}>
                  🚨 Critical Devices ({criticalDevices.length})
                </Title>
                <Text type="secondary">Immediate attention required</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {criticalDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={criticalDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Warning Devices Section */}
          {warningDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fffbe6',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #faad14',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#faad14' }}>
                  ⚠️ Warning Devices ({warningDevices.length})
                </Title>
                <Text type="secondary">Monitor closely</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {warningDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={warningDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Normal Devices Section */}
          {normalDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#f6ffed',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #52c41a',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                  ✅ Normal Operation ({normalDevices.length})
                </Title>
                <Text type="secondary">All parameters within acceptable range</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {normalDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={normalDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}

          {/* Offline Devices Section */}
          {offlineDevices.length > 0 && (
            <>
              <div
                style={{
                  background: '#fafafa',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '2px solid #d9d9d9',
                }}
              >
                <Title level={4} style={{ margin: 0, color: '#8c8c8c' }}>
                  📡 Offline Devices ({offlineDevices.length})
                </Title>
                <Text type="secondary">No recent data available</Text>
              </div>
              {viewMode === 'grid' ? (
                <Row gutter={[16, 16]}>
                  {offlineDevices.map((device) => (
                    <Col key={device.deviceId} xs={24} sm={24} md={12} lg={8} xl={6}>
                      <DeviceCard device={device} />
                    </Col>
                  ))}
                </Row>
              ) : (
                <List
                  dataSource={offlineDevices}
                  renderItem={(device) => <DeviceListItem key={device.deviceId} device={device} />}
                  bordered
                  style={{ background: '#fff' }}
                />
              )}
            </>
          )}
        </Space>
      </div>
    </AdminLayout>
  );
};

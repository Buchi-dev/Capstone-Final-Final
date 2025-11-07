import { 
  Card, 
  Space, 
  Statistic, 
  Row, 
  Col, 
  Progress,
  Typography,
  Divider,
  Timeline,
  Tag
} from 'antd';
import {
  DatabaseOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import type { Device, ReportHistory } from '../../../../schemas';
import dayjs from 'dayjs';

const { Text } = Typography;

interface QuickStatsPanelProps {
  devices: Device[];
  reportHistory: ReportHistory[];
  detailed?: boolean;
}

export const QuickStatsPanel = ({ 
  devices, 
  reportHistory,
  detailed = false 
}: QuickStatsPanelProps) => {
  const activeDevices = devices.filter(d => d.status === 'online').length;
  const deviceHealthPercentage = devices.length > 0 
    ? Math.round((activeDevices / devices.length) * 100) 
    : 0;

  const reportsThisMonth = reportHistory.filter(r => 
    dayjs(r.generatedAt).isAfter(dayjs().startOf('month'))
  ).length;

  const reportsThisWeek = reportHistory.filter(r => 
    dayjs(r.generatedAt).isAfter(dayjs().startOf('week'))
  ).length;

  const mostCommonReportType = reportHistory.length > 0
    ? reportHistory.reduce((acc, report) => {
        acc[report.type || 'unknown'] = (acc[report.type || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : {};

  const topReportType = Object.entries(mostCommonReportType).sort((a, b) => b[1] - a[1])[0];

  if (detailed) {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* System Overview */}
        <Card 
          title={
            <Space>
              <DatabaseOutlined />
              <span>System Overview</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic
                title="Total Devices"
                value={devices.length}
                prefix={<DatabaseOutlined />}
                valueStyle={{ fontSize: 24 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Active Devices"
                value={activeDevices}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a', fontSize: 24 }}
              />
            </Col>
          </Row>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">Device Health</Text>
            <Progress 
              percent={deviceHealthPercentage} 
              status={deviceHealthPercentage > 80 ? 'success' : deviceHealthPercentage > 50 ? 'normal' : 'exception'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Space>
        </Card>

        {/* Report Statistics */}
        <Card 
          title={
            <Space>
              <FileTextOutlined />
              <span>Report Statistics</span>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Statistic
                title="Total Reports"
                value={reportHistory.length}
                prefix={<FileTextOutlined />}
                valueStyle={{ fontSize: 24, color: '#1890ff' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="This Month"
                value={reportsThisMonth}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="This Week"
                value={reportsThisWeek}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
          </Row>

          {topReportType && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">Most Generated Type</Text>
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  <Tag color="gold">{topReportType[0]}</Tag>
                  <Text type="secondary">({topReportType[1]} reports)</Text>
                </Space>
              </Space>
            </>
          )}
        </Card>

        {/* Recent Activity Timeline */}
        {reportHistory.length > 0 && (
          <Card 
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Recent Activity</span>
              </Space>
            }
          >
            <Timeline
              items={reportHistory.slice(0, 5).map(report => ({
                color: 'blue',
                children: (
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 12 }}>
                      {report.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(report.generatedAt).format('MMM D, h:mm A')}
                    </Text>
                  </Space>
                ),
              }))}
            />
          </Card>
        )}
      </Space>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Quick Stats Card */}
      <Card 
        title={
          <Space>
            <DatabaseOutlined />
            <span>Quick Stats</span>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Devices"
                value={devices.length}
                prefix={<DatabaseOutlined />}
                valueStyle={{ fontSize: 20 }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Active"
                value={activeDevices}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ fontSize: 20, color: '#52c41a' }}
              />
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }} />

          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Device Health</Text>
            <Progress 
              percent={deviceHealthPercentage} 
              size="small"
              status={deviceHealthPercentage > 80 ? 'success' : 'normal'}
            />
          </div>
        </Space>
      </Card>

      {/* Report Activity Card */}
      <Card>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Statistic
            title="Reports This Month"
            value={reportsThisMonth}
            prefix={<FileTextOutlined />}
            valueStyle={{ fontSize: 20, color: '#1890ff' }}
          />
          
          <Divider style={{ margin: '8px 0' }} />
          
          <Row>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>This Week</Text>
              <div>
                <Text strong style={{ fontSize: 16 }}>{reportsThisWeek}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Text type="secondary" style={{ fontSize: 12 }}>All Time</Text>
              <div>
                <Text strong style={{ fontSize: 16 }}>{reportHistory.length}</Text>
              </div>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Tips Card */}
      <Card 
        size="small"
        title={
          <Space>
            <WarningOutlined />
            <span>Tips</span>
          </Space>
        }
      >
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: 12 }}>• Select relevant devices for focused reports</Text>
          <Text style={{ fontSize: 12 }}>• Use date ranges for specific periods</Text>
          <Text style={{ fontSize: 12 }}>• Include statistics for summaries</Text>
          <Text style={{ fontSize: 12 }}>• Add notes for context</Text>
        </Space>
      </Card>
    </Space>
  );
};

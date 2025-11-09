/**
 * DeviceStatusTable Component
 * Displays device status and sensor readings in a table
 */

import { useMemo } from 'react';
import { Card, Table, Space, Tag, Badge, Tooltip, Typography, Button } from 'antd';
import {
  LineChartOutlined,
  ApiOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

/**
 * Device status data structure
 */
export interface DeviceStatus {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  lastUpdate: string;
  ph: number;
  tds: number;
  turbidity: number;
}

interface DeviceStatusTableProps {
  devices: DeviceStatus[];
}

/**
 * Table displaying device status and sensor readings
 * @param props - Component props
 */
export default function DeviceStatusTable({ devices }: DeviceStatusTableProps) {
  const navigate = useNavigate();
  const token = useThemeToken();

  const deviceColumns = useMemo((): ColumnsType<DeviceStatus> => {
    if (!token) return [];

    return [
      {
        title: 'Device',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 200,
        render: (text: string, record: DeviceStatus) => (
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: '14px' }}>
              {text}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              <EnvironmentOutlined style={{ marginRight: '4px' }} />
              {record.location}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        filters: [
          { text: 'Online', value: 'online' },
          { text: 'Warning', value: 'warning' },
          { text: 'Offline', value: 'offline' },
        ],
        onFilter: (value, record) => record.status === value,
        render: (status: string) => {
          const statusConfig = {
            online: { color: 'success', icon: <CheckCircleOutlined />, text: 'Online' },
            offline: { color: 'default', icon: <ClockCircleOutlined />, text: 'Offline' },
            warning: { color: 'warning', icon: <WarningOutlined />, text: 'Warning' },
          };
          const config = statusConfig[status as keyof typeof statusConfig];
          return (
            <Badge
              status={
                status === 'online' ? 'processing' : status === 'warning' ? 'warning' : 'default'
              }
            >
              <Tag icon={config.icon} color={config.color}>
                {config.text}
              </Tag>
            </Badge>
          );
        },
      },
      {
        title: 'pH Level',
        dataIndex: 'ph',
        key: 'ph',
        width: 100,
        sorter: (a, b) => a.ph - b.ph,
        render: (value: number) => {
          const isAbnormal = value > 8.5 || value < 6.5;
          return (
            <Tooltip
              title={
                isAbnormal ? 'pH out of normal range (6.5-8.5)' : 'pH within normal range'
              }
            >
              <Space>
                {isAbnormal && <WarningOutlined style={{ color: token.colorError }} />}
                <Text
                  strong={isAbnormal}
                  style={{
                    color: isAbnormal ? token.colorError : token.colorSuccess,
                    fontSize: '14px',
                  }}
                >
                  {value > 0 ? value.toFixed(2) : '-'}
                </Text>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'TDS (ppm)',
        dataIndex: 'tds',
        key: 'tds',
        width: 120,
        sorter: (a, b) => a.tds - b.tds,
        render: (value: number) => {
          const isHigh = value > 500;
          return (
            <Tooltip
              title={isHigh ? 'TDS above recommended level' : 'TDS within normal range'}
            >
              <Space>
                {isHigh && <WarningOutlined style={{ color: token.colorWarning }} />}
                <Text
                  strong={isHigh}
                  style={{
                    color: isHigh ? token.colorWarning : token.colorSuccess,
                    fontSize: '14px',
                  }}
                >
                  {value > 0 ? value.toFixed(0) : '-'}
                </Text>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'Turbidity (NTU)',
        dataIndex: 'turbidity',
        key: 'turbidity',
        width: 140,
        sorter: (a, b) => a.turbidity - b.turbidity,
        render: (value: number) => {
          const isHigh = value > 5;
          return (
            <Tooltip
              title={
                isHigh ? 'Turbidity above recommended level' : 'Turbidity within normal range'
              }
            >
              <Space>
                {isHigh && <WarningOutlined style={{ color: token.colorWarning }} />}
                <Text
                  strong={isHigh}
                  style={{
                    color: isHigh ? token.colorWarning : token.colorSuccess,
                    fontSize: '14px',
                  }}
                >
                  {value > 0 ? value.toFixed(2) : '-'}
                </Text>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'Last Update',
        dataIndex: 'lastUpdate',
        key: 'lastUpdate',
        width: 180,
        render: (text: string) => (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {text}
          </Text>
        ),
      },
    ];
  }, [token]);

  return (
    <Card
      title={
        <Space>
          <LineChartOutlined style={{ color: token.colorPrimary }} />
          <Text strong>Device Status & Readings</Text>
        </Space>
      }
      extra={
        <Space>
          <Button
            type="primary"
            onClick={() => navigate('/staff/devices')}
            icon={<ApiOutlined />}
          >
            View All Devices
          </Button>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table
        columns={deviceColumns}
        dataSource={devices}
        rowKey="id"
        pagination={{
          pageSize: 5,
          size: 'small',
          showSizeChanger: false,
        }}
      />
    </Card>
  );
}

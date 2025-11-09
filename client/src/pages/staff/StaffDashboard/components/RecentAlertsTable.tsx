/**
 * RecentAlertsTable Component
 * Displays recent alerts in a table format
 */

import { useMemo } from 'react';
import { Card, Table, Space, Tag, Typography, Button, Empty, Badge } from 'antd';
import {
  ThunderboltOutlined,
  ArrowRightOutlined,
  WarningOutlined,
  AlertOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '../../../../theme';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

/**
 * Recent alert data structure
 */
export interface RecentAlert {
  key: string;
  device: string;
  parameter: string;
  value: number;
  threshold: number;
  time: string;
  severity: 'high' | 'medium' | 'low';
}

interface RecentAlertsTableProps {
  alerts: RecentAlert[];
}

/**
 * Table displaying recent alerts
 * @param props - Component props
 */
export default function RecentAlertsTable({ alerts }: RecentAlertsTableProps) {
  const navigate = useNavigate();
  const token = useThemeToken();

  const alertColumns = useMemo((): ColumnsType<RecentAlert> => {
    if (!token) return [];

    return [
      {
        title: 'Device',
        dataIndex: 'device',
        key: 'device',
        width: 180,
        render: (text: string) => (
          <Text strong style={{ fontSize: '13px' }}>
            {text}
          </Text>
        ),
      },
      {
        title: 'Parameter',
        dataIndex: 'parameter',
        key: 'parameter',
        width: 120,
        filters: [
          { text: 'pH', value: 'pH' },
          { text: 'TDS', value: 'TDS' },
          { text: 'Turbidity', value: 'Turbidity' },
        ],
        onFilter: (value, record) => record.parameter === value,
        render: (text: string) => <Text style={{ fontSize: '13px' }}>{text}</Text>,
      },
      {
        title: 'Current / Threshold',
        key: 'values',
        width: 160,
        render: (_: unknown, record: RecentAlert) => (
          <Space size={4}>
            <Text strong style={{ fontSize: '13px', color: token.colorError }}>
              {record.value.toFixed(2)}
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              /
            </Text>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              {record.threshold.toFixed(2)}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        key: 'severity',
        width: 110,
        filters: [
          { text: 'High', value: 'high' },
          { text: 'Medium', value: 'medium' },
          { text: 'Low', value: 'low' },
        ],
        onFilter: (value, record) => record.severity === value,
        render: (severity: string) => {
          const severityConfig = {
            high: {
              color: token.colorError,
              icon: <AlertOutlined />,
              text: 'High',
              tagColor: 'error',
            },
            medium: {
              color: token.colorWarning,
              icon: <WarningOutlined />,
              text: 'Medium',
              tagColor: 'warning',
            },
            low: {
              color: token.colorInfo,
              icon: <InfoCircleOutlined />,
              text: 'Low',
              tagColor: 'default',
            },
          };
          const config = severityConfig[severity as keyof typeof severityConfig];
          return (
            <Tag icon={config.icon} color={config.tagColor}>
              {config.text}
            </Tag>
          );
        },
      },
      {
        title: 'Time',
        dataIndex: 'time',
        key: 'time',
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
          <ThunderboltOutlined style={{ color: token.colorWarning }} />
          <Text strong>Recent Alerts</Text>
          <Badge count={alerts.length} style={{ backgroundColor: token.colorWarning }} />
        </Space>
      }
      extra={
        <Button
          type="link"
          onClick={() => navigate('/staff/readings')}
          icon={<ArrowRightOutlined />}
        >
          View All
        </Button>
      }
      styles={{ body: { padding: alerts.length === 0 ? 24 : 0 } }}
    >
      {alerts.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">No active alerts</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                All systems are running normally
              </Text>
            </Space>
          }
        />
      ) : (
        <Table
          columns={alertColumns}
          dataSource={alerts}
          pagination={false}
          size="middle"
        />
      )}
    </Card>
  );
}

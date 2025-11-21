import { Card, Descriptions, Tag, Typography, Space } from 'antd';
import { InfoCircleOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { memo, useMemo, useCallback } from 'react';
import type { SystemHealth } from '../../../../services/health.Service';
import { HEALTH_COLORS } from '../config';

const { Text } = Typography;

interface SystemInfoProps {
  health: SystemHealth | null;
  loading: boolean;
}

export const SystemInfo = memo(({ health, loading }: SystemInfoProps) => {
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  const formatUptime = useCallback((seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  }, []);

  const uptimeDisplay = useMemo(() => 
    health ? formatUptime(health.uptime) : '--',
    [health, formatUptime]
  );

  const memoryDisplay = useMemo(() => {
    if (!health) return null;
    const memory = health.checks?.memory;
    return {
      rss: formatBytes(memory?.usage?.rss ? memory.usage.rss * 1024 * 1024 : 0),
      heapTotal: formatBytes(memory?.usage?.heapTotal ? memory.usage.heapTotal * 1024 * 1024 : 0),
      heapUsed: formatBytes(memory?.usage?.heapUsed ? memory.usage.heapUsed * 1024 * 1024 : 0)
    };
  }, [health, formatBytes]);

  return (
    <Card 
      loading={loading}
      title={
        <Space>
          <InfoCircleOutlined style={{ fontSize: '20px' }} />
          <span>System Information</span>
        </Space>
      }
      bordered={false}
      style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Descriptions column={1} size="small">
        <Descriptions.Item label="System Uptime">
          <Space>
            <ThunderboltOutlined style={{ color: HEALTH_COLORS.EXCELLENT }} />
            <Text strong>{uptimeDisplay}</Text>
          </Space>
        </Descriptions.Item>
        
        <Descriptions.Item label="Database Status">
          {health?.checks?.database?.status === 'OK' ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Connected</Tag>
          ) : (
            <Tag color="error">Disconnected</Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Redis Status">
          {health?.checks?.redis?.status === 'OK' ? (
            <Tag icon={<CheckCircleOutlined />} color="success">Connected</Tag>
          ) : health?.checks?.redis?.status === 'NOT_CONFIGURED' ? (
            <Tag color="default">Not Configured</Tag>
          ) : (
            <Tag color="error">Disconnected</Tag>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Memory Details">
          {memoryDisplay ? (
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                RSS: <Text strong>{memoryDisplay.rss}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Heap Total: <Text strong>{memoryDisplay.heapTotal}</Text>
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Heap Used: <Text strong>{memoryDisplay.heapUsed}</Text>
              </Text>
            </Space>
          ) : (
            <Text type="secondary">--</Text>
          )}
        </Descriptions.Item>

        <Descriptions.Item label="Environment">
          <Tag color="blue">{health?.environment || 'Unknown'}</Tag>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
});

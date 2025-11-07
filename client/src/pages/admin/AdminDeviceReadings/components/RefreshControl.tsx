import { Button, Space, Typography, Tooltip } from 'antd';
import { ReloadOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { memo } from 'react';

const { Text } = Typography;

interface RefreshControlProps {
  onRefresh: () => void;
  loading: boolean;
  lastUpdate: Date | null;
}

export const RefreshControl = memo(({ onRefresh, loading, lastUpdate }: RefreshControlProps) => {
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Space>
      {lastUpdate && (
        <Tooltip title={lastUpdate.toLocaleString()}>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            <ClockCircleOutlined style={{ marginRight: 6 }} />
            Updated {getTimeAgo(lastUpdate)}
          </Text>
        </Tooltip>
      )}
      <Button
        icon={<ReloadOutlined spin={loading} />}
        onClick={onRefresh}
        loading={loading}
        type="default"
      >
        Refresh
      </Button>
    </Space>
  );
});

RefreshControl.displayName = 'RefreshControl';

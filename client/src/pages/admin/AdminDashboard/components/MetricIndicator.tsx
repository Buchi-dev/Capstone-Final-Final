import { Card, Progress, Space, Typography, Tooltip } from 'antd';
import { memo } from 'react';

const { Text } = Typography;

interface MetricIndicatorProps {
  title: string;
  percent: number;
  icon: React.ReactNode;
  tooltip?: string;
  loading?: boolean;
  inverse?: boolean; // For metrics where higher is worse (like RAM usage)
}

export const MetricIndicator = memo<MetricIndicatorProps>(({ 
  title, 
  percent, 
  icon, 
  tooltip,
  loading = false,
  inverse = false
}) => {
  const getHealthColor = (value: number) => {
    // For inverse metrics (like RAM usage), invert the color logic
    const effectiveValue = inverse ? (100 - value) : value;
    
    if (effectiveValue >= 80) return '#52c41a'; // Green
    if (effectiveValue >= 60) return '#faad14'; // Orange
    if (effectiveValue >= 40) return '#fa8c16'; // Dark Orange
    return '#ff4d4f'; // Red
  };

  const content = (
    <Card 
      size="small"
      loading={loading}
      style={{ 
        backgroundColor: '#fafafa',
        borderLeft: `4px solid ${getHealthColor(percent)}`,
        height: '90px', // Fixed height for consistency
        display: 'flex',
        alignItems: 'center'
      }}
      bodyStyle={{ 
        width: '100%',
        padding: '12px 16px'
      }}
    >
      <Space 
        style={{ 
          width: '100%', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Space align="center">
          <div style={{ 
            fontSize: '24px', 
            color: getHealthColor(percent),
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            {icon}
          </div>
          <div>
            <Text type="secondary" style={{ 
              fontSize: '12px', 
              display: 'block',
              lineHeight: '1.2',
              marginBottom: '4px'
            }}>
              {title}
            </Text>
            <Text strong style={{ 
              fontSize: '20px',
              lineHeight: '1.2'
            }}>
              {percent}%
            </Text>
          </div>
        </Space>
        <Progress 
          type="circle" 
          percent={percent} 
          strokeColor={getHealthColor(percent)}
          width={48}
          strokeWidth={6}
          format={() => ''}
        />
      </Space>
    </Card>
  );

  return tooltip ? (
    <Tooltip title={tooltip}>
      {content}
    </Tooltip>
  ) : content;
});

MetricIndicator.displayName = 'MetricIndicator';

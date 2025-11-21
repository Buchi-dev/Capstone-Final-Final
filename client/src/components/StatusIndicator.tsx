/**
 * Status Indicator Components
 * Reusable components for displaying status with theme-aware colors
 */

import { CheckCircleOutlined, WarningOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useThemeToken } from '../theme';

interface StatusIconProps {
  status: 'good' | 'warning' | 'critical';
  style?: React.CSSProperties;
}

/**
 * Status Icon with theme colors
 */
export const StatusIcon = ({ status, style }: StatusIconProps) => {
  const token = useThemeToken();
  
  switch (status) {
    case 'good':
      return <CheckCircleOutlined style={{ color: token.colorSuccess, ...style }} />;
    case 'warning':
      return <WarningOutlined style={{ color: token.colorWarning, ...style }} />;
    case 'critical':
      return <ExclamationCircleOutlined style={{ color: token.colorError, ...style }} />;
    default:
      return null;
  }
};



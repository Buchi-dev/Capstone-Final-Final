import { Card, Space, Input, Select, Button, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { AlertFiltersExtended } from '../../../../schemas';

const { Text } = Typography;

interface AlertFiltersProps {
  filters: AlertFiltersExtended;
  onFiltersChange: (filters: AlertFiltersExtended) => void;
  onClearFilters: () => void;
  totalAlerts: number;
  filteredCount: number;
}

/**
 * Alert Filters Component
 * Provides filter controls for alerts list
 */
export const AlertFilters: React.FC<AlertFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  totalAlerts,
  filteredCount,
}) => {
  return (
    <Card style={{ marginBottom: 16 }}>
      <Space wrap>
        <Input
          placeholder="Search alerts..."
          prefix={<SearchOutlined />}
          style={{ width: 250 }}
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          allowClear
        />
        <Select
          mode="multiple"
          placeholder="Severity"
          style={{ minWidth: 150 }}
          value={filters.severity}
          onChange={(value) => onFiltersChange({ ...filters, severity: value })}
          options={[
            { label: 'Critical', value: 'Critical' },
            { label: 'Warning', value: 'Warning' },
            { label: 'Advisory', value: 'Advisory' },
          ]}
        />
        <Select
          mode="multiple"
          placeholder="Status"
          style={{ minWidth: 150 }}
          value={filters.status}
          onChange={(value) => onFiltersChange({ ...filters, status: value })}
          options={[
            { label: 'Active', value: 'Active' },
            { label: 'Acknowledged', value: 'Acknowledged' },
            { label: 'Resolved', value: 'Resolved' },
          ]}
        />
        <Select
          mode="multiple"
          placeholder="Parameter"
          style={{ minWidth: 150 }}
          value={filters.parameter}
          onChange={(value) => onFiltersChange({ ...filters, parameter: value })}
          options={[
            { label: 'TDS', value: 'tds' },
            { label: 'pH', value: 'ph' },
            { label: 'Turbidity', value: 'turbidity' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={onClearFilters}>
          Clear Filters
        </Button>
        <Text type="secondary">
          Showing {filteredCount} of {totalAlerts} alerts
        </Text>
      </Space>
    </Card>
  );
};

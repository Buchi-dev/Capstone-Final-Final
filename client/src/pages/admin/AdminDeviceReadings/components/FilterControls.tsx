import { Select, Space, Input, Row, Col } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { memo } from 'react';

interface FilterControlsProps {
  severityFilter: string;
  statusFilter: string;
  searchTerm: string;
  onSeverityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export const FilterControls = memo(({
  severityFilter,
  statusFilter,
  searchTerm,
  onSeverityChange,
  onStatusChange,
  onSearchChange,
}: FilterControlsProps) => {
  return (
    <Row gutter={[12, 12]} align="middle">
      <Col>
        <FilterOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
      </Col>
      <Col flex="auto">
        <Space wrap>
          <Select
            placeholder="Severity Level"
            value={severityFilter}
            onChange={onSeverityChange}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="all">All Severity</Select.Option>
            <Select.Option value="critical">Critical</Select.Option>
            <Select.Option value="warning">Warning</Select.Option>
            <Select.Option value="normal">Normal</Select.Option>
            <Select.Option value="offline">Offline</Select.Option>
          </Select>

          <Select
            placeholder="Device Status"
            value={statusFilter}
            onChange={onStatusChange}
            style={{ width: 150 }}
            allowClear
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="online">Online</Select.Option>
            <Select.Option value="offline">Offline</Select.Option>
            <Select.Option value="error">Error</Select.Option>
            <Select.Option value="maintenance">Maintenance</Select.Option>
          </Select>

          <Input
            placeholder="Search devices..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
        </Space>
      </Col>
    </Row>
  );
});

FilterControls.displayName = 'FilterControls';

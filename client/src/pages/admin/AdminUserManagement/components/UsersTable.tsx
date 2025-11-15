/**
 * Users Table Component
 * Displays users in a table with filtering, sorting, and actions
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Typography,
  Tooltip,
  Avatar,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { FilterValue, SorterResult } from 'antd/es/table/interface';
import {
  SearchOutlined,
  CheckCircleOutlined,
  StopOutlined,
  ClockCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import type { UserListData, UserRole, UserStatus } from '../../../../schemas';
import dayjs from 'dayjs';

const { Text } = Typography;

interface UsersTableProps {
  users: UserListData[];
  loading: boolean;
  onViewUser: (user: UserListData) => void;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  loading,
  onViewUser,
}) => {
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'All'>('All');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    showSizeChanger: true,
    showTotal: (total) => `Total ${total} users`,
  });

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const searchLower = searchText.toLowerCase();
      const matchesSearch =
        !searchText ||
        user.firstname.toLowerCase().includes(searchLower) ||
        user.lastname.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;

      // Role filter
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchText, statusFilter, roleFilter]);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Pending':
        return 'warning';
      case 'Suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleOutlined />;
      case 'Pending':
        return <ClockCircleOutlined />;
      case 'Suspended':
        return <StopOutlined />;
      default:
        return null;
    }
  };

  const getRoleColor = (role: UserRole) => {
    return role === 'Admin' ? 'blue' : 'default';
  };

  const getInitials = (firstname: string, lastname: string) => {
    return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
  };

  const columns: ColumnsType<UserListData> = [
    {
      title: 'User',
      key: 'user',
      width: 280,
      fixed: 'left',
      sorter: (a, b) => a.lastname.localeCompare(b.lastname),
      render: (_, record) => (
        <Space size="middle">
          <Avatar
            style={{
              backgroundColor: record.role === 'Admin' ? '#1890ff' : '#52c41a',
              verticalAlign: 'middle',
            }}
            size="large"
          >
            {getInitials(record.firstname, record.lastname)}
          </Avatar>
          <div>
            <div>
              <Text strong>
                {record.firstname} {record.middlename} {record.lastname}
              </Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      width: 150,
      align: 'center',
      sorter: (a, b) => a.department.localeCompare(b.department),
      render: (department) => <Text>{department}</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      width: 150,
      align: 'center',
      render: (phone) => <Text>{phone || 'N/A'}</Text>,
    },
    {
      title: 'Status & Role',
      key: 'statusRole',
      width: 180,
      align: 'center',
      filters: [
        { text: 'Approved', value: 'Approved' },
        { text: 'Pending', value: 'Pending' },
        { text: 'Suspended', value: 'Suspended' },
        { text: 'Admin', value: 'Admin' },
        { text: 'Staff', value: 'Staff' },
      ],
      onFilter: (value, record) => record.status === value || record.role === value,
      render: (_, record) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Tag 
            icon={getStatusIcon(record.status)} 
            color={getStatusColor(record.status)}
            style={{ 
              width: '100%', 
              textAlign: 'center',
              fontSize: '13px',
              padding: '4px 8px',
              margin: 0,
            }}
          >
            {record.status}
          </Tag>
          <Tag 
            color={getRoleColor(record.role)}
            style={{ 
              width: '100%', 
              textAlign: 'center',
              fontSize: '12px',
              padding: '2px 8px',
              margin: 0,
            }}
          >
            {record.role}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      align: 'center',
      sorter: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      render: (date: Date) => (
        <Tooltip title={dayjs(date).format('MMM DD, YYYY h:mm A')}>
          <Text type="secondary">{dayjs(date).format('MMM DD, YYYY')}</Text>
        </Tooltip>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      width: 130,
      align: 'center',
      sorter: (a, b) => {
        if (!a.lastLogin) return 1;
        if (!b.lastLogin) return -1;
        return a.lastLogin.getTime() - b.lastLogin.getTime();
      },
      render: (date?: Date) =>
        date ? (
          <Tooltip title={dayjs(date).format('MMM DD, YYYY h:mm A')}>
            <Text type="secondary">{dayjs(date).format('MMM DD, YYYY')}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">Never</Text>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => onViewUser(record)}
          size="middle"
        >
          View
        </Button>
      ),
    },
  ];

  const handleTableChange = (
    newPagination: TablePaginationConfig,
    _filters: Record<string, FilterValue | null>,
    _sorter: SorterResult<UserListData> | SorterResult<UserListData>[]
  ) => {
    setPagination(newPagination);
  };

  return (
    <div>
      {/* Filters Section */}
      <Space size="middle" style={{ marginBottom: 16, width: '100%', flexWrap: 'wrap' }}>
        <Input
          placeholder="Search by name, email, or department..."
          prefix={<SearchOutlined />}
          allowClear
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          size="large"
        />
        <Select
          placeholder="Filter by Status"
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 150 }}
          size="large"
        >
          <Select.Option value="All">All Statuses</Select.Option>
          <Select.Option value="Approved">Approved</Select.Option>
          <Select.Option value="Pending">Pending</Select.Option>
          <Select.Option value="Suspended">Suspended</Select.Option>
        </Select>
        <Select
          placeholder="Filter by Role"
          value={roleFilter}
          onChange={setRoleFilter}
          style={{ width: 150 }}
          size="large"
        >
          <Select.Option value="All">All Roles</Select.Option>
          <Select.Option value="Admin">Admin</Select.Option>
          <Select.Option value="Staff">Staff</Select.Option>
        </Select>
      </Space>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        rowKey="id"
        scroll={{ x: 1300 }}
        bordered
      />
    </div>
  );
};

/**
 * Admin User Management Page
 *
 * Comprehensive user management interface with:
 * - Real-time user data updates
 * - User statistics dashboard
 * - Advanced filtering and search
 * - Quick actions and bulk operations
 * - User editing with role and status management
 *
 * @module pages/admin/AdminUserManagement
 */

import React, { useState } from "react";
import {
  Layout,
  Typography,
  Space,
  Button,
  Card,
  Alert,
  Spin,
  Empty,
  Breadcrumb,
  theme,
  message,
} from "antd";
import {
  UserOutlined,
  ReloadOutlined,
  PlusOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useUsers, useUserMutations } from "../../../hooks";
import { UsersTable } from "./components/UsersTable";
import { UserActionsDrawer } from "./components/UserActionsDrawer";
import { UsersStatistics } from "./components/UsersStatistics";
import type { UserListData, UserRole, UserStatus } from "../../../schemas";

import { AdminLayout } from "../../../components/layouts/AdminLayout";
import { useAuth } from "../../../contexts/AuthContext";

const { Title, Text } = Typography;
const { Content } = Layout;

export const AdminUserManagement: React.FC = () => {
  const { token } = theme.useToken();
  const { user: userProfile } = useAuth();
  
  // Global READ hook - Real-time user data
  const { 
    users, 
    isLoading: loading, 
    error: realtimeError,
    refetch 
  } = useUsers({ pollInterval: 15000 });

  // Global WRITE hook - User operations
  const {
    updateUserRole,
    updateUserStatus,
    updateUserProfile,
    deleteUser,
    isLoading: refreshing,
    error: writeError,
  } = useUserMutations();

  // Combine errors
  const error = realtimeError?.message || writeError?.message || null;

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListData | null>(null);

  /**
   * Auto-logout handler when user changes their own role/status
   * (No longer needed - updateResult removed from useUserMutations)
   */
  // Removed auto-logout effect - handled by backend responses

  // Handle view user (opens drawer)
  const handleViewUser = (user: UserListData) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  // Handle close drawer
  const handleCloseDrawer = () => {
    setDrawerVisible(false);
    setSelectedUser(null);
  };

  // Handle save user profile
  const handleSaveUser = async (
    userId: string,
    profileData: {
      firstName: string;
      middleName: string;
      lastName: string;
      department: string;
      phoneNumber: string;
    }
  ) => {
    try {
      await updateUserProfile(userId, profileData);
      message.success('User profile updated successfully');
      // Update selected user with new data
      if (selectedUser) {
        setSelectedUser({
          ...selectedUser,
          ...profileData,
        });
      }
      await refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update user profile');
      throw error; // Re-throw to prevent drawer from closing
    }
  };

  // Handle quick status change
  const handleQuickStatusChange = async (
    userId: string,
    status: UserStatus
  ) => {
    try {
      await updateUserStatus(userId, { status });
      message.success(`User status updated to ${status}`);
      await refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update user status');
    }
  };

  // Handle quick role change
  const handleQuickRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, { role });
      message.success(`User role updated to ${role}`);
      await refetch();
    } catch (error: any) {
      message.error(error.message || 'Failed to update user role');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string, userName: string) => {
    try {
      await deleteUser(userId);
      message.success(`User "${userName}" deleted successfully`);
    } catch (error: any) {
      message.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <AdminLayout>
      <Layout style={{ minHeight: "100vh", background: token.colorBgLayout }}>
        <Content style={{ padding: "24px 24px" }}>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                {
                  href: "/",
                  title: (
                    <>
                      <HomeOutlined />
                      <span>Home</span>
                    </>
                  ),
                },
                {
                  title: (
                    <>
                      <UserOutlined />
                      <span>User Management</span>
                    </>
                  ),
                },
              ]}
            />

            {/* Page Header */}
            <Card bordered={false}>
              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <Space
                  style={{
                    width: "100%",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Title level={2} style={{ margin: 0 }}>
                      <UserOutlined style={{ marginRight: 12 }} />
                      User Management
                    </Title>
                    <Text type="secondary">
                      Manage user accounts, roles, and permissions
                    </Text>
                  </div>
                  <Space size="middle">
                    <Button
                      icon={<ReloadOutlined spin={refreshing} />}
                      onClick={() => window.location.reload()}
                      disabled={loading || refreshing}
                    >
                      Refresh
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      disabled
                      title="Users are created through registration"
                    >
                      Add User
                    </Button>
                  </Space>
                </Space>
              </Space>
            </Card>

            {/* Error Alert */}
            {error && (
              <Alert
                message="Error Loading Users"
                description={error}
                type="error"
                showIcon
                closable
              />
            )}

            {/* Statistics Cards */}
            <UsersStatistics users={users} loading={loading} />

            {/* Users Table */}
            <Card
              bordered={false}
              bodyStyle={{ padding: 24 }}
              title={
                <Space>
                  <UserOutlined />
                  <span>All Users ({users.length})</span>
                </Space>
              }
            >
              {loading && users.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <Spin size="large" tip="Loading users..." />
                </div>
              ) : users.length === 0 ? (
                <Empty
                  description="No users found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <UsersTable
                  users={users}
                  loading={refreshing}
                  onViewUser={handleViewUser}
                />
              )}
            </Card>
          </Space>

          {/* User Actions Drawer */}
          <UserActionsDrawer
            open={drawerVisible}
            user={selectedUser}
            currentUserId={userProfile?.id || ''}
            onClose={handleCloseDrawer}
            onSaveProfile={handleSaveUser}
            onQuickStatusChange={handleQuickStatusChange}
            onQuickRoleChange={handleQuickRoleChange}
            onDelete={handleDeleteUser}
            loading={refreshing}
          />
        </Content>
      </Layout>
    </AdminLayout>
  );
};

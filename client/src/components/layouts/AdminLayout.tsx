import { useState } from 'react';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  theme,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  DatabaseOutlined,
  BellOutlined,
  LogoutOutlined,
  ProfileOutlined,
  TeamOutlined,
  BarChartOutlined,
  FileTextOutlined,
  ApiOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Sidebar menu items
  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'devices',
      icon: <ApiOutlined />,
      label: 'Devices',
      children: [
        {
          key: 'devices-list',
          label: 'Device List',
        },
        {
          key: 'devices-config',
          label: 'Configuration',
        },
      ],
    },
    {
      key: 'data',
      icon: <DatabaseOutlined />,
      label: 'Data Management',
      children: [
        {
          key: 'data-view',
          label: 'View Data',
        },
        {
          key: 'data-export',
          label: 'Export Data',
        },
      ],
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'User Management',
    },
    {
      key: 'reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        {
          key: 'settings-general',
          label: 'General',
        },
        {
          key: 'settings-security',
          label: 'Security',
        },
        {
          key: 'settings-notifications',
          label: 'Notifications',
        },
      ],
    },
  ];

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <ProfileOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    console.log('Menu clicked:', e.key);
    // Add your navigation logic here
  };

  const handleUserMenuClick: MenuProps['onClick'] = (e) => {
    console.log('User menu clicked:', e.key);
    if (e.key === 'logout') {
      // Add logout logic here
      console.log('Logging out...');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          console.log('Breakpoint:', broken);
        }}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {!collapsed ? (
            <Text strong style={{ color: '#fff', fontSize: '18px' }}>
              Admin Panel
            </Text>
          ) : (
            <Text strong style={{ color: '#fff', fontSize: '18px' }}>
              AP
            </Text>
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['dashboard']}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ marginTop: 8 }}
        />
      </Sider>

      {/* Main Layout */}
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {/* Left side - Toggle button */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          {/* Right side - Notifications & User */}
          <Space size="large">
            {/* Notifications */}
            <Badge count={5} size="small">
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: '18px' }} />}
                size="large"
              />
            </Badge>

            {/* User Profile */}
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              arrow
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size="default"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#001f3f' }}
                />
                <Text strong>Admin User</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>

        {/* Footer */}
        <Footer style={{ textAlign: 'center' }}>
          Admin Panel ©{new Date().getFullYear()} • Capstone System
        </Footer>
      </Layout>
    </Layout>
  );
};
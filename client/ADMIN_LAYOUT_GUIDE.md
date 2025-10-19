# Admin Layout Documentation

## Overview

The Admin Layout is a comprehensive dashboard layout built with Ant Design's Layout component. It features a collapsible sidebar, header with user menu, and responsive design.

## Features

✅ **Collapsible Sidebar** - Toggle between expanded and collapsed states
✅ **Responsive Design** - Adapts to different screen sizes
✅ **Fixed Sidebar** - Sidebar stays fixed while scrolling
✅ **Sticky Header** - Header remains visible when scrolling
✅ **User Dropdown** - Profile menu with settings and logout
✅ **Notifications Badge** - Bell icon with notification count
✅ **Nested Menu Items** - Support for submenus
✅ **Navy Blue Theme** - Matches your brand colors

## File Structure

```
src/
├── components/
│   └── layouts/
│       ├── AdminLayout.tsx    # Main layout component
│       └── index.ts           # Exports
└── pages/
    └── AdminDashboard.tsx     # Example dashboard page
```

## Usage

### Basic Usage

```tsx
import { AdminLayout } from './components/layouts';

const MyPage = () => {
  return (
    <AdminLayout>
      <h1>Your Content Here</h1>
    </AdminLayout>
  );
};
```

### With Custom Page

```tsx
import { AdminLayout } from './components/layouts';
import { Card, Typography } from 'antd';

const CustomPage = () => {
  return (
    <AdminLayout>
      <Card title="My Custom Page">
        <Typography.Text>
          This content will be displayed inside the admin layout
        </Typography.Text>
      </Card>
    </AdminLayout>
  );
};
```

## Components

### AdminLayout Props

| Prop     | Type          | Required | Description                    |
|----------|---------------|----------|--------------------------------|
| children | React.ReactNode | Yes    | Content to display in the main area |

### Sidebar Menu Configuration

The sidebar menu is configured in the `menuItems` array:

```tsx
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
  // ... more items
];
```

#### Adding New Menu Items

1. Open `src/components/layouts/AdminLayout.tsx`
2. Add a new item to the `menuItems` array:

```tsx
{
  key: 'my-new-page',
  icon: <YourIcon />,
  label: 'My New Page',
}
```

3. Handle navigation in `handleMenuClick`:

```tsx
const handleMenuClick: MenuProps['onClick'] = (e) => {
  console.log('Menu clicked:', e.key);
  
  // Add your routing logic here
  if (e.key === 'my-new-page') {
    // Navigate to your page
  }
};
```

### User Menu Configuration

The user dropdown menu is configured in `userMenuItems`:

```tsx
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
```

## Customization

### Change Logo Text

```tsx
<Text strong style={{ color: '#fff', fontSize: '18px' }}>
  Your App Name  {/* Change this */}
</Text>
```

### Adjust Sidebar Width

```tsx
<Sider
  trigger={null}
  collapsible
  collapsed={collapsed}
  width={250}  {/* Default is 200 */}
  collapsedWidth={80}  {/* Default is 80 */}
  // ... other props
>
```

### Change Header Height

```tsx
<div style={{
  height: 80,  {/* Default is 64 */}
  // ... other styles
}}>
```

### Custom User Info

Replace the hardcoded user info with dynamic data:

```tsx
<Space style={{ cursor: 'pointer' }}>
  <Avatar
    size="default"
    icon={<UserOutlined />}
    src={user.avatar}  {/* Add user avatar */}
    style={{ backgroundColor: '#001f3f' }}
  />
  <Text strong>{user.name}</Text>  {/* Add user name */}
</Space>
```

## Navigation Integration

To integrate with React Router:

```tsx
import { useNavigate } from 'react-router-dom';

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    // Route mapping
    const routes = {
      'dashboard': '/admin/dashboard',
      'devices-list': '/admin/devices',
      'devices-config': '/admin/devices/config',
      'analytics': '/admin/analytics',
      // ... add more routes
    };
    
    if (routes[e.key]) {
      navigate(routes[e.key]);
    }
  };
  
  // ... rest of component
};
```

## Responsive Behavior

### Breakpoints

- **Desktop** (>= 992px): Sidebar expanded by default
- **Tablet** (768px - 991px): Sidebar collapsed by default
- **Mobile** (< 768px): Sidebar collapsed, overlay mode

### Auto-collapse on Mobile

The layout automatically handles breakpoints:

```tsx
<Sider
  breakpoint="lg"
  onBreakpoint={(broken) => {
    console.log('Breakpoint:', broken);
    // Add custom logic here
  }}
>
```

## Styling

### Global Styles

The layout uses Ant Design's theme tokens for consistent styling:

```tsx
const {
  token: { colorBgContainer, borderRadiusLG },
} = theme.useToken();
```

### Custom Styles

You can override styles using inline styles or CSS classes:

```tsx
<Content
  style={{
    margin: '24px 16px',
    padding: 24,
    background: colorBgContainer,
    borderRadius: borderRadiusLG,
  }}
  className="custom-content-class"
>
```

## Dashboard Example

The `AdminDashboard.tsx` file provides a complete example with:

- **Statistics Cards** - Key metrics with icons
- **System Health** - Progress bars for resource monitoring
- **Quick Stats** - Additional metrics
- **Data Table** - Device list with status tags

### Key Components Used

- `Card` - Content containers
- `Row` & `Col` - Responsive grid layout
- `Statistic` - Display metrics
- `Progress` - Show percentages
- `Table` - Data tables
- `Tag` - Status indicators

## Best Practices

1. **Keep Menu Items Organized**: Group related items under submenus
2. **Use Semantic Icons**: Choose icons that represent the function
3. **Implement Proper Navigation**: Connect menu items to routes
4. **Handle User Actions**: Implement logout and profile functions
5. **Add Loading States**: Show loading indicators during data fetch
6. **Error Handling**: Display error messages when needed
7. **Accessibility**: Ensure keyboard navigation works

## Common Tasks

### Add a New Page

1. Create your page component:
```tsx
// src/pages/MyNewPage.tsx
import { AdminLayout } from '../components/layouts';

const MyNewPage = () => {
  return (
    <AdminLayout>
      <h1>My New Page</h1>
    </AdminLayout>
  );
};

export default MyNewPage;
```

2. Add menu item in `AdminLayout.tsx`
3. Set up routing in your router
4. Handle navigation in `handleMenuClick`

### Update User Profile

```tsx
// In a parent component or context
const [user, setUser] = useState({
  name: 'Admin User',
  avatar: '/path/to/avatar.jpg',
  role: 'Administrator',
});

// Pass to AdminLayout
<AdminLayout user={user}>
  {children}
</AdminLayout>
```

### Add Breadcrumbs

```tsx
import { Breadcrumb } from 'antd';

<Content style={{ margin: '24px 16px' }}>
  <Breadcrumb style={{ margin: '16px 0' }}>
    <Breadcrumb.Item>Home</Breadcrumb.Item>
    <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
  </Breadcrumb>
  
  {children}
</Content>
```

## Troubleshooting

### Sidebar not collapsing
- Check if `collapsed` state is being updated
- Verify the trigger button click handler

### Menu items not clickable
- Ensure `onClick` handler is attached
- Check for overlapping elements

### Layout breaks on mobile
- Verify responsive breakpoints
- Check that `marginLeft` adjusts with sidebar state

## Resources

- [Ant Design Layout](https://ant.design/components/layout)
- [Ant Design Menu](https://ant.design/components/menu)
- [Ant Design Icons](https://ant.design/components/icon)
- [React Router Integration](https://reactrouter.com/)

## Next Steps

1. ✅ Set up routing (React Router)
2. ✅ Connect to authentication
3. ✅ Implement user profile management
4. ✅ Add more pages
5. ✅ Create reusable components
6. ✅ Add state management (Redux/Context)

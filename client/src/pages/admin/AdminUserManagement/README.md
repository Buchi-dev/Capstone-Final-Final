# Admin User Management

A comprehensive user management interface built with Ant Design for managing user accounts, roles, and permissions.

## 📋 Features

### Real-time Updates
- **Live Data Synchronization**: Automatically updates when user data changes using Firebase Firestore real-time listeners
- **Instant Feedback**: All changes are reflected immediately across the interface

### User Statistics Dashboard
- **Total Users**: Overview of all registered users
- **Approved Users**: Count and percentage of approved users
- **Pending Approval**: Users awaiting admin approval
- **Suspended Users**: Count of suspended accounts
- **Administrators**: Number and percentage of admin users
- **Staff Members**: Count of staff-level users

### Advanced User Table
- **Sortable Columns**: Sort by name, department, created date, last login
- **Multi-level Filtering**: 
  - Search by name, email, or department
  - Filter by status (Approved, Pending, Suspended)
  - Filter by role (Admin, Staff)
- **Pagination**: Configurable page size with total count display
- **User Avatars**: Color-coded initials based on role
- **Responsive Design**: Horizontal scroll on smaller screens

### User Management Actions
- **Edit User Modal**: Comprehensive user editing interface
  - View full user information
  - Update status (Pending, Approved, Suspended)
  - Update role (Admin, Staff)
- **Quick Actions**: Dropdown menu with instant actions
  - Approve user
  - Suspend user
  - Promote to Admin
  - Demote to Staff

## 🏗️ Architecture

### Component Structure
```
AdminUserManagement/
├── AdminUserManagement.tsx      # Main page component
├── components/
│   ├── UsersTable.tsx           # User data table with filtering
│   ├── UserEditModal.tsx        # User editing modal
│   ├── UsersStatistics.tsx      # Statistics cards
│   └── index.ts                 # Component exports
└── hooks/
    ├── useUserManagement.ts     # User management hook
    └── index.ts                 # Hook exports
```

### Data Flow
```
Firebase Firestore (users collection)
    ↓ (real-time onSnapshot)
useUserManagement Hook
    ↓ (state management)
AdminUserManagement Page
    ↓ (props)
UsersTable / UserEditModal / UsersStatistics
    ↓ (user actions)
userManagementService
    ↓ (Firebase Functions)
Backend (UserCalls function)
```

## 🎨 Visual Hierarchy

### Page Layout
1. **Breadcrumb Navigation**: Home > User Management
2. **Page Header**: Title, description, and action buttons
3. **Statistics Dashboard**: 6 metric cards with visual indicators
4. **Users Table Card**: Comprehensive user listing with filters

### Color Coding
- **Status Tags**:
  - 🟢 Approved: Green (`success`)
  - 🟡 Pending: Yellow (`warning`)
  - 🔴 Suspended: Red (`error`)
- **Role Tags**:
  - 🔵 Admin: Blue
  - ⚪ Staff: Default gray
- **Avatars**:
  - 🔵 Admin: Blue background
  - 🟢 Staff: Green background

## 📱 Responsive Design

### Breakpoints
- **xs** (< 576px): Stacked statistics, simplified table
- **sm** (≥ 576px): 2-column statistics layout
- **md** (≥ 768px): Enhanced table features
- **lg** (≥ 992px): 6-column statistics, full table
- **xl** (≥ 1200px): Optimal desktop experience

### Mobile Optimizations
- Horizontal scrolling for table
- Touch-friendly action buttons
- Responsive filter layout
- Simplified statistics cards

## 🔧 Usage

### Basic Implementation
```tsx
import { AdminUserManagement } from './pages/admin/AdminUserManagement';

function App() {
  return <AdminUserManagement />;
}
```

### Hook Usage
```tsx
import { useUserManagement } from './hooks';

function CustomUserComponent() {
  const {
    users,              // Array of user data
    loading,            // Initial loading state
    error,              // Error message if any
    updateUser,         // Update user status/role
    updateUserStatus,   // Update only status
    updateUserRole,     // Update only role
    refreshing,         // Action in progress state
  } = useUserManagement();

  // Use the data and actions...
}
```

## 🎯 User Actions

### Edit User
1. Click "Edit" button on any user row
2. Modal opens with current user information
3. Modify status and/or role
4. Click "Save Changes"

### Quick Status Change
1. Click dropdown menu (three dots) on user row
2. Select "Change Status"
3. Choose new status (Approve/Suspend)
4. Change applies immediately

### Quick Role Change
1. Click dropdown menu (three dots) on user row
2. Select "Change Role"
3. Choose new role (Admin/Staff)
4. Change applies immediately

## 🔒 Security

### Access Control
- Only Admin users can access this page
- Protected by `ProtectedRoute` component
- Backend validates user permissions

### Self-Protection
- Users cannot suspend themselves
- Users cannot demote themselves from Admin
- Backend enforces these rules

## 🚀 Performance

### Optimizations
- **Real-time Listeners**: Efficient Firebase onSnapshot subscriptions
- **Memoization**: useMemo for filtered user data
- **Lazy Loading**: Table pagination reduces initial render
- **Component Splitting**: Modular architecture for code splitting

### Best Practices
- Automatic cleanup of Firebase listeners on unmount
- Debounced search input (via Ant Design)
- Optimistic UI updates with error rollback

## 📊 Statistics Calculations

### Metrics
- **Total Users**: Total count of all users
- **Approved**: `status === 'Approved'`
- **Pending**: `status === 'Pending'`
- **Suspended**: `status === 'Suspended'`
- **Admins**: `role === 'Admin'`
- **Staff**: `role === 'Staff'`

### Percentages
- **Approval Rate**: (Approved / Total) × 100
- **Admin Ratio**: (Admins / Total) × 100

## 🔍 Filtering & Search

### Search
- Searches across: firstname, lastname, email, department
- Case-insensitive matching
- Real-time filtering

### Filters
- **Status**: All, Approved, Pending, Suspended
- **Role**: All, Admin, Staff
- **Combines with search**: AND logic

### Sorting
- Click column headers to sort
- Supports: User name, Department, Created date, Last login
- Ascending/Descending toggle

## 🎨 Customization

### Theme Integration
```tsx
import { theme } from 'antd';

const { token } = theme.useToken();
// Access theme colors: token.colorPrimary, token.colorBgLayout, etc.
```

### Custom Styling
All components use Ant Design's theme system for consistent styling and dark mode support.

## 📝 Data Model

### UserListData Interface
```typescript
interface UserListData {
  id: string;              // Firestore document ID
  uuid: string;            // User UUID
  firstname: string;       // First name
  lastname: string;        // Last name
  middlename: string;      // Middle name
  department: string;      // Department
  phoneNumber: string;     // Phone number
  email: string;           // Email address
  role: UserRole;          // 'Admin' | 'Staff'
  status: UserStatus;      // 'Pending' | 'Approved' | 'Suspended'
  createdAt: Date;         // Account creation date
  updatedAt?: Date;        // Last update date
  lastLogin?: Date;        // Last login date
}
```

## 🐛 Error Handling

### Error States
- **Loading Errors**: Display error alert with retry option
- **Action Errors**: Show error message via Ant Design message
- **Network Errors**: Auto-retry with token refresh

### User Feedback
- Success messages for all actions
- Error messages with specific details
- Loading states during operations

## 📚 Dependencies

### Required Packages
- `antd`: UI component library
- `react`: React framework
- `firebase`: Firebase SDK
- `dayjs`: Date formatting

### Internal Dependencies
- `userManagementService`: Service layer for API calls
- `AuthContext`: Authentication context
- Type definitions from schemas

## 🔮 Future Enhancements

### Planned Features
- [ ] Bulk user operations (select multiple users)
- [ ] Export user list to CSV/Excel
- [ ] Advanced filtering (date ranges, custom filters)
- [ ] User activity history timeline
- [ ] Email notifications for status changes
- [ ] User profile images/avatars
- [ ] Department management integration

### Potential Improvements
- [ ] Infinite scroll instead of pagination
- [ ] Column customization (show/hide columns)
- [ ] Saved filter presets
- [ ] User import from CSV
- [ ] Two-factor authentication management

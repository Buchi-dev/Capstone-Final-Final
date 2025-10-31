# User Management Service - Usage Guide

## Overview

The `userManagement.Service.ts` provides a clean, type-safe API layer for user management operations. It communicates with the Firebase Callable Function `userManagement` which uses a single function with switch-case routing pattern.

---

## Backend Architecture

### Firebase Function: `userManagement`
**Location:** `functions/src_new/callable/userManagement.ts`

**Pattern:** Single callable function with switch-case routing via `createRoutedFunction`

**Security:**
- ✅ Requires authentication (`requireAuth: true`)
- ✅ Requires admin role (`requireAdmin: true`)
- ✅ Built-in validation for self-modification prevention

**Actions:**
1. **listUsers** - List all users ordered by creation date
2. **updateStatus** - Update user status (Pending/Approved/Suspended)
3. **updateUser** - Update user status and/or role

---

## Frontend Service Layer

### Import
```typescript
import { userManagementService } from '@/services/userManagement.Service';
// or
import userManagementService from '@/services/userManagement.Service';
```

---

## Methods

### 1. List Users
Fetches all users from the system.

```typescript
// Fetch all users
const listUsers = async () => {
  try {
    const result = await userManagementService.listUsers();
    console.log(`Loaded ${result.count} users`);
    console.log(result.users);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

**Response:**
```typescript
{
  success: true,
  users: UserListData[],
  count: number
}
```

---

### 2. Update User Status
Updates the status of a specific user.

```typescript
// Approve a pending user
const approveUser = async (userId: string) => {
  try {
    const result = await userManagementService.updateUserStatus(
      userId,
      'Approved'
    );
    console.log(result.message); // "User status updated to Approved"
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

**Response:**
```typescript
{
  success: true,
  message: string,
  userId: string,
  status: UserStatus
}
```

---

### 3. Update User (Status and/or Role)
Updates user status and/or role.

```typescript
// Update both status and role
const promoteAndApprove = async (userId: string) => {
  try {
    const result = await userManagementService.updateUser(
      userId,
      'Approved',
      'Admin'
    );
    console.log(result.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Update only role
const changeRole = async (userId: string) => {
  try {
    const result = await userManagementService.updateUser(
      userId,
      undefined,
      'Admin'
    );
    console.log(result.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

**Response:**
```typescript
{
  success: true,
  message: string,
  userId: string,
  updates: {
    status?: UserStatus,
    role?: UserRole
  }
}
```

---

## Convenience Methods

### Approve User
```typescript
await userManagementService.approveUser('user123');
// Equivalent to: updateUserStatus('user123', 'Approved')
```

### Suspend User
```typescript
await userManagementService.suspendUser('user123');
// Equivalent to: updateUserStatus('user123', 'Suspended')
```

### Reactivate User
```typescript
await userManagementService.reactivateUser('user123');
// Equivalent to: updateUserStatus('user123', 'Approved')
```

### Promote to Admin
```typescript
await userManagementService.promoteToAdmin('user123');
// Equivalent to: updateUser('user123', undefined, 'Admin')
```

### Demote to Staff
```typescript
await userManagementService.demoteToStaff('user123');
// Equivalent to: updateUser('user123', undefined, 'Staff')
```

---

## Error Handling

The service automatically transforms Firebase Function errors into user-friendly messages.

```typescript
try {
  await userManagementService.updateUserStatus('user123', 'Approved');
} catch (error: any) {
  // Error structure
  console.error(error.code);    // 'functions/permission-denied'
  console.error(error.message); // 'You do not have permission...'
  console.error(error.details); // Additional error details
}
```

**Error Codes:**
- `functions/unauthenticated` - User not logged in
- `functions/permission-denied` - User lacks admin privileges
- `functions/not-found` - User not found
- `functions/invalid-argument` - Invalid request parameters
- `functions/failed-precondition` - Business logic validation failed
- `functions/internal` - Server error
- `functions/unavailable` - Service temporarily unavailable
- `functions/deadline-exceeded` - Request timeout

---

## React Component Integration

### Before (Direct Firebase Calls)
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const fetchUsers = async () => {
  const functions = getFunctions();
  const listUsersFn = httpsCallable(functions, 'listUsers');
  const result = await listUsersFn();
  // ... handle response
};

const updateStatus = async (userId: string, status: string) => {
  const functions = getFunctions();
  const updateFn = httpsCallable(functions, 'updateUserStatus');
  const result = await updateFn({ userId, status });
  // ... handle response
};
```

### After (Using Service Layer)
```typescript
import { userManagementService } from '@/services/userManagement.Service';

const fetchUsers = async () => {
  const result = await userManagementService.listUsers();
  // ... handle response
};

const updateStatus = async (userId: string, status: UserStatus) => {
  const result = await userManagementService.updateUserStatus(userId, status);
  // ... handle response
};
```

---

## Complete Example: AdminUserManagement Component

```typescript
import { useState, useEffect } from 'react';
import { userManagementService } from '@/services/userManagement.Service';
import type { UserListData } from '@/services/userManagement.Service';
import { message } from 'antd';

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserListData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await userManagementService.listUsers();
      setUsers(result.users);
      message.success(`Loaded ${result.count} users`);
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve user
  const handleApprove = async (userId: string) => {
    try {
      const result = await userManagementService.approveUser(userId);
      message.success(result.message);
      await fetchUsers(); // Refresh list
    } catch (error: any) {
      message.error(error.message);
    }
  };

  // Suspend user
  const handleSuspend = async (userId: string) => {
    try {
      const result = await userManagementService.suspendUser(userId);
      message.success(result.message);
      await fetchUsers(); // Refresh list
    } catch (error: any) {
      message.error(error.message);
    }
  };

  // Update user (status and role)
  const handleUpdateUser = async (
    userId: string,
    status: UserStatus,
    role: UserRole
  ) => {
    try {
      const result = await userManagementService.updateUser(
        userId,
        status,
        role
      );
      message.success(result.message);
      await fetchUsers(); // Refresh list
    } catch (error: any) {
      message.error(error.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      {/* UI components */}
    </div>
  );
};
```

---

## Benefits

### ✅ Separation of Concerns
- API logic separated from UI logic
- Component focuses on rendering and user interactions
- Service handles all backend communication

### ✅ Type Safety
- TypeScript interfaces for all requests and responses
- IntelliSense support in IDE
- Compile-time type checking

### ✅ Reusability
- Service can be used across multiple components
- Consistency across the application
- Single source of truth for API calls

### ✅ Error Handling
- Centralized error transformation
- User-friendly error messages
- Consistent error structure

### ✅ Maintainability
- Easy to update API endpoints
- Easy to add new methods
- Clear documentation with JSDoc

### ✅ Testability
- Service can be easily mocked in tests
- Unit tests can focus on logic
- Integration tests can verify API calls

---

## Migration Checklist

- [x] Backend: Create `userManagement` callable function with switch-case routing
- [x] Backend: Use `createRoutedFunction` utility for clean routing
- [x] Backend: Add authentication and authorization checks
- [x] Frontend: Create `userManagement.Service.ts` service layer
- [x] Frontend: Add type definitions and interfaces
- [x] Frontend: Implement core methods (listUsers, updateUserStatus, updateUser)
- [x] Frontend: Add convenience methods (approveUser, suspendUser, etc.)
- [x] Frontend: Add comprehensive error handling
- [ ] Frontend: Update `AdminUserManagement.tsx` to use service layer
- [ ] Testing: Add unit tests for service methods
- [ ] Testing: Add integration tests for API calls
- [ ] Documentation: Update API documentation

---

## Next Steps

1. **Update AdminUserManagement.tsx**
   - Replace direct `httpsCallable` calls with service methods
   - Remove Firebase Functions initialization from component
   - Simplify error handling using service layer

2. **Add Tests**
   - Unit tests for service methods
   - Mock Firebase Functions for testing
   - Test error handling scenarios

3. **Documentation**
   - Add inline comments for complex logic
   - Update README with API changes
   - Create migration guide for developers

# Admin User Management - Quick Reference Guide

## 🔄 Key Changes Summary

### For Developers

#### 1. **Async Handlers - All handlers now return Promises**
```typescript
// ❌ Old (void)
onDelete: (userId: string, userName: string) => void;

// ✅ New (Promise<void>)
onDelete: (userId: string, userName: string) => Promise<void>;
```

#### 2. **Error Handling - Use centralized utility**
```typescript
import { getErrorMessage } from '../utils/errorHelpers';

try {
  await someOperation();
} catch (error) {
  const errorMsg = getErrorMessage(error); // Normalized message
  message.error(errorMsg);
}
```

#### 3. **Optimistic Updates - Always implement rollback**
```typescript
const previousValue = currentValue;

// Optimistic update
setCurrentValue(newValue);

try {
  await updateOnServer(newValue);
} catch (error) {
  // Rollback on failure
  setCurrentValue(previousValue);
  message.error(getErrorMessage(error));
}
```

#### 4. **Auth Sync - Required after self-modification**
```typescript
if (userId === userProfile?.id) {
  await refetchUser(); // Sync auth context
}
```

#### 5. **Loading States - Prevent double submissions**
```typescript
const [isLoading, setIsLoading] = useState(false);

<Button
  loading={isLoading}
  disabled={isLoading || otherCondition}
  onClick={handleAction}
>
  Action
</Button>
```

---

## 🎨 UI/UX Standards

### Role Colors (Consistent Everywhere)
- **Admin:** `red` (#ff4d4f)
- **Staff:** `blue` (#1890ff)

### Status Colors
- **Active:** `success` (green)
- **Pending:** `warning` (yellow/orange)
- **Suspended:** `error` (red)

### Name Rendering
```typescript
// ✅ Correct - no extra whitespace
const name = [firstName, middleName, lastName]
  .filter(Boolean)
  .join(' ') || 'Unknown User';

// ❌ Wrong - creates extra spaces
const name = `${firstName} ${middleName} ${lastName}`;
```

---

## 🔒 Security Best Practices

### Token Masking in Logs
```typescript
// ✅ Always mask tokens in console output
const maskedToken = maskToken(authToken);
console.log(`Token: ${maskedToken}`);

// ❌ Never log raw tokens
console.log(`Token: ${authToken}`); // Security risk!
```

---

## 📝 Common Patterns

### Delete Handler Pattern
```typescript
const handleDelete = async (id: string) => {
  Modal.confirm({
    title: 'Confirm Delete',
    content: 'Are you sure?',
    onOk: async () => {
      setIsDeleting(true);
      try {
        await deleteOperation(id);
        await refetch(); // Update list
        onClose(); // Only close on success
      } catch (error) {
        message.error(getErrorMessage(error));
        // Keep drawer open on failure
      } finally {
        setIsDeleting(false);
      }
    },
  });
};
```

### Status/Role Change Pattern
```typescript
const handleChange = async (newValue: Value) => {
  const previousValue = currentValue;
  
  setIsChanging(true);
  setCurrentValue(newValue); // Optimistic
  
  try {
    await updateOnServer(newValue);
    
    // Auth sync if self-modification
    if (isSelf) {
      await refetchUser();
    }
    
    await refetch(); // Update list
  } catch (error) {
    setCurrentValue(previousValue); // Rollback
    message.error(getErrorMessage(error));
  } finally {
    setIsChanging(false);
  }
};
```

---

## 🐛 Debugging

### Authentication Issues
```typescript
// Run diagnostics (development only)
import { diagnoseAndPrint } from '../utils/authDiagnostics';

await diagnoseAndPrint(); // Check console for detailed output
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Stale user list after delete | Ensure `await refetch()` is called |
| UI doesn't update after mutation | Check rollback logic in error handler |
| Auth context out of sync | Call `refetchUser()` after self-modification |
| Double submissions | Add loading states and disable buttons |
| Extra spaces in names | Use `filter(Boolean).join(' ')` pattern |

---

## ✅ Testing Checklist

Before deploying changes:

- [ ] Test admin changing own role → auth syncs
- [ ] Test admin changing own status → auth syncs  
- [ ] Test delete with success → drawer closes, list updates
- [ ] Test delete with failure → drawer stays open, error shown
- [ ] Test status change with failure → UI rolls back
- [ ] Test role change with failure → UI rolls back
- [ ] Verify all buttons show loading states
- [ ] Verify all buttons disabled during operations
- [ ] Check role colors match everywhere
- [ ] Check names render without extra spaces
- [ ] Verify tokens are masked in console
- [ ] Test refresh button uses refetch (not reload)

---

## 📚 Related Files

**Core Components:**
- `AdminUserManagement.tsx` - Main page component
- `UserActionsDrawer.tsx` - User details and actions
- `UsersTable.tsx` - User list table
- `UsersStatistics.tsx` - Statistics cards

**Hooks:**
- `useAuth.ts` - Authentication context hook
- `useUsers.ts` - User data fetching and mutations

**Services:**
- `user.Service.ts` - User API service layer
- `auth.Service.ts` - Authentication service

**Utils:**
- `errorHelpers.ts` - Error handling utilities (NEW)
- `authDiagnostics.ts` - Auth debugging tools

---

## 🚀 Performance Tips

1. **Use refetch() instead of window.location.reload()**
   - Preserves state and scroll position
   - Faster and less jarring

2. **Leverage optimistic updates**
   - Instant UI feedback
   - Always implement rollback

3. **Batch operations when possible**
   - Reduce API calls
   - Better UX for bulk actions

4. **Use proper loading states**
   - Prevents double submissions
   - Better perceived performance

---

## 📞 Support

If you encounter issues with these changes:

1. Check the console for errors
2. Run `diagnoseAndPrint()` for auth issues
3. Verify all handlers are properly `async`
4. Check error handling includes rollback logic
5. Ensure `refetch()` and `refetchUser()` are called appropriately

---

**Last Updated:** November 21, 2025  
**Version:** 1.0  
**Maintainer:** Development Team

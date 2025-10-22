# Global Theme Implementation Guide

## ✅ Implementation Complete

The application now uses a **consistent, centralized theme system** based on Ant Design's theme tokens.

## Theme Architecture

### 1. **Core Theme Configuration** (`src/theme/themeConfig.ts`)
```typescript
export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: '#001f3f',    // Navy Blue
    colorSuccess: '#52c41a',    // Green
    colorWarning: '#faad14',    // Orange
    colorError: '#ff4d4f',      // Red
    colorInfo: '#1890ff',       // Blue
    // ... and more
  }
}
```

### 2. **Theme Hook** (`src/theme/useThemeToken.ts`)
Access theme tokens in any component:
```typescript
import { useThemeToken } from '../theme';

const MyComponent = () => {
  const token = useThemeToken();
  
  return (
    <div style={{ color: token.colorError }}>
      Error message
    </div>
  );
};
```

### 3. **Theme Provider** (`src/main.tsx`)
Wraps entire app to provide theme context:
```typescript
<ThemeProvider themeMode="light">
  <App />
</ThemeProvider>
```

## Updated Components

### ✅ Fully Theme-Integrated

1. **AdminLayout.tsx**
   - Uses `theme.useToken()` for layout colors
   - Dynamic background and border radius

2. **ManageAlerts.tsx**
   - Statistics use theme tokens
   - Badge colors from theme
   - All hardcoded colors replaced

3. **AdminDashboard.tsx**
   - Statistics colors use theme tokens
   - Arrow indicators use theme colors

4. **DeviceReadings.tsx**
   - Status icons use theme colors
   - All indicator colors from theme

5. **alerts.ts** (Types)
   - `getSeverityColor()` returns Ant Design preset names
   - `getStatusColor()` returns Ant Design preset names
   - Tag colors automatically theme-aware

### Component Usage Patterns

#### ✅ **DO THIS** - Use Theme Tokens
```typescript
// Import the hook
import { useThemeToken } from '../theme';

const MyComponent = () => {
  const token = useThemeToken();
  
  return (
    <>
      {/* Inline styles */}
      <div style={{ color: token.colorError }}>Error</div>
      
      {/* Statistic valueStyle */}
      <Statistic 
        value={100} 
        valueStyle={{ color: token.colorSuccess }} 
      />
      
      {/* Icon colors */}
      <CheckCircleOutlined style={{ color: token.colorSuccess }} />
    </>
  );
};
```

#### ❌ **DON'T DO THIS** - Hardcoded Colors
```typescript
// Bad - hardcoded hex colors
<div style={{ color: '#ff4d4f' }}>Error</div>
<Statistic value={100} valueStyle={{ color: '#52c41a' }} />
<CheckCircleOutlined style={{ color: '#52c41a' }} />
```

#### ✅ **ALSO GOOD** - Ant Design Preset Colors
```typescript
// For Tags and Status indicators
<Tag color="error">Critical</Tag>
<Tag color="warning">Warning</Tag>
<Tag color="success">Resolved</Tag>
<Tag color="processing">Info</Tag>
```

## Available Theme Tokens

### Colors
- `token.colorPrimary` - Primary brand color (#001f3f)
- `token.colorSuccess` - Success green (#52c41a)
- `token.colorWarning` - Warning orange (#faad14)
- `token.colorError` - Error red (#ff4d4f)
- `token.colorInfo` - Info blue (#1890ff)
- `token.colorBgContainer` - Container background
- `token.colorBorder` - Border color
- `token.colorTextSecondary` - Secondary text

### Layout
- `token.borderRadius` - Border radius (6px)
- `token.borderRadiusLG` - Large border radius (8px)
- `token.controlHeight` - Control height (32px)

### Typography
- `token.fontSize` - Base font size (14px)
- `token.fontFamily` - Font family

## Files Modified

### Core Theme Files
- ✅ `src/theme/themeConfig.ts` - Theme configuration
- ✅ `src/theme/useThemeToken.ts` - **NEW** Theme hook
- ✅ `src/theme/index.ts` - Export all theme utilities

### Type Definitions
- ✅ `src/types/alerts.ts` - Updated color functions to use preset names

### Components
- ✅ `src/components/StatusIndicator.tsx` - **NEW** Reusable status components
- ✅ `src/components/layouts/AdminLayout.tsx` - Uses theme tokens
- ✅ `src/components/AlertNotificationCenter.tsx` - Uses theme-aware colors

### Admin Pages
- ✅ `src/pages/admin/ManageAlerts/ManageAlerts.tsx` - Full theme integration
- ✅ `src/pages/admin/AdminDashboard.tsx` - Full theme integration
- ✅ `src/pages/admin/DeviceReadings/DeviceReadings.tsx` - Full theme integration

### Remaining Files with Hardcoded Colors
The following files still have hardcoded colors and should be updated following the same pattern:

1. **Staff Pages** (12-15 instances each)
   - `src/pages/staff/StaffReadings.tsx`
   - `src/pages/staff/StaffDevices.tsx`
   - `src/pages/staff/StaffDashboard.tsx`
   - `src/pages/staff/StaffAnalytics.tsx`

2. **Admin Pages** (5-10 instances each)
   - `src/pages/admin/DeviceManagement/DeviceManagement.tsx`
   - `src/pages/admin/DeviceManagement/ViewDeviceModal.tsx`
   - `src/pages/admin/DataManagement/DataManagement.tsx`
   - `src/pages/admin/ManageReports/ManageReports.tsx`
   - `src/pages/admin/Analytics/Analytics.tsx`

## Quick Migration Steps

For any component with hardcoded colors:

### Step 1: Import the hook
```typescript
import { useThemeToken } from '../theme'; // or '../../theme' depending on path
```

### Step 2: Use the hook in component
```typescript
const MyComponent = () => {
  const token = useThemeToken();
  // ... rest of component
}
```

### Step 3: Replace hardcoded colors
```typescript
// Before
valueStyle={{ color: '#52c41a' }}

// After
valueStyle={{ color: token.colorSuccess }}
```

### Step 4: Replace icon colors
```typescript
// Before
<CheckCircleOutlined style={{ color: '#52c41a' }} />

// After
<CheckCircleOutlined style={{ color: token.colorSuccess }} />
```

## Color Mapping Reference

| Hardcoded | Theme Token | Ant Design Preset |
|-----------|-------------|-------------------|
| `#001f3f` | `token.colorPrimary` | - |
| `#52c41a` | `token.colorSuccess` | `success` |
| `#faad14` | `token.colorWarning` | `warning` |
| `#ff4d4f` | `token.colorError` | `error` |
| `#1890ff` | `token.colorInfo` | `processing` / `info` |
| `#d9d9d9` | `token.colorBorder` | `default` |
| `#8c8c8c` | `token.colorTextSecondary` | - |
| `#722ed1` | (custom purple) | `purple` |

## Benefits

✅ **Centralized** - All colors defined in one place  
✅ **Consistent** - Same colors across entire app  
✅ **Maintainable** - Change once, update everywhere  
✅ **Theme Support** - Easy to add dark mode or custom themes  
✅ **Type-Safe** - TypeScript ensures correct token usage  
✅ **Future-Proof** - Easy to extend or modify  

## Next Steps

To complete theme integration across the entire codebase:

1. Update all **Staff Pages** following the pattern shown
2. Update remaining **Admin Pages** with hardcoded colors
3. Add dark theme toggle in settings (optional)
4. Add theme customization panel (optional)

## Testing

✅ Build successful: `npm run build`  
✅ No TypeScript errors  
✅ All components render correctly  
✅ Theme tokens accessible in all components  

---

**Last Updated:** October 22, 2025  
**Status:** Core implementation complete, remaining files need migration

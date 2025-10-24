# Quick Reference Card

## 📌 For Daily Use During Refactoring

---

## Folder Structure Hierarchy

```
src/
├── core/                    ← App initialization, routing, config
│   ├── providers/           ← Context providers
│   ├── router/              ← Routes & route guards
│   └── config/              ← Configuration files
│
├── shared/                  ← Reusable across ALL features
│   ├── components/          ← UI components
│   ├── hooks/               ← Custom hooks
│   ├── utils/               ← Utilities
│   ├── constants/           ← Constants
│   ├── types/               ← Types & interfaces
│   └── services/            ← Shared services (HTTP, storage)
│
└── features/                ← Feature modules (self-contained)
    ├── feature-name/
    │   ├── types/           ← Feature-specific types
    │   ├── services/        ← Feature business logic & API
    │   ├── hooks/           ← Feature custom hooks
    │   ├── pages/           ← Route-level pages
    │   ├── components/      ← Feature components
    │   ├── constants/       ← Feature constants
    │   └── index.ts         ← Barrel export
    └── ...
```

---

## File Naming Quick Rules

| Type | Pattern | Example | ✅ Good | ❌ Bad |
|------|---------|---------|---------|----------|
| Folders | kebab-case | device-management | device-management | DeviceManagement |
| Pages | PascalCase + Page | DeviceManagementPage.tsx | ✅ | DeviceManagement.tsx |
| Components | PascalCase | DeviceTable.tsx | ✅ | device-table.tsx |
| Services | camelCase | deviceService.ts | ✅ | DeviceService.ts |
| Hooks | use + PascalCase | useDeviceList.ts | ✅ | getDevices.ts |
| Types | camelCase | device.types.ts | ✅ | Device.ts |
| Constants | camelCase | device.constants.ts | ✅ | DEVICE_CONSTANTS.ts |

---

## Variable Naming Quick Rules

```typescript
// Booleans - use is/has/should/can
const isLoading = true;                    ✅
const hasError = false;                    ✅
const shouldShowButton = true;             ✅

// Async functions - use fetch/load/get
const fetchDeviceList = async () => { }    ✅
const loadUserProfile = async () => { }    ✅
const getAlerts = async () => { }          ✅

// Event handlers - use handle
const handleSubmit = () => { }             ✅
const handleDelete = () => { }             ✅
const handleClose = () => { }              ✅

// Data - use descriptive names
const deviceListData = [];                 ✅
const selectedDeviceId = '123';            ✅
const validationErrors = [];               ✅

// Collections - use plural
const devices = [];                        ✅
const alerts = [];                         ✅
const readings = [];                       ✅
```

---

## Type Naming Quick Rules

```typescript
// Interfaces & Types - PascalCase
interface UserProfile { }                  ✅
type AlertSeverity = 'Advisory' | ...      ✅
interface DeviceListProps { }              ✅

// Props interfaces - end with Props
interface ButtonProps { }                  ✅
interface TableProps { }                   ✅

// Request/Response - end with Request/Response
interface CreateDeviceRequest { }          ✅
interface DeviceListResponse { }           ✅

// Enums - PascalCase with matching values
enum UserStatus {
  Pending = 'Pending',                     ✅
  Approved = 'Approved',
}

// Generic types - use T prefix
interface AsyncState<TData> { }            ✅
type Response<TItem> = { }                 ✅
```

---

## Constants Naming Quick Rules

```typescript
// Constants - UPPER_SNAKE_CASE
const MAX_DEVICES_PER_PAGE = 20;           ✅
const DEFAULT_ALERT_TIMEOUT_MS = 5000;     ✅
const API_REQUEST_RETRY_ATTEMPTS = 3;      ✅

// Include units when applicable
const TIMEOUT_MS = 5000;                   ✅ (not just TIMEOUT)
const DELAY_SECONDS = 2;                   ✅ (not just DELAY)

// No magic numbers/strings
const isValidPassword = pwd.length >= 8;   ❌
const isValidPassword = pwd.length >= MIN_PASSWORD_LENGTH;  ✅
```

---

## Import Patterns

### From Shared
```typescript
// ✅ DO
import { useDeviceList } from '@/shared/hooks';
import { Device } from '@/shared/types';
import { API_ENDPOINTS } from '@/shared/constants';
import { httpClient } from '@/shared/services/http';

// ❌ DON'T
import useDeviceList from '../../shared/hooks/useDeviceList';
import { Device } from '../../shared/types/domain.types';
import API_ENDPOINTS from '../../shared/constants/api.constants';
```

### From Feature
```typescript
// ✅ DO (within same feature)
import { DeviceTable } from './components';
import { useDeviceForm } from './hooks';
import type { Device } from './types';

// ✅ DO (from other feature - use barrel exports)
import { useAlertsList } from '@/features/alerts';

// ❌ DON'T (relative imports when you can use aliases)
import { DeviceTable } from '../components/DeviceTable';
```

---

## Barrel Exports (index.ts Pattern)

```typescript
// ✅ In features/device-management/index.ts
export { DeviceManagementPage } from './pages';
export { DeviceTable, DeviceForm } from './components';
export { useDeviceList } from './hooks';
export type { Device } from './types';

// In another feature:
import { DeviceTable, useDeviceList } from '@/features/device-management';

// Instead of:
import { DeviceTable } from '@/features/device-management/components';
import { useDeviceList } from '@/features/device-management/hooks';
```

---

## Component Structure Template

```typescript
// ✅ CORRECT COMPONENT STRUCTURE

import React from 'react';
import styles from './DeviceTable.module.css';
import { deviceService } from '@/features/device-management/services';
import { useDeviceList } from '@/features/device-management/hooks';
import type { Device } from '@/features/device-management/types';

// Props interface
interface DeviceTableProps {
  deviceId?: string;
  onSelectionChange?: (devices: Device[]) => void;
  isLoading?: boolean;
}

// Component
const DeviceTable: React.FC<DeviceTableProps> = ({
  deviceId,
  onSelectionChange,
  isLoading = false,
}) => {
  const { deviceList, isLoading: isFetching } = useDeviceList();

  const handleRowClick = (device: Device) => {
    // Handle
  };

  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  );
};

export default DeviceTable;
```

---

## Service Structure Template

```typescript
// ✅ CORRECT SERVICE STRUCTURE

import { HttpClient } from '@/shared/services/http';
import { API_ENDPOINTS } from '@/shared/constants';
import type { Device } from './device.types';

export class DeviceService {
  private apiClient: HttpClient;

  constructor() {
    this.apiClient = new HttpClient({
      baseURL: API_ENDPOINTS.DEVICE_API_BASE,
      timeout: 10000,
    });
  }

  async fetchDeviceList(): Promise<Device[]> {
    const response = await this.apiClient.post('', {
      action: API_ENDPOINTS.DEVICES.LIST,
    });
    return response.devices || [];
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    await this.apiClient.post('', {
      action: API_ENDPOINTS.DEVICES.DELETE,
      deviceId,
    });
    return true;
  }
}

export const deviceService = new DeviceService();
```

---

## Hook Structure Template

```typescript
// ✅ CORRECT HOOK STRUCTURE

import { useState, useEffect } from 'react';
import { deviceService } from '../services/deviceService';
import type { Device } from '../types/device.types';

interface UseDeviceListReturn {
  deviceList: Device[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDeviceList(): UseDeviceListReturn {
  const [deviceList, setDeviceList] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await deviceService.fetchDeviceList();
      setDeviceList(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    deviceList,
    isLoading,
    error,
    refetch: fetchData,
  };
}
```

---

## Type Definition Template

```typescript
// ✅ CORRECT TYPES STRUCTURE

// device.types.ts
export type DeviceStatus = 'Active' | 'Inactive' | 'Maintenance';
export type DeviceType = 'WaterQuality' | 'Sensor' | 'Monitor';

export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  status: DeviceStatus;
  location: string;
  createdAtDate: Date;
}

export interface CreateDeviceRequest {
  deviceName: string;
  deviceType: DeviceType;
  location: string;
}

export interface DeviceListResponse {
  devices: Device[];
  total: number;
}
```

---

## Common Mistakes to Avoid

| ❌ Mistake | ✅ Correct | Why |
|-----------|-----------|-----|
| `const user = {..}` | `const currentUserProfile = {...}` | Descriptive |
| `const d = device` | `const device = device` | Not abbreviated |
| `getUser()` | `fetchUserProfile()` | Shows it's async |
| `data` | `deviceListData` | Specific, not generic |
| `handleData()` | `handleDataFetchError()` | Clear what it handles |
| `api.ts` | `deviceApiClient.ts` | Specific, not generic |
| Deep imports | Barrel exports | Cleaner imports |
| Mixed concerns | Separate files | Single responsibility |
| Magic strings | Named constants | Maintainability |
| Generic types | Specific naming | Type safety |

---

## Refactoring Workflow (Daily)

```bash
# 1. Create feature branch
git checkout -b refactor/phase-x

# 2. Create new structure
mkdir -p src/features/device-management/{types,services,hooks,pages,components}

# 3. Create files with types first
# types/device.types.ts
# services/deviceService.ts
# hooks/useDeviceList.ts

# 4. Create components with proper naming
# components/DeviceTable.tsx
# components/DeviceForm.tsx
# pages/DeviceManagementPage.tsx

# 5. Add barrel export
# index.ts

# 6. Update imports gradually
# Verify no broken imports

# 7. Test thoroughly
npm run build
npm run dev

# 8. Commit and push
git add .
git commit -m "refactor: reorganize device-management feature"
git push origin refactor/phase-x

# 9. Create pull request
# Review, test, merge
```

---

## When in Doubt...

**Q: Where should this component go?**
- Is it used across features? → `src/shared/components/`
- Is it feature-specific? → `src/features/[feature]/components/`
- Is it route-level? → Use `.Page` suffix

**Q: What should I name this file?**
- Check NAMING_CONVENTIONS.md for the type
- Follow pattern from similar files
- Be descriptive, not generic

**Q: How do I import this?**
- Check if it has barrel export
- If not, use explicit import
- Use `@/` path alias when possible

**Q: What's the folder for this?**
- Check REFACTORING_PLAN.md folder structure
- Look for similar items
- Ask in code review if unsure

---

## Quick Commands

```bash
# Find file by pattern
find src -name "*device*"

# Find imports of a file
grep -r "from.*device" src/

# Rename file (VS Code)
Right-click → Rename
# Or F2 with file selected

# Update imports in VS Code
Cmd/Ctrl + Shift + L (with selection)
# Then Find & Replace in Selection

# Check TypeScript errors
npm run build

# Build project
npm run build

# Start dev server
npm run dev

# Lint code
npm run lint
```

---

## Communication Checklist

When you have a question, check in order:
- [ ] NAMING_CONVENTIONS.md
- [ ] REFACTORING_PLAN.md architecture section
- [ ] IMPLEMENTATION_GUIDE.md
- [ ] Similar file/pattern in codebase
- [ ] Code review/ask team

---

## Document References

| Document | Purpose | When to Use |
|----------|---------|-----------|
| EXECUTIVE_SUMMARY.md | High-level overview | Project kickoff |
| REFACTORING_PLAN.md | Strategic blueprint | Architecture decisions |
| CURRENT_STATE_ANALYSIS.md | Problem analysis | Understanding why |
| NAMING_CONVENTIONS.md | Style guide | **Daily reference** |
| IMPLEMENTATION_GUIDE.md | How-to manual | Step-by-step work |
| QUICK_REFERENCE.md | This document | Quick lookups |

---

## Last Updated
October 24, 2025

## Status
✅ Ready for Use


# GitHub Copilot Instructions

## Project Architecture Overview

This project follows a strict **Service Layer → Global Hooks → UI** data flow architecture. Always adhere to these principles when generating or modifying code.

---

## Core Principles

### 1. Data Flow Pattern
```
Service Layer (services/*.Service.ts)
    ↓
Global Hooks Layer (hooks/reads/* OR hooks/writes/*)
    ↓
UI Layer (components/*, pages/*)
```

### 2. Separation of Concerns

**Service Layer (`services/*.Service.ts`):**
- Contains ALL SDK/API operations (Firestore, RTDB, Axios)
- Pure functions that return Promises
- NO React dependencies
- Handle error transformation and standardization
- Singleton exports: `alertsService`, `devicesService`, `usersService`, `reportsService`, `mqttService`
- Examples: `acknowledgeAlert()`, `createReport()`, `updateUserStatus()`

**Global Hooks Layer (CENTRALIZED):**
- **Read Hooks** (`hooks/reads/useRealtime_*.ts`):
  - Use Firebase/RTDB listeners for real-time data ONLY
  - Direct reads allowed for: device readings, alerts, live dashboards
  - Return: `{ data, isLoading, error, refetch }`
  - Never perform writes
  - Exported from `hooks/index.ts`

- **Write Hooks** (`hooks/writes/useCall_*.ts`):
  - Wrap service layer functions
  - Provide React-friendly interface with loading/error states
  - Return: `{ call functions, isLoading, error, isSuccess, operationType, reset }`
  - Handle UI state management
  - Exported from `hooks/index.ts`

**UI Layer (`components/*`, `pages/*`):**
- **✅ MUST use GLOBAL hooks from `@/hooks` or `../../hooks`**
- **❌ NEVER create local/page-specific hooks that duplicate global hooks**
- **❌ NEVER import service functions directly in UI components**
- Components should be "dumb" - accept data and callbacks from global hooks
- No direct Firebase/RTDB/Axios imports in UI components

---

## Strict Rules

### ✅ DO:
1. **All CRUD operations via Service Layer**
   - Create, Update, Delete, Acknowledge, Edit permissions, Generate reports
   - Use function calls through service layer

2. **Realtime data via Direct Firestore/RTDB listeners**
   - Device readings, alerts, live metrics
   - Implement in `hooks/reads/useRealtime_*.ts`

3. **MQTT operations via Axios ONLY**
   - Bridge status, health metrics, MQTT-specific endpoints
   - Centralize in `services/mqtt.service.ts`

4. **ALL UI components MUST use GLOBAL hooks**
   - Import from `@/hooks` or `../../hooks/index.ts`
   - Reuse existing hooks: `useRealtime_Alerts`, `useRealtime_Devices`, `useCall_Alerts`, etc.
   - Check `hooks/index.ts` for available hooks before creating new ones

5. **Service Export Names (CRITICAL)**
   - `alertsService` ✅ (from `alerts.Service.ts`)
   - `devicesService` ✅ (from `devices.Service.ts`)
   - `usersService` ✅ (from `user.Service.ts`)
   - `reportsService` ✅ (from `reports.Service.ts`)
   - `mqttService` ✅ (from `mqtt.service.ts`)

### ❌ DON'T:
1. ❌ Use Axios for Firestore/RTDB operations
2. ❌ Perform direct writes in UI components
3. ❌ Mix reads and writes in the same hook
4. ❌ Import Firebase SDK directly in UI components
5. ❌ Use service functions directly in components (use hooks instead)
6. ❌ **Create local/page-specific hooks that duplicate global hooks functionality**
7. ❌ Create hooks in `pages/**/hooks/` that wrap service layer (use global hooks)
8. ❌ Import services with wrong names (`deviceManagementService` ❌, `userManagementService` ❌)


---

## File Naming Conventions

- Services: `services/[feature].Service.ts`
- Global read hooks: `hooks/reads/useRealtime_[Feature].ts`
- Global write hooks: `hooks/writes/useCall_[Feature].ts`
- Schemas: `schemas/[feature].schema.ts`
- **Local hooks:** Only for UI-specific logic (filters, pagination, form state) - NOT for service layer calls

---

## Global Hooks Registry

### Available Global Read Hooks:
- `useRealtime_Alerts()` - Real-time alerts from Firestore
- `useRealtime_Devices()` - Real-time device sensor data from RTDB + Firestore
- `useRealtime_MQTTMetrics()` - MQTT Bridge health/status polling

### Available Global Write Hooks:
- `useCall_Alerts()` - Alert operations (acknowledge, resolve)
- `useCall_Devices()` - Device CRUD (add, update, delete, register)
- `useCall_Users()` - User management (update status, update role)
- `useCall_Reports()` - Report generation (water quality, device status, compliance)
- `useCall_Analytics()` - Analytics operations (deprecated, use Reports)

### Import Pattern:
```typescript
// ✅ CORRECT - Use global hooks
import { useRealtime_Alerts, useCall_Alerts } from '@/hooks';

// ❌ WRONG - Don't create local duplicates
import { useRealtimeAlerts } from './hooks/useRealtimeAlerts';
```

---

## When Generating Code

1. **For CRUD operations**: 
   - Check if global write hook exists in `hooks/writes/`
   - Use existing hook: `useCall_Devices()`, `useCall_Users()`, etc.
   - If hook doesn't exist, create in `hooks/writes/` and export from `hooks/index.ts`

2. **For realtime data**: 
   - Check if global read hook exists in `hooks/reads/`
   - Use existing hook: `useRealtime_Alerts()`, `useRealtime_Devices()`, etc.
   - If hook doesn't exist, create in `hooks/reads/` and export from `hooks/index.ts`

3. **For MQTT operations**: 
   - Add to `services/mqtt.service.ts` → Use `useRealtime_MQTTMetrics()` global hook

4. **For UI-specific logic** (filters, pagination, form validation):
   - Create local hooks in `pages/**/hooks/` (e.g., `useDeviceFilter`, `useAlertStats`)
   - These should NOT wrap service layer calls

5. **Always** include TypeScript types from schemas
6. **Always** handle loading and error states
7. **Always** check `hooks/index.ts` before creating new hooks

---

## TypeScript Best Practices

- Import types from `schemas/*.schema.ts`
- Use `Partial<T>` for update operations
- Add `id: string` to all Firestore documents
- Use proper error typing: `Error | null`
- Return typed Promise from service functions


```

---

## Questions to Ask Before Generating Code

1. Is this a CRUD operation? → Use Service + Global Write Hook (`useCall_*`)
2. Is this realtime data? → Use Global Read Hook (`useRealtime_*`) with Firebase listener
3. Is this MQTT-related? → Use `useRealtime_MQTTMetrics()` global hook
4. Does the global hook already exist? → Check `hooks/index.ts` first!
5. Is this UI-specific logic (filters, pagination)? → Local hook is OK (but don't wrap service calls)
6. Does the service function exist? → Check `services/*.Service.ts`

---

## Service Layer → Hooks Mapping

### Services → Global Hooks:
```
alertsService (alerts.Service.ts)
  ├── useRealtime_Alerts() - READ: Subscribe to alerts
  └── useCall_Alerts() - WRITE: acknowledgeAlert(), resolveAlert()

devicesService (devices.Service.ts)
  ├── useRealtime_Devices() - READ: Subscribe to device sensor data
  └── useCall_Devices() - WRITE: addDevice(), updateDevice(), deleteDevice(), registerDevice()

usersService (user.Service.ts)
  └── useCall_Users() - WRITE: updateUserStatus(), updateUser()

reportsService (reports.Service.ts)
  └── useCall_Reports() - WRITE: generateWaterQualityReport(), generateDeviceStatusReport()

mqttService (mqtt.service.ts)
  └── useRealtime_MQTTMetrics() - READ: Poll MQTT Bridge health/status
```

---

## References

- Full architecture documentation: `docs/DATA_FLOW.md`
- Existing services: `src/services/`
- Existing global hooks: `src/hooks/`
- Schemas: `src/schemas/`

---

## Migration Notes for Existing Local Hooks

**Local hooks that SHOULD be replaced with global hooks:**
- ❌ `pages/admin/AdminDashboard/hooks/useRealtimeDevices.ts` → ✅ Use `useRealtime_Devices()`
- ❌ `pages/admin/AdminDashboard/hooks/useRealtimeAlerts.ts` → ✅ Use `useRealtime_Alerts()`
- ❌ Any local hook that wraps service layer calls → ✅ Use global hooks

**Local hooks that are OK (UI-specific logic):**
- ✅ `pages/admin/AdminDeviceManagement/hooks/useDeviceFilter.ts` - Filtering logic
- ✅ `pages/admin/AdminAlerts/hooks/useAlertStats.ts` - Statistics calculation
- ✅ `pages/admin/AdminAlerts/hooks/useAlertFilters.ts` - Filter state management

---

**Remember**: The goal is predictable data flow, clear separation of concerns, and maintainable code. When in doubt, follow the pattern: Service → Global Hook → UI.

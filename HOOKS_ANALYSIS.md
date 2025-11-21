# Custom Hooks Analysis & Rebuild Plan

**Date**: 2025-01-21  
**Status**: CRITICAL - Misleading naming and architecture violations  
**Severity**: HIGH - Inconsistent architecture, missing MQTT hooks, scattered organization

---

## Executive Summary

### CRITICAL ISSUES FOUND

1. **MISLEADING FOLDER NAMING**: `/hooks_old/` contains ACTIVE global hooks, not deprecated code
2. **MISSING MQTT HOOK**: `useRealtime_MQTTMetrics` referenced but NOT IMPLEMENTED
3. **EMPTY HOOKS FOLDER**: `/hooks/` is completely empty, not being used
4. **INCONSISTENT LOCAL HOOKS**: Some are properly UI-only, others are misnamed

### Current Hook Architecture (ACTUAL)

```
✅ CORRECT LOCATION (but misleading name):
hooks_old/
├── index.ts                           # Central exports
├── reads/                             # Global READ hooks
│   ├── useRealtime_Alerts.ts         # ✅ Firestore subscription
│   ├── useRealtime_Devices.ts        # ✅ Firestore + RTDB subscription
│   ├── useRealtime_Users.ts          # ✅ Firestore subscription  
│   └── useRealtime_AnalyticsData.ts  # ✅ REST API polling
└── writes/                            # Global WRITE hooks
    ├── useCall_Alerts.ts              # ✅ Alert operations (service layer)
    ├── useCall_Devices.ts             # ✅ Device operations (service layer)
    ├── useCall_Users.ts               # ✅ User operations (service layer)
    ├── useCall_Reports.ts             # ✅ Report generation (service layer)
    └── useCall_Analytics.ts           # ✅ Analytics operations (service layer)

❌ WRONG - Empty folder:
hooks/                                 # EMPTY - Should contain global hooks

❌ MISLEADING - Local hooks scattered:
pages/admin/AdminAlerts/hooks/
├── useAlertFilters.ts                # ✅ OK - UI filtering only
└── useAlertStats.ts                  # ✅ OK - UI calculations only

pages/admin/AdminAnalytics/hooks/
├── useAnalyticsProcessing.ts         # ✅ OK - Data transformation only
└── useAnalyticsStats.ts              # ✅ OK - UI calculations only

pages/admin/AdminDashboard/hooks/
└── useDashboardStats.ts              # ✅ OK - UI calculations only

pages/admin/AdminDeviceManagement/hooks/
└── useDeviceFilter.ts                # ✅ OK - UI filtering only

pages/admin/AdminDeviceReadings/hooks/
└── useDeviceSeverityCalculator.ts    # ✅ OK - UI calculations only

pages/admin/AdminReports/hooks/
└── useReportHistory.ts               # ✅ OK - localStorage UI state
```

---

## Admin Pages Service Layer Requirements

### AdminAlerts
**Global Hooks Used**:
- ✅ `useRealtime_Alerts()` - Real-time alert subscription
- ✅ `useCall_Alerts()` - Alert operations (acknowledge, resolve, delete)

**Local Hooks**:
- ✅ `useAlertFilters()` - Client-side filtering (ACCEPTABLE)
- ✅ `useAlertStats()` - Statistics calculation (ACCEPTABLE)

**Service Layer Support**: ✅ COMPLETE
- alerts.Service.ts: getAlerts, acknowledgeAlert, resolveAlert, deleteAlert

---

### AdminAnalytics
**Global Hooks Used**:
- ✅ `useRealtime_Devices()` - Real-time device + sensor data
- ✅ `useRealtime_Alerts()` - Real-time alerts
- ❌ `useRealtime_MQTTMetrics()` - **MISSING IMPLEMENTATION**

**Local Hooks**:
- ✅ `useAnalyticsStats()` - Statistics calculation (ACCEPTABLE)
- ✅ `useAnalyticsProcessing()` - Data transformation (ACCEPTABLE)

**Service Layer Support**: ⚠️ PARTIAL
- analytics.service.ts: getSummary, getTrends, getParameterAnalytics
- ❌ MISSING: mqtt.service.ts or health endpoint integration

**CRITICAL**: AdminAnalytics imports `useRealtime_MQTTMetrics` but it doesn't exist!

---

### AdminDashboard
**Global Hooks Used**:
- ✅ `useRealtime_Devices()` - Real-time device data
- ✅ `useRealtime_Alerts()` - Real-time alerts
- ❌ `useRealtime_MQTTMetrics()` - **MISSING IMPLEMENTATION**

**Local Hooks**:
- ✅ `useDashboardStats()` - Statistics calculation (ACCEPTABLE)

**Service Layer Support**: ⚠️ PARTIAL
- ❌ MISSING: MQTT/Health metrics service and hook

**CRITICAL**: AdminDashboard imports `useRealtime_MQTTMetrics` but it doesn't exist!

---

### AdminDeviceManagement
**Global Hooks Used**:
- ✅ `useRealtime_Devices()` - Real-time device data
- ✅ `useCall_Devices()` - Device operations (update, delete, register)

**Local Hooks**:
- ✅ `useDeviceFilter()` - Client-side filtering (ACCEPTABLE)

**Service Layer Support**: ✅ COMPLETE
- devices.Service.ts: getDevices, updateDevice, deleteDevice, registerDevice

---

### AdminDeviceReadings
**Global Hooks Used**:
- ✅ `useRealtime_Devices()` - Real-time device + sensor data
- ✅ `useRealtime_Alerts()` - Real-time alerts

**Local Hooks**:
- ✅ `useDeviceSeverityCalculator()` - Severity calculation (ACCEPTABLE)

**Service Layer Support**: ✅ COMPLETE
- devices.Service.ts: getDeviceReadings, getDevices

---

### AdminReports
**Global Hooks Used**:
- ✅ `useRealtime_Devices()` - Device data
- ✅ `useCall_Reports()` - Report generation

**Local Hooks**:
- ✅ `useReportHistory()` - localStorage state (ACCEPTABLE)

**Service Layer Support**: ✅ COMPLETE
- reports.Service.ts: generateWaterQualityReport, generateDeviceStatusReport

---

### AdminSettings (NotificationSettings)
**Global Hooks Used**:
- Likely needs user preferences hooks (not analyzed in detail)

**Service Layer Support**: ✅ COMPLETE
- user.Service.ts: getUserPreferences, updateUserPreferences

---

### AdminUserManagement
**Global Hooks Used**:
- ✅ `useRealtime_Users()` - Real-time user data
- ✅ `useCall_Users()` - User operations (update, delete, etc.)

**Service Layer Support**: ✅ COMPLETE
- user.Service.ts: getAllUsers, updateUserRole, updateUserStatus, deleteUser

---

## Service Layer Coverage Analysis

### ✅ FULLY SUPPORTED Services
1. **alerts.Service.ts**
   - READ: getAlerts, getAlertStats
   - WRITE: acknowledgeAlert, resolveAlert, deleteAlert
   - Hook: useRealtime_Alerts, useCall_Alerts

2. **devices.Service.ts**
   - READ: getDevices, getDeviceReadings, getDeviceStats
   - WRITE: updateDevice, registerDevice, deleteDevice
   - Hook: useRealtime_Devices, useCall_Devices

3. **user.Service.ts**
   - READ: getAllUsers, getUserById, getUserPreferences
   - WRITE: updateUserRole, updateUserStatus, updateUserProfile, deleteUser
   - Hook: useRealtime_Users, useCall_Users

4. **reports.Service.ts**
   - WRITE: generateWaterQualityReport, generateDeviceStatusReport
   - READ: getReports, getReportById
   - Hook: useCall_Reports

5. **analytics.service.ts**
   - READ: getSummary, getTrends, getParameterAnalytics
   - Hook: useRealtime_AnalyticsData

### ❌ MISSING Service Integration

**CRITICAL: MQTT/Health Metrics**
- **Referenced In**: AdminDashboard, AdminAnalytics
- **Hook Used**: `useRealtime_MQTTMetrics()` - **DOES NOT EXIST**
- **Service Layer**: No mqtt.service.ts or health.service.ts visible
- **Required Methods**:
  - getMQTTHealth()
  - getMQTTStatus()
  - getMQTTMemory()
  - getSystemHealth()

**Impact**: TypeScript compilation errors, runtime crashes on AdminDashboard and AdminAnalytics pages

---

## Hook Naming Conventions Analysis

### ✅ CORRECT Naming (Current)

**Global READ Hooks** (Real-time subscriptions):
```typescript
useRealtime_Alerts()      // Firestore subscription
useRealtime_Devices()     // Firestore + RTDB subscription
useRealtime_Users()       // Firestore subscription
useRealtime_AnalyticsData() // REST polling
useRealtime_MQTTMetrics() // MISSING - Should be REST polling
```

**Global WRITE Hooks** (Service layer wrappers):
```typescript
useCall_Alerts()      // alertsService operations
useCall_Devices()     // devicesService operations
useCall_Users()       // userService operations
useCall_Reports()     // reportsService operations
useCall_Analytics()   // analyticsService operations
```

**Local UI Hooks** (Page-specific):
```typescript
// Pattern: use[Feature][Purpose]
useAlertFilters()              // ✅ Clear - filters alerts
useAlertStats()                // ✅ Clear - calculates stats
useAnalyticsProcessing()       // ✅ Clear - processes data
useAnalyticsStats()            // ✅ Clear - calculates analytics stats
useDashboardStats()            // ✅ Clear - calculates dashboard stats
useDeviceFilter()              // ✅ Clear - filters devices
useDeviceSeverityCalculator()  // ✅ Clear - calculates severity
useReportHistory()             // ✅ Clear - manages localStorage history
```

### Naming Convention Rules

1. **Global READ Hooks**: `useRealtime_[Resource]()`
   - Indicates real-time subscription (Firestore/RTDB/Polling)
   - Plural resource names for collections
   
2. **Global WRITE Hooks**: `useCall_[Resource]()`
   - Indicates mutation/operation wrapper
   - Returns operation functions + loading states
   
3. **Local UI Hooks**: `use[Feature][Purpose]()`
   - No prefix (distinguishes from global)
   - Descriptive purpose (Filter, Stats, Calculator, etc.)
   - Page-scoped only

---

## Problems & Issues

### 🔴 CRITICAL ISSUES

1. **Misleading Folder Name**
   - Folder: `hooks_old/`
   - Reality: Contains ALL active global hooks
   - Problem: Developers think it's deprecated code
   - Impact: Confusion, potential deletion

2. **Missing MQTT Hook Implementation**
   - Used: `useRealtime_MQTTMetrics()` in AdminDashboard, AdminAnalytics
   - Status: **DOES NOT EXIST**
   - Impact: TypeScript errors, runtime crashes
   - Location: Should be in `hooks_old/reads/useRealtime_MQTTMetrics.ts`

3. **Empty Hooks Folder**
   - Folder: `hooks/`
   - Status: Completely empty
   - Problem: Unclear where to add new hooks
   - Impact: Architecture confusion

### 🟡 MODERATE ISSUES

4. **No Health/MQTT Service**
   - Missing: `health.service.ts` or `mqtt.service.ts`
   - Impact: Cannot implement useRealtime_MQTTMetrics properly
   - Required endpoints: `/health`, `/mqtt/status`

5. **Inconsistent Local Hook Patterns**
   - Some use `useMemo`, some use `useCallback`
   - Some export functions, some don't
   - Impact: Code review complexity

### 🟢 MINOR ISSUES

6. **Documentation Gaps**
   - Local hooks have good JSDoc
   - Global hooks need architecture documentation
   - No centralized hook usage guide

---

## Rebuild Plan

### Phase 1: Fix Critical Issues (IMMEDIATE)

**Step 1.1: Rename hooks_old to hooks**
```bash
# Rename the folder
mv hooks_old hooks_active

# Update all imports across codebase
# From: '../../../hooks_old'
# To:   '../../../hooks'
```

**Step 1.2: Create MQTT Metrics Hook**
```typescript
// hooks/reads/useRealtime_MQTTMetrics.ts
// Implement polling-based MQTT health monitoring
// Support: health, status, memory metrics
```

**Step 1.3: Create MQTT/Health Service**
```typescript
// services/health.Service.ts
// Methods:
// - getMQTTHealth()
// - getMQTTStatus() 
// - getSystemHealth()
```

### Phase 2: Improve Organization (SHORT TERM)

**Step 2.1: Document Global Hooks**
```markdown
# Add to each global hook file:
- Purpose and responsibility
- Service layer dependencies
- Usage examples
- Return value documentation
```

**Step 2.2: Standardize Local Hooks**
```typescript
// Enforce pattern:
// 1. Export types first
// 2. Export helper functions (if needed)
// 3. Export main hook
// 4. Use consistent memoization
```

**Step 2.3: Create Hook Registry**
```typescript
// hooks/index.ts - Enhanced documentation
// Clear separation:
// - GLOBAL READ HOOKS
// - GLOBAL WRITE HOOKS
// - Usage examples
// - Architecture rules
```

### Phase 3: Quality Improvements (MEDIUM TERM)

**Step 3.1: Add Hook Unit Tests**
```typescript
// __tests__/hooks/
// Test each global hook
// Mock service layer
// Verify loading states, error handling
```

**Step 3.2: Performance Optimization**
```typescript
// Add SWR caching configuration
// Optimize polling intervals
// Implement request deduplication
```

**Step 3.3: TypeScript Strictness**
```typescript
// Remove 'any' types
// Add strict null checks
// Export all interfaces
```

---

## Required Hook Implementations

### MISSING: useRealtime_MQTTMetrics

**File**: `hooks/reads/useRealtime_MQTTMetrics.ts`

**Purpose**: Poll MQTT bridge health and status metrics

**Service Dependency**: 
- `health.Service.ts` (TO BE CREATED)
- Endpoints: `/api/health`, `/api/mqtt/status`

**Return Type**:
```typescript
{
  health: MqttBridgeHealth | null;
  status: MqttStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

**Polling Interval**: 2000-5000ms (configurable)

**Used By**:
- AdminDashboard
- AdminAnalytics

---

## Service Layer Completeness

### ✅ Complete & Working
- alerts.Service.ts
- devices.Service.ts  
- user.Service.ts
- reports.Service.ts
- analytics.service.ts
- auth.Service.ts

### ❌ Missing & Required
- **health.Service.ts** - System health, MQTT metrics
- **mqtt.Service.ts** - MQTT bridge status (alternative)

### Service Methods Needed
```typescript
// health.Service.ts or mqtt.Service.ts

class HealthService {
  // Get MQTT bridge health metrics
  async getMQTTHealth(): Promise<MqttBridgeHealth> {
    // GET /api/health/mqtt
  }
  
  // Get MQTT connection status
  async getMQTTStatus(): Promise<MqttStatus> {
    // GET /api/mqtt/status
  }
  
  // Get system health summary
  async getSystemHealth(): Promise<SystemHealth> {
    // GET /api/health
  }
}
```

---

## Folder Structure (PROPOSED)

```
client/src/
├── hooks/                              # ✅ Global hooks (renamed from hooks_old)
│   ├── index.ts                        # Central exports + documentation
│   ├── reads/                          # Real-time subscriptions
│   │   ├── useRealtime_Alerts.ts       # Firestore alerts
│   │   ├── useRealtime_Devices.ts      # Firestore + RTDB devices
│   │   ├── useRealtime_Users.ts        # Firestore users
│   │   ├── useRealtime_AnalyticsData.ts # REST analytics
│   │   └── useRealtime_MQTTMetrics.ts  # ✅ NEW - MQTT health polling
│   ├── writes/                         # Mutation operations
│   │   ├── useCall_Alerts.ts           # Alert operations
│   │   ├── useCall_Devices.ts          # Device operations
│   │   ├── useCall_Users.ts            # User operations
│   │   ├── useCall_Reports.ts          # Report generation
│   │   └── useCall_Analytics.ts        # Analytics operations
│   └── utils/                          # Shared hook utilities
│       └── useRouteContext.ts          # Route-based conditional fetching
│
├── services/                           # REST API services
│   ├── alerts.Service.ts               # ✅ Complete
│   ├── analytics.service.ts            # ✅ Complete
│   ├── auth.Service.ts                 # ✅ Complete
│   ├── devices.Service.ts              # ✅ Complete
│   ├── reports.Service.ts              # ✅ Complete
│   ├── user.Service.ts                 # ✅ Complete
│   └── health.Service.ts               # ❌ NEW - MQTT & system health
│
└── pages/admin/
    ├── AdminAlerts/
    │   └── hooks/                      # Local UI hooks
    │       ├── useAlertFilters.ts      # ✅ UI filtering
    │       └── useAlertStats.ts        # ✅ UI stats
    ├── AdminAnalytics/
    │   └── hooks/
    │       ├── useAnalyticsProcessing.ts # ✅ Data transformation
    │       └── useAnalyticsStats.ts      # ✅ UI stats
    ├── AdminDashboard/
    │   └── hooks/
    │       └── useDashboardStats.ts    # ✅ UI stats
    ├── AdminDeviceManagement/
    │   └── hooks/
    │       └── useDeviceFilter.ts      # ✅ UI filtering
    ├── AdminDeviceReadings/
    │   └── hooks/
    │       └── useDeviceSeverityCalculator.ts # ✅ UI calculations
    └── AdminReports/
        └── hooks/
            └── useReportHistory.ts     # ✅ localStorage state
```

---

## Migration Checklist

### Immediate Actions (CRITICAL)

- [ ] **Create health.Service.ts** - MQTT metrics service
- [ ] **Implement useRealtime_MQTTMetrics.ts** - MQTT polling hook
- [ ] **Rename hooks_old → hooks** - Fix misleading naming
- [ ] **Update all imports** - Change '../hooks_old' to '../hooks'
- [ ] **Test AdminDashboard** - Verify MQTT metrics display
- [ ] **Test AdminAnalytics** - Verify MQTT integration

### Short Term Improvements

- [ ] Add comprehensive JSDoc to all global hooks
- [ ] Create hooks usage documentation
- [ ] Standardize local hook patterns
- [ ] Add error boundary wrappers
- [ ] Implement retry logic for failed requests

### Long Term Quality

- [ ] Add unit tests for all hooks
- [ ] Performance profiling and optimization
- [ ] Add hook composition examples
- [ ] Create developer onboarding guide
- [ ] Add Storybook examples

---

## Conclusion

### What's Working Well
✅ Clear separation between global and local hooks  
✅ Service layer is well-structured and complete (except MQTT)  
✅ Local UI hooks are properly scoped and documented  
✅ Naming conventions are consistent and meaningful  

### Critical Problems
❌ **hooks_old** folder name is misleading - contains active code  
❌ **useRealtime_MQTTMetrics** is missing - breaks 2 admin pages  
❌ **health.Service.ts** doesn't exist - no MQTT metrics support  
❌ **hooks/** folder is empty - architecture confusion  

### Priority Actions
1. Create MQTT/Health service integration (URGENT)
2. Implement useRealtime_MQTTMetrics hook (URGENT)
3. Rename hooks_old to hooks (HIGH)
4. Document global hooks architecture (MEDIUM)
5. Add comprehensive testing (LOW)

---

**Next Steps**: Implement useRealtime_MQTTMetrics and health.Service.ts to fix critical AdminDashboard and AdminAnalytics issues.

# Frontend Client to Express Server Migration Plan

## 📋 Executive Summary

**Objective:** Migrate the React client from Firebase (Cloud Functions + Firestore/RTDB) to Express REST API with MongoDB while maintaining all functionality and improving performance.

**Status:** Server 100% complete (35+ endpoints operational)  
**Timeline:** Estimated 4-6 hours for complete migration  
**Risk Level:** Medium (requires careful session management and real-time data handling)

---

## 🏗️ Current Architecture Analysis

### Backend (Express Server - ✅ COMPLETE)

**Server Stack:**
- Express v5.1.0
- MongoDB/Mongoose v8.20.0
- Passport.js (Google OAuth)
- Session-based authentication
- node-cron (background jobs)
- nodemailer (email notifications)

**Available Endpoints:**

```
Authentication:
├── GET  /auth/google                  - Initiate OAuth
├── GET  /auth/google/callback         - OAuth callback
├── GET  /auth/logout                  - Logout user
└── GET  /auth/status                  - Get auth status

Users (9 endpoints):
├── GET    /api/users                  - List all users (admin)
├── GET    /api/users/:id              - Get user by ID
├── PATCH  /api/users/:id/role         - Update user role (admin)
├── PATCH  /api/users/:id/status       - Update user status (admin)
├── PATCH  /api/users/:id/profile      - Update user profile (admin)
├── DELETE /api/users/:id              - Delete user (admin)
├── GET    /api/users/:id/preferences  - Get notification preferences
├── PUT    /api/users/:id/preferences  - Update notification preferences
└── DELETE /api/users/:id/preferences  - Reset preferences

Alerts (7 endpoints):
├── GET    /api/alerts                 - Get all alerts (with filters)
├── GET    /api/alerts/stats           - Get alert statistics
├── GET    /api/alerts/:id             - Get alert by ID
├── PATCH  /api/alerts/:id/acknowledge - Acknowledge alert
├── PATCH  /api/alerts/:id/resolve     - Resolve alert
├── POST   /api/alerts                 - Create alert (internal)
└── DELETE /api/alerts/:id             - Delete alert (admin)

Devices (7 endpoints):
├── GET    /api/devices                - Get all devices (with filters)
├── GET    /api/devices/stats          - Get device statistics
├── GET    /api/devices/:id            - Get device by ID
├── GET    /api/devices/:id/readings   - Get device sensor readings
├── PATCH  /api/devices/:id            - Update device (admin)
├── DELETE /api/devices/:id            - Delete device (admin)
└── POST   /api/devices/readings       - Process sensor data (MQTT Bridge)

Reports (5 endpoints):
├── POST   /api/reports/water-quality  - Generate water quality report
├── POST   /api/reports/device-status  - Generate device status report
├── GET    /api/reports                - Get all reports (with filters)
├── GET    /api/reports/:id            - Get report by ID
└── DELETE /api/reports/:id            - Delete report (admin)

Analytics (3 endpoints):
├── GET    /api/analytics/summary      - Get dashboard statistics
├── GET    /api/analytics/trends       - Get time-series trends
└── GET    /api/analytics/parameters   - Get parameter analytics
```

### Frontend (React Client - ⚠️ NEEDS MIGRATION)

**Current Stack:**
- React + TypeScript
- Vite
- Firebase SDK (Cloud Functions, Firestore, RTDB)
- Ant Design
- React Router

**Services to Migrate:**
```
client/src/services/
├── alerts.Service.ts      - ⚠️ Uses Firebase Cloud Functions + Firestore
├── devices.Service.ts     - ⚠️ Uses Firebase Cloud Functions + RTDB
├── user.Service.ts        - ✅ Already uses Express API (axios)
├── reports.Service.ts     - ⚠️ Uses Firebase Cloud Functions
├── analytics.service.ts   - ⚠️ Uses Firebase Cloud Functions
├── auth.Service.ts        - ⚠️ Needs OAuth flow update
└── mqtt.service.ts        - ⚠️ Needs Express endpoint integration
```

**Global Hooks to Migrate:**
```
client/src/hooks/reads/
├── useRealtime_Alerts.ts  - ⚠️ Firestore listener → SWR polling
├── useRealtime_Devices.ts - ⚠️ RTDB listener → SWR polling
└── useRealtime_MQTTMetrics.ts - ⚠️ Polling (needs endpoint update)

client/src/hooks/writes/
├── useCall_Alerts.ts      - ⚠️ Cloud Functions → REST API
├── useCall_Devices.ts     - ⚠️ Cloud Functions → REST API
├── useCall_Users.ts       - ✅ Already uses REST API
├── useCall_Reports.ts     - ⚠️ Cloud Functions → REST API
└── useCall_Analytics.ts   - ⚠️ Cloud Functions → REST API
```

---

## 🎯 Migration Strategy

### Phase 1: Setup & Dependencies (30 min)

**Tasks:**
1. Install axios in client (`npm install axios`)
2. Install SWR for polling (`npm install swr`)
3. Create axios instance with session handling
4. Create API configuration file
5. Update environment variables

**Files to Create:**
- `client/src/config/api.config.ts` - Axios instance + interceptors
- `client/src/config/endpoints.ts` - Centralized endpoint definitions
- `client/.env.local` - API base URL configuration

### Phase 2: Authentication Migration (45 min)

**Current:** Firebase Auth + Google OAuth  
**Target:** Passport.js + Session-based auth

**Changes Required:**
1. Remove Firebase Auth SDK
2. Update `auth.Service.ts` to use Express OAuth flow
3. Update `AuthContext` to check session status
4. Add session persistence logic
5. Update `ProtectedRoute` component

**Files to Modify:**
- `client/src/services/auth.Service.ts`
- `client/src/contexts/AuthContext.tsx`
- `client/src/components/ProtectedRoute.tsx`

### Phase 3: Services Layer Migration (90 min)

**Migration Pattern for Each Service:**

```typescript
// BEFORE (Firebase)
import { getFunctions, httpsCallable } from 'firebase/functions';
const functions = getFunctions();
const callable = httpsCallable(functions, 'FunctionName');
const result = await callable({ action, data });

// AFTER (Express API)
import { apiClient } from '@/config/api.config';
const response = await apiClient.post('/api/endpoint', data);
const result = response.data;
```

**Services to Migrate:**

1. **alerts.Service.ts** (60 min)
   - Replace Cloud Functions with REST API calls
   - Update error handling
   - Remove Firestore listeners
   - Methods:
     - `acknowledgeAlert()` → PATCH `/api/alerts/:id/acknowledge`
     - `resolveAlert()` → PATCH `/api/alerts/:id/resolve`
     - `subscribeToAlerts()` → Remove (replaced by polling hook)

2. **devices.Service.ts** (90 min)
   - Replace Cloud Functions with REST API calls
   - Replace RTDB listeners with API polling
   - Update error handling
   - Methods:
     - `updateDevice()` → PATCH `/api/devices/:id`
     - `deleteDevice()` → DELETE `/api/devices/:id`
     - `registerDevice()` → PATCH `/api/devices/:id`
     - `listDevices()` → GET `/api/devices`
     - `subscribeToSensorReadings()` → Remove (replaced by polling)

3. **reports.Service.ts** (30 min)
   - Replace Cloud Functions with REST API calls
   - Methods:
     - `generateWaterQualityReport()` → POST `/api/reports/water-quality`
     - `generateDeviceStatusReport()` → POST `/api/reports/device-status`
     - `getReports()` → GET `/api/reports`
     - `getReportById()` → GET `/api/reports/:id`
     - `deleteReport()` → DELETE `/api/reports/:id`

4. **analytics.service.ts** (30 min)
   - Replace Cloud Functions with REST API calls
   - Methods:
     - `getSummary()` → GET `/api/analytics/summary`
     - `getTrends()` → GET `/api/analytics/trends`
     - `getParameterAnalytics()` → GET `/api/analytics/parameters`

### Phase 4: Global Hooks Migration (120 min)

**Strategy:** Replace Firebase real-time listeners with SWR polling

**SWR Configuration:**
```typescript
import useSWR from 'swr';

const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

// Polling every 5 seconds for real-time feel
const { data, error, mutate } = useSWR('/api/alerts', fetcher, {
  refreshInterval: 5000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
});
```

**Hooks to Migrate:**

1. **useRealtime_Alerts.ts** (30 min)
   - Remove Firestore listener
   - Implement SWR polling
   - Keep same interface for components
   - Polling interval: 5 seconds

2. **useRealtime_Devices.ts** (45 min)
   - Remove RTDB listener
   - Implement SWR polling
   - Poll both devices list + sensor readings
   - Polling interval: 5 seconds for readings, 30 seconds for device list

3. **useRealtime_MQTTMetrics.ts** (15 min)
   - Update endpoint URL
   - Keep existing polling logic

4. **useCall_Alerts.ts** (15 min)
   - Replace Cloud Functions with REST API
   - Update error handling

5. **useCall_Devices.ts** (15 min)
   - Replace Cloud Functions with REST API
   - Update error handling

6. **useCall_Reports.ts** (15 min)
   - Replace Cloud Functions with REST API
   - Update error handling

7. **useCall_Analytics.ts** (15 min)
   - Replace Cloud Functions with REST API
   - Update error handling

### Phase 5: Components Update (30 min)

**Most components won't need changes** due to global hooks abstraction.

**Files That May Need Updates:**
- Login/Logout components (OAuth flow)
- Any direct Firebase imports
- Error message displays

### Phase 6: Testing & Validation (60 min)

**Test Checklist:**

Authentication:
- [ ] Google OAuth login works
- [ ] Session persists on page refresh
- [ ] Logout clears session
- [ ] Protected routes redirect correctly

Alerts:
- [ ] Alert list loads and updates
- [ ] Acknowledge alert works
- [ ] Resolve alert works
- [ ] Alert stats display correctly
- [ ] Real-time updates work (polling)

Devices:
- [ ] Device list loads
- [ ] Sensor readings display
- [ ] Device update works (admin)
- [ ] Device delete works (admin)
- [ ] Real-time sensor updates work (polling)

Reports:
- [ ] Water quality report generation
- [ ] Device status report generation
- [ ] Report list loads
- [ ] Report download/view works
- [ ] Report delete works (admin)

Analytics:
- [ ] Dashboard statistics load
- [ ] Trends chart displays
- [ ] Parameter analytics work

Users:
- [ ] User list loads (admin)
- [ ] User role update works (admin)
- [ ] User status update works (admin)
- [ ] User profile update works
- [ ] Notification preferences work

---

## 📦 Dependencies Changes

### Remove (Firebase):
```json
{
  "firebase": "^10.x.x",
  "@firebase/app": "^0.x.x",
  "@firebase/functions": "^0.x.x",
  "@firebase/firestore": "^4.x.x",
  "@firebase/database": "^1.x.x",
  "@firebase/auth": "^1.x.x"
}
```

### Add (HTTP Client + Polling):
```json
{
  "axios": "^1.6.0",
  "swr": "^2.2.0"
}
```

---

## 🔑 Key Implementation Details

### 1. Axios Instance with Session Handling

```typescript
// client/src/config/api.config.ts
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Critical for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any custom headers here
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);
```

### 2. SWR Configuration for Real-time Polling

```typescript
// client/src/config/swr.config.ts
import { SWRConfiguration } from 'swr';
import { apiClient } from './api.config';

export const fetcher = (url: string) => 
  apiClient.get(url).then(res => res.data.data || res.data);

export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  dedupingInterval: 2000,
};

// Real-time data config (alerts, devices)
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 5000, // Poll every 5 seconds
};

// Static data config (reports, users)
export const swrStaticConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 0, // No polling, manual refresh only
};
```

### 3. Authentication Flow

```typescript
// client/src/services/auth.Service.ts
import { apiClient, API_BASE_URL } from '@/config/api.config';

export class AuthService {
  /**
   * Initiate Google OAuth login
   * Redirects to Express OAuth endpoint
   */
  async loginWithGoogle(): Promise<void> {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  /**
   * Logout user and destroy session
   */
  async logout(): Promise<void> {
    try {
      await apiClient.get('/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect anyway
      window.location.href = '/login';
    }
  }

  /**
   * Check authentication status
   * Returns current user if authenticated
   */
  async getAuthStatus(): Promise<{ authenticated: boolean; user?: User }> {
    try {
      const response = await apiClient.get('/auth/status');
      return response.data;
    } catch (error) {
      return { authenticated: false };
    }
  }
}

export const authService = new AuthService();
```

### 4. Real-time Polling Hook Pattern

```typescript
// client/src/hooks/reads/useRealtime_Alerts.ts
import useSWR from 'swr';
import { apiClient } from '@/config/api.config';
import type { WaterQualityAlert } from '@/schemas';

interface UseRealtimeAlertsReturn {
  data: WaterQualityAlert[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useRealtime_Alerts = (): UseRealtimeAlertsReturn => {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: WaterQualityAlert[];
  }>(
    '/api/alerts',
    (url) => apiClient.get(url).then(res => res.data),
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data?.data || [],
    isLoading,
    error: error || null,
    refetch: () => mutate(),
  };
};
```

### 5. Write Hook Pattern

```typescript
// client/src/hooks/writes/useCall_Alerts.ts
import { useState } from 'react';
import { apiClient } from '@/config/api.config';
import { message } from 'antd';

interface UseCallAlertsReturn {
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string, notes?: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const useCall_Alerts = (): UseCallAlertsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const acknowledgeAlert = async (alertId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.patch(`/api/alerts/${alertId}/acknowledge`);
      message.success('Alert acknowledged successfully');
    } catch (err: any) {
      const error = new Error(err.response?.data?.message || 'Failed to acknowledge alert');
      setError(error);
      message.error(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.patch(`/api/alerts/${alertId}/resolve`, { notes });
      message.success('Alert resolved successfully');
    } catch (err: any) {
      const error = new Error(err.response?.data?.message || 'Failed to resolve alert');
      setError(error);
      message.error(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    acknowledgeAlert,
    resolveAlert,
    isLoading,
    error,
  };
};
```

---

## ⚠️ Critical Migration Points

### 1. Session Management
**Issue:** Express uses session cookies, not JWT tokens like Firebase  
**Solution:**
- Set `withCredentials: true` in axios config
- Configure CORS on server to allow credentials
- Check session status on app mount
- Handle 401 responses globally

### 2. Real-time Data Handling
**Issue:** Replacing WebSocket/listeners with HTTP polling  
**Solution:**
- Use SWR with `refreshInterval: 5000` (5 seconds)
- Add loading states during polls
- Implement optimistic updates for writes
- Use SWR's `mutate` for manual refresh

### 3. Error Handling
**Issue:** Different error formats (Firebase vs Express)  
**Solution:**
- Standardize error response format on server
- Create centralized error handler on client
- Map HTTP status codes to user messages
- Show user-friendly error messages

### 4. Authentication State
**Issue:** Firebase provides onAuthStateChanged listener  
**Solution:**
- Poll `/auth/status` endpoint on mount
- Store user in React Context
- Check session on route changes
- Implement session timeout handling

### 5. Offline Support
**Issue:** Firebase SDK has offline support  
**Solution:**
- Use SWR's cache for offline data
- Implement service worker (PWA)
- Queue failed requests with retry logic
- Show offline indicator in UI

---

## 📊 Performance Optimizations

### 1. Reduce Polling Frequency
- **Critical data** (sensor readings, alerts): 5 seconds
- **Important data** (device list): 15 seconds
- **Static data** (users, reports): Manual refresh only

### 2. Data Caching Strategy
```typescript
// Cache configuration
const cacheConfig = {
  alerts: { ttl: 5000, polling: true },
  devices: { ttl: 15000, polling: true },
  users: { ttl: 60000, polling: false },
  reports: { ttl: 300000, polling: false },
};
```

### 3. Request Batching
- Combine multiple GET requests when possible
- Use query parameters for filters instead of multiple endpoints

### 4. Optimistic Updates
```typescript
// Example: Acknowledge alert
const acknowledgeAlert = async (alertId: string) => {
  // Optimistically update UI
  mutate(
    '/api/alerts',
    (current) => ({
      ...current,
      data: current.data.map((alert) =>
        alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
      ),
    }),
    false // Don't revalidate immediately
  );

  // Send request
  await apiClient.patch(`/api/alerts/${alertId}/acknowledge`);
  
  // Revalidate to sync with server
  mutate('/api/alerts');
};
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test each service method with mocked axios
- Test hooks with mocked SWR
- Test error handling paths

### Integration Tests
- Test authentication flow end-to-end
- Test CRUD operations with real API
- Test polling behavior

### E2E Tests
- Test full user workflows
- Test real-time updates (polling)
- Test session expiration handling

---

## 📝 Migration Checklist

### Pre-Migration
- [ ] Backup Firebase configuration
- [ ] Document current API calls
- [ ] Verify all Express endpoints are working
- [ ] Set up development environment

### Migration
- [ ] Install axios and SWR
- [ ] Create API configuration
- [ ] Migrate auth service
- [ ] Update AuthContext
- [ ] Migrate alerts service
- [ ] Migrate devices service
- [ ] Migrate reports service
- [ ] Migrate analytics service
- [ ] Update read hooks (polling)
- [ ] Update write hooks (REST API)
- [ ] Update components (if needed)
- [ ] Remove Firebase SDK
- [ ] Update environment variables

### Post-Migration
- [ ] Test all features manually
- [ ] Run automated tests
- [ ] Monitor network requests
- [ ] Check for memory leaks (polling)
- [ ] Validate error handling
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Conduct user acceptance testing

---

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Client (.env.local)
VITE_API_BASE_URL=http://localhost:5000

# Production
VITE_API_BASE_URL=https://api.waterquality.com
```

### CORS Configuration (Server)
```javascript
// Already configured in server
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
```

### Build Configuration
```json
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 📚 Additional Resources

- **Express Server Docs:** `server/src/` (review all controllers)
- **SWR Documentation:** https://swr.vercel.app/
- **Axios Documentation:** https://axios-http.com/
- **Session Management:** Passport.js docs

---

## 🎯 Success Criteria

Migration is complete when:
1. ✅ All Firebase dependencies removed
2. ✅ All services use Express REST API
3. ✅ All hooks use SWR polling
4. ✅ Authentication works with session-based OAuth
5. ✅ Real-time updates work via polling (5-sec intervals)
6. ✅ All CRUD operations functional
7. ✅ Error handling works correctly
8. ✅ No memory leaks from polling
9. ✅ All tests pass
10. ✅ Performance is acceptable (<100ms API response time)

---

**Estimated Total Time:** 6-8 hours  
**Priority:** HIGH  
**Complexity:** MEDIUM-HIGH  
**Risk:** MEDIUM (requires careful testing)

**Next Step:** Begin with Phase 1 (Setup & Dependencies)

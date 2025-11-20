# Firebase to Express API Mapping Reference

## Quick Reference Guide

This document provides a **side-by-side comparison** of Firebase operations and their Express REST API equivalents.

---

## 🔐 Authentication

### Firebase Auth
```typescript
// Login
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);

// Logout
await signOut(auth);

// Check auth state
onAuthStateChanged(auth, (user) => {
  // Handle user
});
```

### Express API
```typescript
// Login - Redirect to OAuth
window.location.href = 'http://localhost:5000/auth/google';

// Logout
await axios.get('http://localhost:5000/auth/logout', { withCredentials: true });

// Check auth state
const { data } = await axios.get('http://localhost:5000/auth/status', { 
  withCredentials: true 
});
// Returns: { authenticated: boolean, user?: User }
```

---

## 🚨 Alerts Service

### Firebase Cloud Functions
```typescript
// Acknowledge alert
const functions = getFunctions();
const callable = httpsCallable(functions, 'AlertsCalls');
await callable({ 
  action: 'acknowledgeAlert', 
  alertId: 'alert-123' 
});

// Resolve alert
await callable({ 
  action: 'resolveAlert', 
  alertId: 'alert-123',
  notes: 'Fixed'
});

// Subscribe to alerts (Firestore)
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20));
const unsubscribe = onSnapshot(q, (snapshot) => {
  const alerts = snapshot.docs.map(doc => doc.data());
  // Handle alerts
});
```

### Express REST API
```typescript
// Acknowledge alert
await axios.patch(
  'http://localhost:5000/api/alerts/alert-123/acknowledge',
  {},
  { withCredentials: true }
);

// Resolve alert
await axios.patch(
  'http://localhost:5000/api/alerts/alert-123/resolve',
  { notes: 'Fixed' },
  { withCredentials: true }
);

// Get alerts (polling with SWR)
import useSWR from 'swr';
const { data } = useSWR(
  'http://localhost:5000/api/alerts',
  (url) => axios.get(url, { withCredentials: true }).then(res => res.data),
  { refreshInterval: 5000 } // Poll every 5 seconds
);
// Returns: { success: true, data: Alert[] }
```

**All Alert Endpoints:**
```typescript
// List alerts
GET /api/alerts?status=unacknowledged&severity=Critical&deviceId=WQ-001
→ { success: true, data: Alert[], pagination: {...} }

// Get alert by ID
GET /api/alerts/:id
→ { success: true, data: Alert }

// Get alert statistics
GET /api/alerts/stats
→ { success: true, data: { total, acknowledged, resolved, unacknowledged, bySeverity, byDevice } }

// Acknowledge alert
PATCH /api/alerts/:id/acknowledge
→ { success: true, message: 'Alert acknowledged', data: Alert }

// Resolve alert
PATCH /api/alerts/:id/resolve
Body: { notes: 'Resolution notes' }
→ { success: true, message: 'Alert resolved', data: Alert }

// Delete alert (admin only)
DELETE /api/alerts/:id
→ { success: true, message: 'Alert deleted' }

// Create alert (internal - MQTT Bridge)
POST /api/alerts
Body: { deviceId, parameter, value, message, severity }
→ { success: true, data: Alert }
```

---

## 🖥️ Devices Service

### Firebase (Cloud Functions + RTDB)
```typescript
// Update device
const functions = getFunctions();
const callable = httpsCallable(functions, 'DevicesCalls');
await callable({ 
  action: 'updateDevice', 
  deviceId: 'WQ-001',
  location: 'Building A'
});

// Delete device
await callable({ 
  action: 'deleteDevice', 
  deviceId: 'WQ-001'
});

// Get devices (Firestore)
import { collection, getDocs } from 'firebase/firestore';
const snapshot = await getDocs(collection(db, 'devices'));
const devices = snapshot.docs.map(doc => doc.data());

// Subscribe to sensor readings (RTDB)
import { ref, onValue } from 'firebase/database';
const rtdb = getDatabase();
onValue(ref(rtdb, `sensorReadings/WQ-001/latestReading`), (snapshot) => {
  const reading = snapshot.val();
  // Handle reading
});
```

### Express REST API
```typescript
// Update device
await axios.patch(
  'http://localhost:5000/api/devices/WQ-001',
  { location: 'Building A', registrationStatus: 'registered' },
  { withCredentials: true }
);

// Delete device
await axios.delete(
  'http://localhost:5000/api/devices/WQ-001',
  { withCredentials: true }
);

// Get devices
const { data } = await axios.get(
  'http://localhost:5000/api/devices',
  { withCredentials: true }
);
// Returns: { success: true, data: Device[] }

// Get sensor readings (polling)
import useSWR from 'swr';
const { data } = useSWR(
  'http://localhost:5000/api/devices/WQ-001/readings?limit=100',
  (url) => axios.get(url, { withCredentials: true }).then(res => res.data),
  { refreshInterval: 5000 } // Poll every 5 seconds
);
// Returns: { success: true, data: SensorReading[] }
```

**All Device Endpoints:**
```typescript
// List devices
GET /api/devices?status=online&registrationStatus=registered
→ { success: true, data: Device[] }

// Get device by ID
GET /api/devices/:id
→ { success: true, data: Device }

// Get device statistics
GET /api/devices/stats
→ { success: true, data: { total, online, offline, registered, unregistered } }

// Get device sensor readings
GET /api/devices/:id/readings?limit=100&startDate=2025-01-01&endDate=2025-01-31
→ { success: true, data: SensorReading[], metadata: { count, avgPH, avgTurbidity, ... } }

// Update device (admin only)
PATCH /api/devices/:id
Body: { location, registrationStatus, status, deviceName }
→ { success: true, message: 'Device updated', data: Device }

// Delete device (admin only)
DELETE /api/devices/:id
→ { success: true, message: 'Device deleted' }

// Process sensor data (internal - MQTT Bridge)
POST /api/devices/readings
Body: { deviceId, pH, turbidity, tds, temperature, timestamp }
→ { success: true, message: 'Sensor data processed', deviceId, alerts }
```

---

## 📊 Reports Service

### Firebase Cloud Functions
```typescript
// Generate water quality report
const functions = getFunctions();
const callable = httpsCallable(functions, 'ReportCalls');
const result = await callable({ 
  action: 'generateWaterQualityReport', 
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  deviceIds: ['WQ-001', 'WQ-002']
});
// Returns: { success: true, data: WaterQualityReportData }

// Generate device status report
const result = await callable({ 
  action: 'generateDeviceStatusReport', 
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

### Express REST API
```typescript
// Generate water quality report
const { data } = await axios.post(
  'http://localhost:5000/api/reports/water-quality',
  { 
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    deviceIds: ['WQ-001', 'WQ-002']
  },
  { withCredentials: true }
);
// Returns: { success: true, data: Report }

// Generate device status report
const { data } = await axios.post(
  'http://localhost:5000/api/reports/device-status',
  { 
    startDate: '2025-01-01',
    endDate: '2025-01-31'
  },
  { withCredentials: true }
);
// Returns: { success: true, data: Report }
```

**All Report Endpoints:**
```typescript
// Generate water quality report
POST /api/reports/water-quality
Body: { startDate, endDate, deviceIds? }
→ { success: true, data: Report (with WHO compliance metrics) }

// Generate device status report
POST /api/reports/device-status
Body: { startDate, endDate, deviceIds? }
→ { success: true, data: Report (with uptime/health scores) }

// List reports
GET /api/reports?type=water-quality&status=completed&generatedBy=userId
→ { success: true, data: Report[], pagination: {...} }

// Get report by ID
GET /api/reports/:id
→ { success: true, data: Report }

// Delete report (admin only)
DELETE /api/reports/:id
→ { success: true, message: 'Report deleted' }
```

---

## 📈 Analytics Service

### Firebase Cloud Functions
```typescript
// Get dashboard summary
const functions = getFunctions();
const callable = httpsCallable(functions, 'AnalyticsCalls');
const result = await callable({ 
  action: 'getSummary' 
});

// Get trends
const result = await callable({ 
  action: 'getTrends',
  startDate: '2025-01-01',
  endDate: '2025-01-31',
  parameter: 'pH'
});
```

### Express REST API
```typescript
// Get dashboard summary
const { data } = await axios.get(
  'http://localhost:5000/api/analytics/summary',
  { withCredentials: true }
);
// Returns: { success: true, data: { devices, alerts, readings, compliance } }

// Get trends
const { data } = await axios.get(
  'http://localhost:5000/api/analytics/trends?startDate=2025-01-01&endDate=2025-01-31&parameter=pH&granularity=day',
  { withCredentials: true }
);
// Returns: { success: true, data: TrendPoint[] }
```

**All Analytics Endpoints:**
```typescript
// Get dashboard summary statistics
GET /api/analytics/summary
→ { success: true, data: { 
  devices: { total, online, offline, critical },
  alerts: { total, active, critical, resolved },
  readings: { totalToday, avgCompliance },
  lastUpdated
}}

// Get water quality trends
GET /api/analytics/trends?startDate=2025-01-01&endDate=2025-01-31&parameter=pH&granularity=hour&deviceIds=WQ-001,WQ-002
→ { success: true, data: TrendPoint[] }
// TrendPoint: { date, avgPH, avgTurbidity, avgTDS, avgTemperature, readingCount }

// Get parameter-specific analytics
GET /api/analytics/parameters?parameter=pH&startDate=2025-01-01&endDate=2025-01-31
→ { success: true, data: { 
  distribution: { min, max, avg, median, stdDev },
  histogram: HistogramBucket[],
  complianceRate,
  trendDirection
}}
```

---

## 👤 Users Service

### Firebase Cloud Functions
```typescript
// Update user status
const functions = getFunctions();
const callable = httpsCallable(functions, 'UsersCalls');
await callable({ 
  action: 'updateUserStatus', 
  userId: 'user-123',
  status: 'suspended'
});

// Update user role
await callable({ 
  action: 'updateUser', 
  userId: 'user-123',
  role: 'staff'
});
```

### Express REST API ✅ (Already Implemented)
```typescript
// Update user status
await axios.patch(
  'http://localhost:5000/api/users/user-123/status',
  { status: 'suspended' },
  { withCredentials: true }
);

// Update user role
await axios.patch(
  'http://localhost:5000/api/users/user-123/role',
  { role: 'staff' },
  { withCredentials: true }
);
```

**All User Endpoints:**
```typescript
// List users (admin only)
GET /api/users?role=admin&status=active&search=john
→ { success: true, data: User[], pagination: {...} }

// Get user by ID
GET /api/users/:id
→ { success: true, data: User }

// Update user role (admin only)
PATCH /api/users/:id/role
Body: { role: 'admin' | 'staff' | 'viewer' }
→ { success: true, message: 'User role updated', data: User }

// Update user status (admin only)
PATCH /api/users/:id/status
Body: { status: 'active' | 'inactive' | 'suspended' }
→ { success: true, message: 'User status updated', data: User }

// Update user profile (admin only)
PATCH /api/users/:id/profile
Body: { displayName, firstName, lastName, department, phoneNumber }
→ { success: true, message: 'User profile updated', data: User }

// Delete user (admin only)
DELETE /api/users/:id
→ { success: true, message: 'User deleted' }

// Get notification preferences
GET /api/users/:id/preferences
→ { success: true, data: NotificationPreferences }

// Update notification preferences
PUT /api/users/:id/preferences
Body: { emailNotifications, sendScheduledAlerts, alertSeverities, parameters, devices, quietHours }
→ { success: true, message: 'Preferences updated', data: NotificationPreferences }

// Reset notification preferences
DELETE /api/users/:id/preferences
→ { success: true, message: 'Preferences reset to defaults', data: NotificationPreferences }
```

---

## 🔄 Real-time Data: Listeners vs Polling

### Firebase (WebSocket Listeners)
```typescript
// Firestore listener (alerts)
const unsubscribe = onSnapshot(
  query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20)),
  (snapshot) => {
    const alerts = snapshot.docs.map(doc => doc.data());
    setAlerts(alerts);
  }
);

// RTDB listener (sensor readings)
onValue(ref(rtdb, `sensorReadings/${deviceId}/latestReading`), (snapshot) => {
  const reading = snapshot.val();
  setReading(reading);
});
```

### SWR Polling (HTTP)
```typescript
// Poll alerts every 5 seconds
import useSWR from 'swr';
const { data: alerts } = useSWR(
  '/api/alerts',
  fetcher,
  { refreshInterval: 5000 }
);

// Poll sensor readings every 5 seconds
const { data: readings } = useSWR(
  `/api/devices/${deviceId}/readings?limit=1`,
  fetcher,
  { refreshInterval: 5000 }
);
```

**Polling Strategy:**
```typescript
// Critical real-time data (poll every 5 seconds)
- Alerts: GET /api/alerts (refreshInterval: 5000)
- Sensor readings: GET /api/devices/:id/readings (refreshInterval: 5000)
- Device list: GET /api/devices (refreshInterval: 15000)

// Static data (no polling, manual refresh)
- Reports: GET /api/reports (refreshInterval: 0)
- Users: GET /api/users (refreshInterval: 0)
- Analytics: GET /api/analytics/* (refreshInterval: 30000)
```

---

## 🛡️ Authentication Headers

### Firebase (Automatic)
```typescript
// Firebase SDK automatically adds auth token to requests
const functions = getFunctions();
const callable = httpsCallable(functions, 'FunctionName');
await callable({ data }); // Auth token added automatically
```

### Express (Session Cookies)
```typescript
// Must include withCredentials: true for session cookies
const apiClient = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true, // ⚠️ CRITICAL for session auth
});

await apiClient.get('/api/endpoint'); // Session cookie sent automatically
```

---

## 📝 Error Handling

### Firebase
```typescript
try {
  const result = await callable({ action, data });
} catch (error: any) {
  if (error.code === 'functions/permission-denied') {
    // Handle permission error
  } else if (error.code === 'functions/not-found') {
    // Handle not found
  }
}
```

### Express
```typescript
try {
  const response = await axios.post('/api/endpoint', data);
} catch (error: any) {
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const message = error.response.data.message;
    
    if (status === 401) {
      // Unauthorized - redirect to login
    } else if (status === 403) {
      // Forbidden - permission denied
    } else if (status === 404) {
      // Not found
    } else if (status === 500) {
      // Server error
    }
  } else if (error.request) {
    // Request sent but no response (network error)
  } else {
    // Request setup error
  }
}
```

---

## 🎯 Complete Migration Checklist

### Remove Firebase Imports
```typescript
// ❌ Remove these
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

// ✅ Add these
import axios from 'axios';
import useSWR from 'swr';
```

### Update Service Patterns
```typescript
// ❌ OLD: Firebase Cloud Functions
const callable = httpsCallable(functions, 'FunctionName');
await callable({ action: 'doSomething', data });

// ✅ NEW: Express REST API
await axios.post('/api/endpoint', data, { withCredentials: true });
```

### Update Hook Patterns
```typescript
// ❌ OLD: Firestore listener
const [data, setData] = useState([]);
useEffect(() => {
  const unsubscribe = onSnapshot(query(...), (snapshot) => {
    setData(snapshot.docs.map(doc => doc.data()));
  });
  return unsubscribe;
}, []);

// ✅ NEW: SWR polling
const { data, isLoading, error } = useSWR(
  '/api/endpoint',
  fetcher,
  { refreshInterval: 5000 }
);
```

---

## 🚀 Quick Start Code Snippets

### 1. Axios Instance Setup
```typescript
// client/src/config/api.config.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  withCredentials: true,
  timeout: 30000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);
```

### 2. SWR Fetcher
```typescript
// client/src/config/swr.config.ts
import { apiClient } from './api.config';

export const fetcher = (url: string) => 
  apiClient.get(url).then(res => res.data.data || res.data);
```

### 3. Real-time Hook Template
```typescript
// client/src/hooks/reads/useRealtime_[Resource].ts
import useSWR from 'swr';
import { fetcher } from '@/config/swr.config';

export const useRealtime_Resource = () => {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/resource',
    fetcher,
    { refreshInterval: 5000 }
  );

  return {
    data: data || [],
    isLoading,
    error,
    refetch: mutate,
  };
};
```

### 4. Write Hook Template
```typescript
// client/src/hooks/writes/useCall_[Resource].ts
import { useState } from 'react';
import { apiClient } from '@/config/api.config';
import { message } from 'antd';

export const useCall_Resource = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const doAction = async (id: string, data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.patch(`/api/resource/${id}`, data);
      message.success('Action completed successfully');
    } catch (err: any) {
      const error = new Error(err.response?.data?.message || 'Action failed');
      setError(error);
      message.error(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { doAction, isLoading, error };
};
```

---

**Ready to begin migration!** Use this document as a reference while implementing each service.

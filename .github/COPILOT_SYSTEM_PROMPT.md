# GitHub Copilot CLI - Water Quality Monitoring System Super Prompt

**Version:** 1.0.0  
**Last Updated:** 2025-11-19  
**System:** IoT Water Quality Monitoring (Firebase + MQTT + React)

---

## System Overview

You are analyzing a **production-grade IoT water quality monitoring system** built with:
- **Frontend:** React 19 + TypeScript + Vite + Ant Design
- **Backend:** Firebase Functions (Node.js 20) + Firestore + Realtime Database
- **IoT Bridge:** MQTT Bridge (Cloud Run) + Google Cloud Pub/Sub
- **Devices:** ESP32-based water quality sensors (turbidity, TDS, pH)

---

## Architecture Principles (CRITICAL - ALWAYS FOLLOW)

### 1. Data Flow Pattern (STRICT)

```
IoT Device (MQTT) 
  → MQTT Bridge (Cloud Run) 
    → Pub/Sub (Google Cloud) 
      → Firebase Functions 
        → Firestore (metadata) / RTDB (sensor data) 
          → React Client (Firebase SDK)
```

**Rules:**
- **NEVER** bypass this flow
- **NEVER** allow direct device-to-Firestore writes
- **ALWAYS** validate at every layer

### 2. Client Architecture (Service → Hooks → UI)

```
services/*.Service.ts
  ↓ Firebase SDK / Axios calls
hooks/reads/useRealtime_*.ts  (real-time data)
hooks/writes/useCall_*.ts     (write operations)
  ↓ React hooks
pages/*/*.tsx                 (UI components)
```

**STRICT RULES:**
- ✅ **ONE COMPONENT = ONE FILE** (no exceptions)
- ✅ **GLOBAL HOOKS ONLY** (no local hook duplication)
- ✅ **SERVICE LAYER ONLY** imports Firebase/Axios
- ❌ **NEVER** import services directly in UI components
- ❌ **NEVER** define multiple components in one file

### 3. File Naming Conventions (MUST FOLLOW)

```
✅ services/alerts.Service.ts       → export alertsService
✅ services/devices.Service.ts      → export devicesService
✅ hooks/reads/useRealtime_Alerts.ts → export useRealtime_Alerts
✅ hooks/writes/useCall_Devices.ts   → export useCall_Devices
✅ schemas/alerts.schema.ts          → Alert types + Zod schemas
✅ ComponentName.tsx                 → export default ComponentName

❌ services/alertService.ts         (missing .Service suffix)
❌ hooks/reads/useRealtimeAlerts.ts (missing underscore)
❌ alert-component.tsx               (use PascalCase)
```

### 4. Code Quality Standards (NO EXCEPTIONS)

**DELETE, DON'T COMMENT:**
```typescript
// ❌ BAD
// const oldFunction = () => { ... };
// export const deprecatedHelper = () => { ... };

// ✅ GOOD
// Just delete it. Git history is your safety net.
```

**JSDoc for Exports:**
```typescript
// ✅ REQUIRED for all exports
/**
 * Acknowledges an alert and updates its status
 * @param alertId - The alert ID to acknowledge
 * @param acknowledgedBy - User ID performing acknowledgment
 * @returns Promise resolving when alert is acknowledged
 * @throws {HttpsError} If alert not found or update fails
 */
export const acknowledgeAlert = async (
  alertId: string,
  acknowledgedBy: string
): Promise<void> => {
  // Implementation
};
```

**NO Excessive Inline Comments:**
```typescript
// ❌ BAD - Obvious comments
const alerts = []; // Array to store alerts
setAlerts(data); // Set the alerts state

// ✅ GOOD - Self-documenting code
const [alerts, setAlerts] = useState<Alert[]>([]);
```

---

## Schema Definitions (MUST VALIDATE)

### Device Schema

**Client (Zod):**
```typescript
export const DeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  firmwareVersion: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  sensors: z.array(z.string()),
  status: z.enum(['online', 'offline', 'error', 'maintenance']),
  registeredAt: z.any(),
  lastSeen: z.any(),
  metadata: DeviceMetadataSchema.optional(),
});
```

**Functions (TypeScript):**
```typescript
export interface Device {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: "online" | "offline";
  registeredAt: any;
  lastSeen: any;
  updatedAt?: any;
  metadata: DeviceMetadata;
}
```

**CONSISTENCY RULE:** Functions types are source of truth. Client schemas must validate against Functions types.

### Alert Schema

**Client + Functions (Identical):**
```typescript
export interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  deviceBuilding?: string;
  deviceFloor?: string;
  parameter: 'tds' | 'ph' | 'turbidity';
  alertType: 'threshold' | 'trend';
  severity: 'Advisory' | 'Warning' | 'Critical';
  status: 'Active' | 'Acknowledged' | 'Resolved';
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: 'increasing' | 'decreasing' | 'stable';
  message: string;
  recommendedAction: string;
  createdAt: FirebaseTimestamp;
  acknowledgedAt?: FirebaseTimestamp;
  acknowledgedBy?: string;
  resolvedAt?: FirebaseTimestamp;
  resolvedBy?: string;
  resolutionNotes?: string;
  notificationsSent: string[];
  metadata?: Record<string, any>;
}
```

### Sensor Data Schema

**MQTT Payload:**
```javascript
// Topic: device/sensordata/{deviceId}
{
  "turbidity": 5.2,   // NTU
  "tds": 250,         // ppm
  "ph": 7.0,          // 0-14
  "timestamp": 1700000000000
}
```

**Functions Processing:**
```typescript
export interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt?: any; // RTDB ServerValue
}
```

**VALIDATION RULES:**
- `turbidity >= 0`
- `tds >= 0`
- `ph >= 0 && ph <= 14`
- `timestamp` within ±5 minutes of server time

---

## Key Functions & Responsibilities

### Firebase Functions

**Callable Functions:**
```typescript
// AlertsCalls
actions: 'acknowledgeAlert' | 'resolveAlert' | 'listAlerts'

// DevicesCalls
actions: 'updateDevice' | 'deleteDevice'

// UserCalls
actions: 'updateStatus' | 'updateUser' | 'updateUserProfile' | 'deleteUser' | 'setupPreferences'

// ReportCalls
actions: 'generateWaterQualityReport' | 'generateDeviceStatusReport' | 'generateDataSummaryReport' | 'generateComplianceReport'
```

**Pub/Sub Triggers:**
```typescript
// processSensorData (CRITICAL)
- Topic: 'iot-sensor-readings'
- Validates device exists and is registered
- Stores in RTDB (latest + history)
- Updates device status (throttled to 5 min)
- Checks thresholds with cache-based debouncing (5 min cooldown)
- Creates alerts with transaction-based duplication prevention
- Sends email notifications with circuit breaker

// autoRegisterDevice
- Topic: 'iot-device-registration'
- Creates UNREGISTERED device entries (no location)
- Updates lastSeen for existing devices
- Requires manual admin registration to collect data
```

**Auth Triggers:**
```typescript
// beforeCreate
- Validates email domain
- Sets default status: "Pending"
- Sets default role: "Staff"

// beforeSignIn (BLOCKING)
- Checks user status
- Blocks "Pending" and "Suspended" users
- Sets custom claims: { role, status }
```

**Scheduled Functions:**
```typescript
// checkOfflineDevices
- Runs every 10 minutes
- Marks devices offline if lastSeen > 10 minutes

// sendUnifiedAnalytics
- Daily/Weekly/Monthly reports
- Email digest to subscribed users
```

### MQTT Bridge (Cloud Run)

**Responsibilities:**
- Subscribe to MQTT broker (HiveMQ Cloud)
- Buffer messages (5 sec intervals, 100 msg max)
- Publish to Pub/Sub in batches
- Monitor memory/CPU (256MB RAM limit)
- Circuit breaker for Pub/Sub failures
- Health endpoint: `GET /health`

**Topic Mappings:**
```javascript
'device/sensordata/+' → 'iot-sensor-readings'
'device/registration/+' → 'iot-device-registration'
```

**Optimization Strategies:**
- Adaptive buffer flushing (70% threshold)
- Circuit breaker (50% error rate, 30s reset)
- Memory monitoring (flush at 90% usage)
- CPU tracking (degrade at 85%)

---

## Critical Optimization Patterns (MUST PRESERVE)

### 1. Alert Debouncing (Cache-Based)

```typescript
// Prevents duplicate alerts within 5 minutes
const alertCache = new CacheManager<number>(
  300000, // 5 min TTL
  1000
);

const cacheKey = `${deviceId}-${parameter}`;
if (alertCache.get(cacheKey)) {
  return; // Skip alert creation
}
// Create alert
alertCache.set(cacheKey, Date.now());
```

**DO NOT REMOVE** - Reduces Firestore writes by 50-70%

### 2. Alert Duplication Prevention (Transaction-Based)

```typescript
// Atomic check-and-create prevents race conditions
await db.runTransaction(async (transaction) => {
  const existing = await transaction.get(
    db.collection('alerts')
      .where('deviceId', '==', deviceId)
      .where('parameter', '==', parameter)
      .where('status', '==', 'Active')
      .limit(1)
  );
  
  if (!existing.empty) {
    return null; // Duplicate exists
  }
  
  transaction.set(newAlertRef, alertData);
  return newAlertRef.id;
});
```

**DO NOT REMOVE** - Prevents alert spam

### 3. Firestore Write Throttling

```typescript
// Only update device status if lastSeen > 5 minutes old
const LASTSEEN_UPDATE_THRESHOLD_MS = 5 * 60 * 1000;

if (timeSinceLastUpdate >= LASTSEEN_UPDATE_THRESHOLD_MS) {
  await deviceRef.update({
    lastSeen: FieldValue.serverTimestamp(),
    status: 'online'
  });
}
```

**DO NOT REMOVE** - Reduces Firestore writes by ~70%

### 4. History Storage Filtering

```typescript
// Only store every 5th reading
const HISTORY_STORAGE_INTERVAL = 5;

if (readingCount % HISTORY_STORAGE_INTERVAL === 0) {
  await rtdb.ref(`sensorReadings/${deviceId}/history`).push(readingData);
}
```

**DO NOT REMOVE** - Reduces RTDB writes by 80%

---

## Security Rules (ENFORCE)

### Authentication Flow

```
User Signs Up
  → beforeCreate (validate email, set Pending status)
    → Auth account created
      → Firestore user document created
        → User tries to sign in
          → beforeSignIn (check status, block if Pending/Suspended)
            → If Approved: set custom claims { role, status }
              → Client receives ID token with claims
                → Route protection based on role
```

### Authorization Checks

**Functions (ALWAYS REQUIRED):**
```typescript
const { auth } = req;

if (!auth) {
  throw new HttpsError('unauthenticated', 'Must be logged in');
}

if (auth.token.role !== 'Admin') {
  throw new HttpsError('permission-denied', 'Admin role required');
}
```

**Client (React Router Guards):**
```typescript
if (role !== 'Admin') {
  return <Navigate to="/unauthorized" />;
}
```

### Input Validation (ALWAYS)

```typescript
// Device ID validation
export const isValidDeviceId = (deviceId: string): boolean => {
  return deviceId.length > 0 &&
         deviceId.length <= 128 &&
         /^[a-zA-Z0-9_-]+$/.test(deviceId);
};

// Sensor data validation
export const isValidSensorReading = (data: any): boolean => {
  return typeof data.turbidity === 'number' &&
         typeof data.tds === 'number' &&
         typeof data.ph === 'number' &&
         data.turbidity >= 0 &&
         data.tds >= 0 &&
         data.ph >= 0 &&
         data.ph <= 14;
};
```

### Secret Management (STRICT)

**✅ CORRECT:**
```typescript
// Firebase Functions
const EMAIL_USER_SECRET_REF = defineSecret('EMAIL_USER');
const EMAIL_PASSWORD_SECRET_REF = defineSecret('EMAIL_PASSWORD');

// Cloud Run
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;
```

**❌ NEVER:**
```typescript
const API_KEY = 'hardcoded-secret'; // NEVER DO THIS
```

---

## Common Issues & Solutions

### Issue 1: Device not collecting data

**Diagnosis:**
1. Check device exists in Firestore: `devices/{deviceId}`
2. Check device has location metadata: `metadata.location.building` and `metadata.location.floor`
3. Check device status: `status === 'online'`
4. Check MQTT Bridge logs: `/health` endpoint
5. Check Pub/Sub metrics: message age and backlog

**Solution:**
- If device unregistered: Admin must assign location via UI
- If MQTT disconnected: Check broker credentials
- If Pub/Sub backlog: Scale Functions instances

### Issue 2: Duplicate alerts

**Should NOT happen** - Anti-duplication logic in place:
1. Cache-based debouncing (5 min cooldown)
2. Transaction-based check-and-create
3. Firestore query for active alerts

**If it happens:**
- Check alertCache is functioning
- Check transaction isolation
- Verify no manual Firestore writes bypassing function

### Issue 3: High Firebase costs

**Check these optimizations are active:**
1. Alert debouncing cache (reduces Firestore reads)
2. Device status throttling (5 min threshold)
3. History storage filtering (every 5th reading)
4. MQTT buffer batching (reduces Pub/Sub messages)

**Monitor:**
- Firestore document writes/sec
- RTDB bandwidth usage
- Pub/Sub message count
- Function invocations

### Issue 4: Schema mismatch errors

**Root cause:** Client schema doesn't match Functions types

**Fix:**
1. Identify the schema drift (use this prompt's schema definitions)
2. Update client Zod schema to match Functions types
3. Update Functions types if client needs new fields
4. Run TypeScript compiler to catch type errors
5. Test end-to-end data flow

---

## Maintenance Checklist

### When Adding a New Feature

- [ ] Define types in `functions/src_new/types/` first
- [ ] Create Zod schema in `client/src/schemas/` matching Functions types
- [ ] Implement service function in `client/src/services/`
- [ ] Create global hook in `client/src/hooks/reads/` or `client/src/hooks/writes/`
- [ ] Export hook from `client/src/hooks/index.ts`
- [ ] Use hook in UI component (not service directly)
- [ ] Add JSDoc to all exported functions
- [ ] Validate input at every layer
- [ ] Add error handling
- [ ] Test with invalid data
- [ ] Update this prompt with new patterns

### When Refactoring

- [ ] Run TypeScript compiler first (`tsc --noEmit`)
- [ ] Delete dead code (don't comment out)
- [ ] Remove unused imports
- [ ] Update JSDoc if signature changes
- [ ] Check for dependent code before deleting
- [ ] Run linter after changes
- [ ] Test affected features manually
- [ ] Update documentation

### When Debugging

- [ ] Check Firebase Functions logs (Cloud Console)
- [ ] Check MQTT Bridge health: `GET /health`
- [ ] Verify Pub/Sub message age and backlog
- [ ] Check Firestore/RTDB document structure
- [ ] Validate data against schemas
- [ ] Review error classification in logs
- [ ] Check circuit breaker state
- [ ] Monitor memory/CPU usage (Bridge)

---

## Analysis Commands

### Audit Schema Consistency

```bash
# Compare client schemas with Functions types
diff -u \
  <(grep -A 50 "export interface Device" functions/src_new/types/Device.Types.ts) \
  <(grep -A 50 "export const DeviceSchema" client/src/schemas/deviceManagement.schema.ts)
```

### Find Dead Code

```bash
# Find unused exports (requires ts-prune)
npx ts-prune

# Find unused imports (requires ESLint)
npm run lint -- --fix

# Find unreferenced files
find client/src -name "*.tsx" -o -name "*.ts" | while read file; do
  grep -rq "$(basename "$file" .tsx .ts)" client/src || echo "Unused: $file"
done
```

### Validate Data Flow

```bash
# Trace sensor data flow
echo "1. Check MQTT Bridge health"
curl http://<bridge-url>/health

echo "2. Check Pub/Sub backlog"
gcloud pubsub topics list

echo "3. Check Functions logs"
gcloud functions logs read processSensorData --limit 50

echo "4. Check Firestore device"
firebase firestore:read devices/{deviceId}

echo "5. Check RTDB reading"
firebase database:get /sensorReadings/{deviceId}/latest
```

---

## Emergency Procedures

### High Memory Usage (MQTT Bridge)

```bash
# Check memory status
curl http://<bridge-url>/health

# If RSS > 90%:
# - Bridge will auto-flush buffers
# - Circuit breaker may open
# - Scale up Cloud Run memory limit
gcloud run services update mqtt-bridge --memory 512Mi
```

### Alert Spam (Too Many Alerts)

```bash
# Check alert cache status (in Functions logs)
# Look for: cacheStats in processSensorData logs

# If cache not working:
# - Check CacheManager initialization
# - Verify TTL is 300000 (5 min)
# - Check cache size limit (1000)
# - Manually clear cache (restart function)
```

### Device Stuck "Unregistered"

```bash
# Check device metadata
firebase firestore:read devices/{deviceId}

# Should have:
# metadata.location.building = "..."
# metadata.location.floor = "..."

# If missing, admin must assign via UI:
# AdminDeviceManagement → Click device → Assign Location
```

---

## Testing Strategy

### Unit Tests (TODO - Not Implemented)

```typescript
// Example: Test threshold validation
describe('thresholdHelpers', () => {
  it('should detect pH threshold violation', () => {
    const result = checkThreshold('ph', 9.5, thresholds);
    expect(result.exceeded).toBe(true);
    expect(result.severity).toBe('Critical');
  });
});
```

### Integration Tests (TODO)

```typescript
// Example: Test callable function
describe('AlertsCalls', () => {
  it('should acknowledge alert', async () => {
    const result = await AlertsCalls({
      action: 'acknowledgeAlert',
      alertId: 'test-alert-id'
    });
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests (TODO)

```typescript
// Example: Test alert workflow
describe('Alert Workflow', () => {
  it('should create alert when threshold exceeded', async () => {
    // 1. Publish sensor data to MQTT
    // 2. Wait for processSensorData to run
    // 3. Verify alert created in Firestore
    // 4. Verify email notification sent
    // 5. Acknowledge alert via UI
    // 6. Verify status changed to "Acknowledged"
  });
});
```

---

## Performance Benchmarks

### Target Metrics

```yaml
Sensor Data Ingestion:
  - MQTT → Bridge: < 100ms
  - Bridge → Pub/Sub: < 500ms
  - Pub/Sub → Function: < 1s
  - Function execution: < 3s
  - End-to-end: < 5s

Alert Creation:
  - Threshold check: < 50ms
  - Duplication check: < 100ms
  - Transaction: < 200ms
  - Email notification: < 1s
  - Total: < 2s

Client UI:
  - Initial page load: < 3s
  - Real-time update latency: < 500ms
  - Chart rendering: < 1s

MQTT Bridge:
  - Memory usage: < 200MB (256MB limit)
  - CPU usage: < 50% (sustained)
  - Buffer flush: < 1s
  - Circuit breaker closed: 99.9% uptime
```

### Monitoring Queries

```javascript
// Pub/Sub message age (Cloud Monitoring)
fetch:pubsub.googleapis.com/Topic
| metric 'pubsub.googleapis.com/topic/oldest_unacked_message_age'
| filter resource.topic_id == 'iot-sensor-readings'
| group_by 1m, [value_oldest_unacked_message_age_mean]

// Function execution time
fetch:cloud_function
| metric 'cloudfunctions.googleapis.com/function/execution_times'
| filter resource.function_name == 'processSensorData'
| group_by 1m, [value_execution_times_mean]

// MQTT Bridge memory
# Check /health endpoint programmatically
curl -s http://<bridge-url>/health | jq '.memory.utilization'
```

---

## Known Limitations

1. **Manual Device Registration Required**
   - Devices auto-create unregistered entries but cannot collect data until admin assigns location
   - This is intentional for security/compliance

2. **5-Minute Alert Cooldown**
   - Cannot create same alert type within 5 minutes
   - This is intentional to prevent spam

3. **History Storage Sampling**
   - Only stores every 5th reading in history
   - Latest reading is always stored (real-time)
   - This is intentional to reduce storage costs

4. **Email Notification Delays**
   - Circuit breaker may delay notifications if email service is down
   - This is intentional for fault tolerance

5. **MQTT Bridge Memory Limit**
   - 256MB RAM on Cloud Run (basic tier)
   - Handles 10-15 devices comfortably
   - Scale up for more devices

---

## Version History

**v1.0.0 (2025-11-19)**
- Initial system analysis
- Comprehensive architecture documentation
- Schema consistency validation
- Security audit
- Performance optimization patterns
- Maintenance procedures

---

## Quick Reference

### File Locations

```
Client:
  schemas/    → Zod validation schemas
  services/   → Firebase SDK / Axios calls
  hooks/      → Global hooks (reads + writes)
  pages/      → UI components
  
Functions:
  types/      → TypeScript interfaces
  callable/   → HTTP Callable Functions
  pubsub/     → Pub/Sub triggers
  auth/       → Auth triggers
  schedulers/ → Scheduled functions
  utils/      → Shared utilities
  
MQTT Bridge:
  index.js    → Main service (monolithic)
```

### Common Commands

```bash
# Deploy entire system
npm run deploy:firebase

# Deploy MQTT Bridge
npm run deploy:mqtt-bridge

# Check Functions logs
firebase functions:log --limit 100

# Check Firestore data
firebase firestore:read devices
firebase firestore:read alerts

# Check RTDB data
firebase database:get /sensorReadings

# Health check
curl http://<bridge-url>/health
```

---

## Final Notes

This system is **production-ready** with minor improvements needed:
1. Add unit tests
2. Document Firestore security rules
3. Set up monitoring alerts
4. Add error boundaries in UI

**When in doubt:**
- Follow the data flow diagram (MQTT → Bridge → Pub/Sub → Functions → Firestore/RTDB → Client)
- Validate against schemas at every layer
- Preserve optimization patterns (cache, throttle, batch)
- Test with invalid data
- Check logs at each step

**Always remember:**
- ONE COMPONENT = ONE FILE
- GLOBAL HOOKS ONLY
- SERVICE LAYER for Firebase/Axios
- JSDoc for exports
- DELETE dead code (don't comment)

---

**End of Super Prompt**

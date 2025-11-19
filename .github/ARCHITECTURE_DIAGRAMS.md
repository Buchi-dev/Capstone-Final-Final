# Water Quality Monitoring System - Architecture Visualization

## System Overview Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      IoT DEVICE LAYER (Edge)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │
│  │  ESP32      │  │  ESP32      │  │  ESP32      │  ... (10-15 devices)│
│  │  Device 1   │  │  Device 2   │  │  Device N   │                     │
│  │             │  │             │  │             │                     │
│  │  Sensors:   │  │  Sensors:   │  │  Sensors:   │                     │
│  │  • Turbidity│  │  • Turbidity│  │  • Turbidity│                     │
│  │  • TDS      │  │  • TDS      │  │  • TDS      │                     │
│  │  • pH       │  │  • pH       │  │  • pH       │                     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                     │
│         │                │                │                              │
│         │ MQTT Publish   │ MQTT Publish   │ MQTT Publish                │
│         │ QoS: 0         │ QoS: 0         │ QoS: 0                      │
│         └────────────────┴────────────────┘                              │
│                          │                                               │
└──────────────────────────┼───────────────────────────────────────────────┘
                           │
                           │ device/sensordata/{deviceId}
                           │ { turbidity, tds, ph, timestamp }
                           ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      MQTT BROKER (Cloud)                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│                    ┌─────────────────────┐                               │
│                    │  HiveMQ Cloud       │                               │
│                    │  (Managed Service)  │                               │
│                    │                     │                               │
│                    │  • TLS/SSL          │                               │
│                    │  • Authentication   │                               │
│                    │  • QoS Management   │                               │
│                    │  • Topic Routing    │                               │
│                    └──────────┬──────────┘                               │
│                               │                                           │
└───────────────────────────────┼───────────────────────────────────────────┘
                                │
                                │ MQTT Subscribe
                                │ Pattern: device/sensordata/+
                                │          device/registration/+
                                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      MQTT BRIDGE (Cloud Run)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │  Node.js Service (256MB RAM)                             │            │
│  │  • MQTT Client (mqtt npm package)                        │            │
│  │  • Message Buffer (5s intervals, 100 msg max)            │            │
│  │  • Pub/Sub Publisher (batch: 100 msgs)                   │            │
│  │  • Circuit Breaker (Opossum)                             │            │
│  │  • Memory/CPU Monitoring                                 │            │
│  │                                                           │            │
│  │  Topic Mappings:                                          │            │
│  │    device/sensordata/+     → iot-sensor-readings         │            │
│  │    device/registration/+   → iot-device-registration     │            │
│  │                                                           │            │
│  │  Health Endpoint: GET /health                            │            │
│  │  Metrics Endpoint: GET /metrics (Prometheus)             │            │
│  └──────────────────────────────────────────────────────────┘            │
│                               │                                           │
└───────────────────────────────┼───────────────────────────────────────────┘
                                │
                                │ Pub/Sub Publish (Batch)
                                │ Attributes: { device_id, timestamp, source }
                                │ Data: JSON payload
                                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    GOOGLE CLOUD PUB/SUB                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────┐     ┌──────────────────────────┐           │
│  │  iot-sensor-readings    │     │  iot-device-registration │           │
│  │  (High Volume)          │     │  (Low Volume)            │           │
│  │                         │     │                          │           │
│  │  • Sensor data messages │     │  • Device info messages  │           │
│  │  • ~100-500 msgs/min    │     │  • ~1-10 msgs/hour       │           │
│  │  • Batch delivery       │     │  • Single delivery       │           │
│  └────────────┬────────────┘     └────────────┬─────────────┘           │
│               │                                │                          │
└───────────────┼────────────────────────────────┼──────────────────────────┘
                │                                │
                │ Event Trigger                  │ Event Trigger
                ↓                                ↓
┌───────────────────────────────────┐  ┌─────────────────────────────────┐
│  processSensorData Function       │  │  autoRegisterDevice Function    │
│  • Validate device exists         │  │  • Check device exists          │
│  • Check device registered        │  │  • Update lastSeen              │
│  • Store in RTDB (latest+history) │  │  • Create unregistered entry    │
│  • Update device status           │  │  • Require manual registration  │
│  • Check thresholds (cached)      │  │                                 │
│  • Create alerts (transaction)    │  └─────────────────────────────────┘
│  • Send notifications             │
└───────────────┬───────────────────┘
                │
                ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE BACKEND LAYER                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────┐         ┌────────────────────────────┐         │
│  │  Firestore          │         │  Realtime Database (RTDB)  │         │
│  │  (Metadata)         │         │  (Time-Series Data)        │         │
│  │                     │         │                            │         │
│  │  Collections:       │         │  Paths:                    │         │
│  │  • devices/         │         │  • /sensorReadings/        │         │
│  │  • alerts/          │         │    {deviceId}/             │         │
│  │  • users/           │         │      latest: {...}         │         │
│  │  • notificationPref │         │      history/              │         │
│  │                     │         │        -Push1: {...}       │         │
│  │  Real-time Updates  │         │        -Push2: {...}       │         │
│  │  via Listeners      │         │                            │         │
│  └─────────────────────┘         │  Real-time Streams         │         │
│                                   │  via Listeners             │         │
│                                   └────────────────────────────┘         │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Firebase Functions (Node.js 20)                                 │   │
│  │                                                                   │   │
│  │  Callable Functions:                                             │   │
│  │  • AlertsCalls     → acknowledge, resolve, list alerts           │   │
│  │  • DevicesCalls    → update, delete devices                      │   │
│  │  • UserCalls       → manage users, preferences                   │   │
│  │  • ReportCalls     → generate reports (water quality, status)    │   │
│  │                                                                   │   │
│  │  Auth Triggers:                                                  │   │
│  │  • beforeCreate    → validate new user, set defaults             │   │
│  │  • beforeSignIn    → check status, set custom claims             │   │
│  │                                                                   │   │
│  │  Firestore Triggers:                                             │   │
│  │  • syncUserClaims  → keep auth claims in sync                    │   │
│  │                                                                   │   │
│  │  Scheduled Functions:                                            │   │
│  │  • checkOfflineDevices   → mark devices offline (every 10 min)   │   │
│  │  • sendUnifiedAnalytics  → daily/weekly/monthly reports          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                   │                                       │
└───────────────────────────────────┼───────────────────────────────────────┘
                                    │
                                    │ Firebase SDK (Real-time Listeners)
                                    │ HTTP Callable Functions
                                    │ Authentication (JWT Tokens)
                                    ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      WEB CLIENT (React Application)                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  React 19 + TypeScript + Vite + Ant Design                       │   │
│  │                                                                   │   │
│  │  Architecture: Service → Global Hooks → UI Components            │   │
│  │                                                                   │   │
│  │  Services Layer:                                                 │   │
│  │  • alertsService     → Firebase Callable Functions               │   │
│  │  • devicesService    → Firebase Callable + Firestore             │   │
│  │  • usersService      → Firebase Callable Functions               │   │
│  │  • reportsService    → Firebase Callable Functions               │   │
│  │  • mqttService       → Axios HTTP API (Bridge health)            │   │
│  │                                                                   │   │
│  │  Global Hooks Layer:                                             │   │
│  │  • hooks/reads/      → Real-time Firestore/RTDB listeners        │   │
│  │    - useRealtime_Alerts()                                        │   │
│  │    - useRealtime_Devices()                                       │   │
│  │    - useRealtime_Users()                                         │   │
│  │    - useRealtime_MQTTMetrics()                                   │   │
│  │  • hooks/writes/     → Write operations with loading/error states│   │
│  │    - useCall_Alerts()                                            │   │
│  │    - useCall_Devices()                                           │   │
│  │    - useCall_Users()                                             │   │
│  │    - useCall_Reports()                                           │   │
│  │                                                                   │   │
│  │  Pages/Components:                                               │   │
│  │  • AdminDashboard         → Real-time overview                   │   │
│  │  • AdminDeviceManagement  → Device CRUD + registration           │   │
│  │  • AdminDeviceReadings    → Live sensor data + charts            │   │
│  │  • AdminAlerts            → Alert management + acknowledgment    │   │
│  │  • AdminReports           → Report generation + export           │   │
│  │  • AdminUserManagement    → User approval + role assignment      │   │
│  │  • AdminSettings          → Notification preferences             │   │
│  │  • StaffDashboard         → Limited view for staff               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Deployed on: Firebase Hosting                                           │
│  URL: https://<project-id>.web.app                                       │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Sensor Data Flow (Real-time Monitoring)

```
┌─────────┐
│ ESP32   │ Measures water quality parameters
│ Device  │ (turbidity, TDS, pH)
└────┬────┘
     │ 1. MQTT Publish
     │    Topic: device/sensordata/{deviceId}
     │    Payload: { turbidity: 5.2, tds: 250, ph: 7.0, timestamp: 1700000000000 }
     │    QoS: 0 (fire and forget)
     ↓
┌─────────┐
│ MQTT    │ Message received
│ Broker  │
└────┬────┘
     │ 2. MQTT Subscribe
     │    Pattern: device/sensordata/+
     ↓
┌─────────┐
│ MQTT    │ Buffer message (5 sec intervals)
│ Bridge  │ Adaptive flushing at 70% capacity
└────┬────┘
     │ 3. Pub/Sub Publish (Batch)
     │    Topic: iot-sensor-readings
     │    Attributes: { device_id: "device123", timestamp, source: "mqtt-bridge" }
     │    Data: { turbidity: 5.2, tds: 250, ph: 7.0, timestamp: 1700000000000 }
     ↓
┌─────────┐
│ Pub/Sub │ Message queued
│ Topic   │
└────┬────┘
     │ 4. Event Trigger
     │    Topic: iot-sensor-readings
     ↓
┌─────────────────┐
│ processSensor   │ Function execution starts
│ Data Function   │
└────┬────────────┘
     │ 5. Validate device exists in Firestore
     │    Query: devices/{deviceId}
     ├─→ Not found? → Log warning, skip processing
     ├─→ Found but no location? → Update status only, skip data storage
     └─→ Found with location? → Continue processing
     │
     │ 6. Store in Realtime Database
     │    a) Latest reading (always):
     │       /sensorReadings/{deviceId}/latest = { turbidity, tds, ph, timestamp, receivedAt }
     │    b) History (every 5th reading):
     │       /sensorReadings/{deviceId}/history/-Push{N} = { ... }
     ↓
┌─────────────────┐
│ Update Device   │ 7. Update device status (throttled to 5 min)
│ Status          │    Firestore: devices/{deviceId}
│ (Throttled)     │    Update: { status: "online", lastSeen: serverTimestamp() }
└─────────────────┘
     │
     │ 8. Check thresholds for each parameter (tds, ph, turbidity)
     ├─→ Alert Cache Check (5 min cooldown)
     │   Key: "{deviceId}-{parameter}"
     │   ├─→ In cache? → Skip alert creation
     │   └─→ Not in cache? → Continue
     │
     ├─→ Threshold Exceeded?
     │   ├─→ Transaction: Check for existing active alert
     │   ├─→ Duplicate found? → Skip creation
     │   └─→ No duplicate? → Create new alert
     │
     ├─→ Trend Analysis (compare with history)
     │   ├─→ Significant trend detected?
     │   └─→ Create trend alert (if not in cooldown)
     │
     └─→ Send Email Notifications
         ├─→ Get eligible recipients (preferences + quiet hours)
         ├─→ Circuit breaker protection
         └─→ Update alert with notification tracking
     ↓
┌─────────────────┐
│ Firestore       │ 9. Alert created (if applicable)
│ alerts/         │    { alertId, deviceId, parameter, severity, status: "Active", ... }
└─────────────────┘
     │
     │ 10. Real-time listener in client
     ↓
┌─────────────────┐
│ React Client    │ 11. UI updates
│ Dashboard       │     • Chart updates with new reading
│                 │     • Alert notification appears
│                 │     • Device status badge updates
└─────────────────┘
```

**Optimizations Applied:**
- **Alert Debouncing:** 5-min cache cooldown (reduces Firestore writes by 50-70%)
- **Status Throttling:** Only update if lastSeen > 5 min old (reduces writes by ~70%)
- **History Filtering:** Store every 5th reading (reduces RTDB writes by 80%)
- **Transaction-Based Duplication Check:** Prevents race conditions
- **Circuit Breaker:** Email failures don't block sensor data processing

### 2. Device Registration Flow

```
┌─────────┐
│ ESP32   │ Device connects to MQTT broker
│ Device  │
└────┬────┘
     │ 1. MQTT Publish (on connect)
     │    Topic: device/registration/{deviceId}
     │    Payload: {
     │      deviceId: "device123",
     │      name: "Water Sensor A",
     │      type: "water_quality",
     │      firmwareVersion: "1.0.0",
     │      macAddress: "AA:BB:CC:DD:EE:FF",
     │      sensors: ["turbidity", "tds", "ph"]
     │    }
     │    QoS: 1 (at least once)
     ↓
┌─────────┐
│ MQTT    │
│ Bridge  │
└────┬────┘
     │ 2. Pub/Sub Publish
     │    Topic: iot-device-registration
     ↓
┌─────────────────┐
│ autoRegister    │ 3. Check if device exists
│ Device Function │    Firestore: devices/{deviceId}
└────┬────────────┘
     │
     ├─→ Device NOT EXISTS
     │   │ 4. Create UNREGISTERED entry
     │   │    Firestore: devices/{deviceId} = {
     │   │      deviceId, name, type, firmwareVersion,
     │   │      status: "online",
     │   │      metadata: {} // NO LOCATION - intentionally unregistered
     │   │    }
     │   └─→ Log: "Device created in UNREGISTERED state"
     │
     └─→ Device EXISTS
         │ 5. Update device status
         │    Firestore: devices/{deviceId}.update({
         │      status: "online",
         │      lastSeen: serverTimestamp()
         │    })
         │
         ├─→ Has location? → Log: "Device properly registered"
         └─→ No location? → Log: "Device UNREGISTERED (awaiting admin)"
     ↓
┌─────────────────┐
│ Admin UI        │ 6. Admin assigns location (MANUAL STEP)
│ (Required)      │    AdminDeviceManagement page
│                 │    Action: Assign Building + Floor
└────┬────────────┘
     │ 7. useCall_Devices().updateDevice()
     │    Callable Function: DevicesCalls
     │    Action: "updateDevice"
     │    Payload: {
     │      deviceId: "device123",
     │      deviceData: {
     │        metadata: {
     │          location: {
     │            building: "Building A",
     │            floor: "Floor 2"
     │          }
     │        }
     │      }
     │    }
     ↓
┌─────────────────┐
│ Firestore       │ 8. Device now REGISTERED
│ devices/        │    metadata.location = { building: "...", floor: "..." }
│ {deviceId}      │    ← Device can now collect sensor data
└─────────────────┘
```

**Registration Policy (STRICT):**
- Auto-registration creates **UNREGISTERED** entries (no location)
- Devices **CANNOT** collect sensor data until **MANUALLY** registered
- Admin **MUST** assign building + floor via UI
- `processSensorData` validates location before storing data

### 3. Alert Lifecycle Flow

```
┌─────────────────┐
│ Threshold       │ 1. Sensor reading exceeds threshold
│ Exceeded        │    e.g., pH = 9.5 (Critical: > 9.0)
└────┬────────────┘
     │
     │ 2. Alert Cache Check
     │    Key: "{deviceId}-ph"
     ├─→ In cache (within 5 min)? → SKIP alert creation
     └─→ Not in cache? → Continue
     ↓
┌─────────────────┐
│ Transaction     │ 3. Atomic Check-and-Create
│ Start           │    Query: alerts collection
└────┬────────────┘       WHERE deviceId == "device123"
     │                    AND parameter == "ph"
     │                    AND status == "Active"
     │                    LIMIT 1
     │
     ├─→ Duplicate found? → ABORT (return null)
     └─→ No duplicate? → CREATE new alert
         │
         │ 4. Create alert document
         │    Firestore: alerts/{alertId} = {
         │      alertId, deviceId, parameter: "ph",
         │      severity: "Critical",
         │      status: "Active",
         │      currentValue: 9.5,
         │      thresholdValue: 9.0,
         │      message: "Critical pH level detected",
         │      recommendedAction: "Immediate water quality inspection required",
         │      createdAt: serverTimestamp(),
         │      notificationsSent: [],
         │      ...
         │    }
         ↓
┌─────────────────┐
│ Get Eligible    │ 5. Query notification preferences
│ Recipients      │    Firestore: notificationPreferences/
│                 │    Filter by:
│                 │    • emailNotifications == true
│                 │    • alertSeverities includes "Critical"
│                 │    • parameters includes "ph"
│                 │    • devices includes "device123" (or empty = all devices)
│                 │    • Respect quiet hours
└────┬────────────┘
     │
     │ 6. Send email notifications (parallel)
     │    Use circuit breaker for fault tolerance
     ├─→ Email Service Available? → Send
     └─→ Email Service Down? → Circuit open, skip emails
     │
     │ 7. Update alert with notification tracking
     │    Firestore: alerts/{alertId}.update({
     │      notificationsSent: [...userIds]
     │    })
     ↓
┌─────────────────┐
│ Alert Cache     │ 8. Set cache key (5 min TTL)
│ Set             │    Key: "{deviceId}-ph"
│                 │    Value: timestamp
└─────────────────┘    → Prevents duplicate alerts for 5 minutes
     │
     │ 9. Real-time listener in client
     ↓
┌─────────────────┐
│ React Client    │ 10. Alert appears in UI
│ Dashboard       │     • Notification badge increments
│                 │     • Alert card displays in AdminAlerts page
│                 │     • Severity-colored indicator
└────┬────────────┘
     │
     │ 11. Admin acknowledges alert
     │     Action: Click "Acknowledge" button
     │     useCall_Alerts().acknowledgeAlert(alertId)
     ↓
┌─────────────────┐
│ Callable        │ 12. AlertsCalls Function
│ Function        │     Action: "acknowledgeAlert"
│ (AlertsCalls)   │     Update: {
└────┬────────────┘       status: "Acknowledged",
     │                    acknowledgedAt: serverTimestamp(),
     │                    acknowledgedBy: userId
     │                  }
     ↓
┌─────────────────┐
│ Firestore       │ 13. Alert status updated
│ alerts/         │     status: "Active" → "Acknowledged"
│ {alertId}       │
└────┬────────────┘
     │
     │ 14. Real-time listener updates UI
     ↓
┌─────────────────┐
│ React Client    │ 15. Alert badge/card updates
│ Dashboard       │     • Status changes to "Acknowledged"
│                 │     • Different color indicator
│                 │     • Moves to "Acknowledged" section
└─────────────────┘
     │
     │ 16. Later: Admin resolves alert
     │     Action: Click "Resolve" button + add notes
     │     useCall_Alerts().resolveAlert(alertId, notes)
     ↓
┌─────────────────┐
│ Callable        │ 17. AlertsCalls Function
│ Function        │     Action: "resolveAlert"
└────┬────────────┘     Update: {
     │                    status: "Resolved",
     │                    resolvedAt: serverTimestamp(),
     │                    resolvedBy: userId,
     │                    resolutionNotes: "..."
     │                  }
     ↓
┌─────────────────┐
│ Firestore       │ 18. Alert status updated
│ alerts/         │     status: "Acknowledged" → "Resolved"
│ {alertId}       │
└────┬────────────┘
     │
     │ 19. Alert lifecycle complete
     ↓
┌─────────────────┐
│ React Client    │ 20. Alert removed from active list
│ Dashboard       │     • Moved to history/resolved section
│                 │     • Badge decrements
└─────────────────┘
```

**Alert Anti-Duplication Strategy:**
1. **Cache-based Debouncing:** 5-min cooldown per device+parameter
2. **Transaction Isolation:** Atomic check-and-create prevents race conditions
3. **Firestore Query:** Check for existing active alerts before creation

### 4. Authentication & Authorization Flow

```
┌─────────────────┐
│ User Visits     │ 1. Navigate to web application
│ Login Page      │    URL: https://<project-id>.web.app/login
└────┬────────────┘
     │
     │ 2. User enters credentials
     │    Email: user@example.com
     │    Password: ********
     ↓
┌─────────────────┐
│ Firebase Auth   │ 3. signInWithEmailAndPassword()
│ SDK (Client)    │
└────┬────────────┘
     │ 4. Auth request sent to Firebase
     ↓
┌─────────────────┐
│ beforeSignIn    │ 5. Blocking Auth Trigger (Functions)
│ Function        │    Check user document in Firestore
└────┬────────────┘    Query: users/{userId}
     │
     ├─→ User NOT FOUND? → BLOCK (throw AuthBlockingError)
     │   Message: "User account not found"
     │
     ├─→ Status == "Pending"? → BLOCK
     │   Message: "Your account is pending approval. Please contact admin."
     │
     ├─→ Status == "Suspended"? → BLOCK
     │   Message: "Your account has been suspended. Contact admin."
     │
     └─→ Status == "Approved"? → ALLOW
         │ 6. Set custom claims
         │    customClaims = {
         │      role: userData.role, // "Admin" | "Staff"
         │      status: userData.status // "Approved"
         │    }
         │    auth.setCustomUserClaims(userId, customClaims)
         │
         │ 7. Allow sign-in
         └─→ return { customClaims }
     ↓
┌─────────────────┐
│ Firebase Auth   │ 8. ID Token issued
│ (Server)        │    Token contains custom claims:
│                 │    {
│                 │      sub: userId,
│                 │      email: "user@example.com",
│                 │      role: "Admin",
│                 │      status: "Approved"
│                 │    }
└────┬────────────┘
     │ 9. Token sent to client
     ↓
┌─────────────────┐
│ React Client    │ 10. onAuthStateChanged listener fires
│ AuthContext     │     Parse ID token claims
└────┬────────────┘     Extract: role, status, email
     │
     │ 11. Store auth state in React Context
     │     AuthContext = {
     │       user: { uid, email, ... },
     │       role: "Admin",
     │       status: "Approved",
     │       isAuthenticated: true
     │     }
     ↓
┌─────────────────┐
│ React Router    │ 12. Route protection
│ Guards          │
└────┬────────────┘
     │
     ├─→ Route requires "Admin" role?
     │   ├─→ Current role == "Admin"? → ALLOW
     │   └─→ Current role != "Admin"? → REDIRECT to /unauthorized
     │
     └─→ Public route? → ALLOW
     ↓
┌─────────────────┐
│ Protected Page  │ 13. User lands on dashboard
│ (AdminDashboard)│     Access granted based on role
└─────────────────┘
     │
     │ 14. User makes API call (e.g., update device)
     │     useCall_Devices().updateDevice(...)
     ↓
┌─────────────────┐
│ Callable        │ 15. Function receives request
│ Function        │     req.auth = {
│ (DevicesCalls)  │       uid: userId,
│                 │       token: {
│                 │         role: "Admin",
│                 │         status: "Approved"
│                 │       }
│                 │     }
└────┬────────────┘
     │ 16. Authorization check
     │     if (!req.auth) throw HttpsError('unauthenticated')
     │     if (req.auth.token.role !== 'Admin') throw HttpsError('permission-denied')
     │
     │ 17. Authorized → Proceed with operation
     ↓
┌─────────────────┐
│ Firestore       │ 18. Update device document
│ devices/        │     devices/{deviceId}.update({ ... })
│ {deviceId}      │
└────┬────────────┘
     │ 19. Success response
     ↓
┌─────────────────┐
│ React Client    │ 20. UI updates
│ Component       │     Success message displayed
└─────────────────┘     Real-time listener reflects changes
```

**Security Layers:**
1. **Client-Side Route Guards:** Prevent unauthorized access to UI
2. **Firebase Auth Blocking Triggers:** Server-side validation before auth
3. **Custom Claims:** Role/status embedded in ID token (stateless)
4. **Function Authorization:** Check claims on every request
5. **Firestore Security Rules:** Document-level access control (not shown here)

### 5. Report Generation Flow

```
┌─────────────────┐
│ Admin UI        │ 1. User selects report parameters
│ AdminReports    │    • Report type: "water_quality"
│ Page            │    • Devices: ["device1", "device2", "device3"]
│                 │    • Date range: [2025-01-01, 2025-01-31]
│                 │    • Include charts: true
└────┬────────────┘
     │ 2. User clicks "Generate Report"
     │    useCall_Reports().generateReport({ ... })
     ↓
┌─────────────────┐
│ Service Layer   │ 3. reportsService.generateWaterQualityReport()
│ (reports.       │    Calls Firebase Callable Function
│  Service.ts)    │
└────┬────────────┘
     │ 4. HTTPS Callable Request
     │    Function: ReportCalls
     │    Payload: {
     │      action: "generateWaterQualityReport",
     │      reportType: "water_quality",
     │      deviceIds: ["device1", "device2", "device3"],
     │      startDate: 1704067200000,
     │      endDate: 1706745599000,
     │      includeCharts: true
     │    }
     ↓
┌─────────────────┐
│ ReportCalls     │ 5. Switch on action type
│ Function        │    Route to handleGenerateWaterQualityReport()
└────┬────────────┘
     │ 6. Fetch device metadata from Firestore
     │    Query: devices collection
     │    Filter: deviceId IN ["device1", "device2", "device3"]
     │    Get: name, location, sensors, status
     ↓
┌─────────────────┐
│ Firestore       │ 7. Return device documents
│ devices/        │    [{ deviceId: "device1", name: "Sensor A", ... }, ...]
└────┬────────────┘
     │
     │ 8. For each device, fetch sensor readings
     │    Query: Realtime Database
     │    Path: /sensorReadings/{deviceId}/history
     │    Filter: timestamp >= startDate AND timestamp <= endDate
     ↓
┌─────────────────┐
│ Realtime DB     │ 9. Return historical readings
│ /sensorReadings │    [{ turbidity, tds, ph, timestamp, receivedAt }, ...]
└────┬────────────┘
     │
     │ 10. Fetch alerts for devices in date range
     │     Query: Firestore alerts collection
     │     Filter: deviceId IN ["device1", ...] AND
     │             createdAt >= startDate AND createdAt <= endDate
     ↓
┌─────────────────┐
│ Firestore       │ 11. Return alert documents
│ alerts/         │     [{ alertId, deviceId, severity, parameter, ... }, ...]
└────┬────────────┘
     │
     │ 12. Process data for each device
     │     For device1:
     │       • Calculate metrics:
     │         - avgPH, minPH, maxPH
     │         - avgTDS, minTDS, maxTDS
     │         - avgTurbidity, minTurbidity, maxTurbidity
     │         - totalReadings count
     │       • Map alerts to simplified format
     │       • Prepare device summary
     ↓
┌─────────────────┐
│ Data            │ 13. Aggregate overall summary
│ Aggregation     │     • Total devices: 3
│                 │     • Total readings: 1,234
│                 │     • Average pH: 7.2
│                 │     • Average TDS: 230 ppm
│                 │     • Average turbidity: 3.5 NTU
└────┬────────────┘
     │ 14. Build report data structure
     │     reportData = {
     │       reportType: "water_quality",
     │       period: {
     │         start: "2025-01-01",
     │         end: "2025-01-31"
     │       },
     │       devices: [
     │         {
     │           deviceId: "device1",
     │           deviceName: "Sensor A",
     │           location: "Building A, Floor 2",
     │           metrics: { avgPH: 7.1, ... },
     │           readings: [...],
     │           alerts: [...]
     │         },
     │         ...
     │       ],
     │       summary: { totalDevices: 3, totalReadings: 1234, ... }
     │     }
     │
     │ 15. Return response
     │     return { success: true, data: reportData }
     ↓
┌─────────────────┐
│ React Client    │ 16. Receive report data
│ AdminReports    │     Display in UI:
│ Page            │     • Summary cards (totals, averages)
│                 │     • Device-specific tables
│                 │     • Charts (if includeCharts: true)
│                 │     • Alert list per device
└────┬────────────┘
     │ 17. User clicks "Export to PDF"
     │     Use jsPDF library to generate PDF
     │     • Format data into tables
     │     • Add charts as images
     │     • Include metadata (generated date, user)
     │     • Trigger browser download
     ↓
┌─────────────────┐
│ PDF File        │ 18. PDF downloaded to user's device
│ Downloaded      │     Filename: water_quality_report_2025-01-31.pdf
└─────────────────┘
```

**Report Types Supported:**
1. **Water Quality Report:** Detailed sensor data analysis per device
2. **Device Status Report:** Device health, uptime, last seen
3. **Data Summary Report:** Statistical analysis (mean, median, std dev)
4. **Compliance Report:** WHO guideline compliance tracking

---

## Technology Stack Summary

### Client (Frontend)
```
┌────────────────────────────────────────┐
│  React 19.1.1                          │
│  TypeScript 5.9.3 (strict mode)        │
│  Vite 7.1.7 (build tool)               │
│  Ant Design 5.27.5 (UI components)     │
│  Zod 4.1.12 (schema validation)        │
│  Firebase SDK 12.4.0                   │
│  Axios 1.12.2 (HTTP client)            │
│  Recharts 3.3.0 (charting)             │
│  React Router 7.9.4 (routing)          │
│  jsPDF 3.0.3 (PDF export)              │
└────────────────────────────────────────┘
```

### Backend (Firebase Functions)
```
┌────────────────────────────────────────┐
│  Node.js 20                            │
│  TypeScript 5.2.0                      │
│  Firebase Admin SDK 12.0.0             │
│  Firebase Functions v2 (6.6.0)         │
│  Google Cloud Pub/Sub 4.1.0            │
│  Nodemailer 7.0.9 (email)              │
└────────────────────────────────────────┘
```

### MQTT Bridge (Cloud Run)
```
┌────────────────────────────────────────┐
│  Node.js 18+                           │
│  MQTT 5.3.0 (client)                   │
│  Google Cloud Pub/Sub 5.2.0            │
│  Express 4.19.2 (HTTP server)          │
│  Opossum 8.1.4 (circuit breaker)       │
│  Pino 10.1.0 (logging)                 │
│  Prom-client 15.1.3 (Prometheus)       │
└────────────────────────────────────────┘
```

### Database & Storage
```
┌────────────────────────────────────────┐
│  Firestore (NoSQL, metadata)           │
│  Realtime Database (time-series data)  │
│  Firebase Hosting (static web app)     │
│  Google Cloud Run (MQTT Bridge)        │
│  Google Cloud Pub/Sub (message queue)  │
│  HiveMQ Cloud (MQTT broker)            │
└────────────────────────────────────────┘
```

---

## Performance Optimization Summary

### Function-Level Optimizations
```
┌─────────────────────────────────────────────────────────┐
│  Alert Debouncing (CacheManager)                        │
│  • 5-min cooldown per device+parameter                  │
│  • Reduces Firestore writes by 50-70%                   │
│  • TTL: 300,000 ms, Max size: 1,000 entries             │
├─────────────────────────────────────────────────────────┤
│  Device Status Throttling                               │
│  • Only update if lastSeen > 5 min old                  │
│  • Reduces Firestore writes by ~70%                     │
│  • Threshold: 300,000 ms (5 minutes)                    │
├─────────────────────────────────────────────────────────┤
│  History Storage Filtering                              │
│  • Store every 5th reading in history                   │
│  • Reduces RTDB writes by 80%                           │
│  • Latest reading always stored (real-time)             │
├─────────────────────────────────────────────────────────┤
│  Transaction-Based Alert Creation                       │
│  • Atomic check-and-create prevents duplicates          │
│  • Firestore transaction for consistency                │
│  • Handles race conditions gracefully                   │
├─────────────────────────────────────────────────────────┤
│  Circuit Breaker (Email Notifications)                  │
│  • Timeout: 3s, Error threshold: 50%, Reset: 30s        │
│  • Prevents cascading failures                          │
│  • Non-blocking for sensor data processing              │
└─────────────────────────────────────────────────────────┘
```

### MQTT Bridge Optimizations
```
┌─────────────────────────────────────────────────────────┐
│  Message Buffering                                      │
│  • Interval: 5 seconds                                  │
│  • Max buffer: 100 messages                             │
│  • Adaptive flushing at 70% capacity                    │
│  • Reduces Pub/Sub publish calls                        │
├─────────────────────────────────────────────────────────┤
│  Batch Publishing                                       │
│  • Max messages per batch: 100                          │
│  • Max milliseconds: 100ms                              │
│  • Max bytes: 1MB                                       │
│  • Reduces network overhead                             │
├─────────────────────────────────────────────────────────┤
│  Memory Monitoring (Cloud Run 256MB)                    │
│  • Warning threshold: 90% (230MB)                       │
│  • Critical threshold: 95% (243MB)                      │
│  • Emergency flush at critical level                    │
│  • Prevents OOM crashes                                 │
├─────────────────────────────────────────────────────────┤
│  CPU Monitoring                                         │
│  • Warning threshold: 70%                               │
│  • Critical threshold: 85%                              │
│  • Tracks average and peak usage                        │
│  • Degrades gracefully under load                       │
├─────────────────────────────────────────────────────────┤
│  Circuit Breaker (Pub/Sub Publish)                      │
│  • Timeout: 3s, Error threshold: 50%, Reset: 30s        │
│  • Protects against Pub/Sub outages                     │
│  • Exponential backoff: 3 retries                       │
└─────────────────────────────────────────────────────────┘
```

### Client-Side Optimizations
```
┌─────────────────────────────────────────────────────────┐
│  Global Hooks (Single Subscription)                     │
│  • useRealtime_Devices(): One Firestore listener        │
│  • useRealtime_Alerts(): One Firestore listener         │
│  • Shared across all components                         │
│  • Reduces redundant subscriptions                      │
├─────────────────────────────────────────────────────────┤
│  React Memoization                                      │
│  • useMemo for expensive calculations                   │
│  • useCallback for event handlers                       │
│  • Prevents unnecessary re-renders                      │
├─────────────────────────────────────────────────────────┤
│  Vite Code Splitting                                    │
│  • Dynamic imports for routes                           │
│  • Lazy loading of large components                     │
│  • Reduces initial bundle size                          │
└─────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Authentication Layers
```
┌────────────────────────────────────────────────────────┐
│  1. Client-Side Route Guards (React Router)            │
│     • Check role/status in AuthContext                 │
│     • Redirect unauthorized users                      │
│     • First line of defense (can be bypassed)          │
├────────────────────────────────────────────────────────┤
│  2. Firebase Auth Blocking Triggers (Functions)        │
│     • beforeCreate: Validate new users                 │
│     • beforeSignIn: Check status, set claims           │
│     • Server-side enforcement (cannot bypass)          │
├────────────────────────────────────────────────────────┤
│  3. Custom Claims (ID Token)                           │
│     • role: "Admin" | "Staff"                          │
│     • status: "Pending" | "Approved" | "Suspended"     │
│     • Embedded in JWT token (stateless)                │
├────────────────────────────────────────────────────────┤
│  4. Function Authorization Checks                      │
│     • Verify req.auth exists                           │
│     • Check role in custom claims                      │
│     • Throw HttpsError if unauthorized                 │
├────────────────────────────────────────────────────────┤
│  5. Firestore Security Rules (Not shown in diagram)    │
│     • Document-level access control                    │
│     • Based on auth.uid and custom claims              │
│     • Fine-grained permissions                         │
└────────────────────────────────────────────────────────┘
```

### Input Validation Layers
```
┌────────────────────────────────────────────────────────┐
│  1. Client Schema Validation (Zod)                     │
│     • Validate before API call                         │
│     • Type-safe schemas                                │
│     • User-friendly error messages                     │
├────────────────────────────────────────────────────────┤
│  2. Functions Parameter Validation                     │
│     • Check required fields                            │
│     • Validate data types                              │
│     • Length/range checks                              │
├────────────────────────────────────────────────────────┤
│  3. Pub/Sub Message Validation                         │
│     • Device ID format check                           │
│     • Sensor value range validation                    │
│     • Timestamp drift detection                        │
├────────────────────────────────────────────────────────┤
│  4. Database Constraints                               │
│     • Firestore document schema                        │
│     • RTDB validation rules                            │
│     • Referential integrity checks                     │
└────────────────────────────────────────────────────────┘
```

### Secret Management
```
┌────────────────────────────────────────────────────────┐
│  Firebase Secret Manager (Functions)                   │
│  • EMAIL_USER (for nodemailer)                         │
│  • EMAIL_PASSWORD (for nodemailer)                     │
│  • Accessed via defineSecret()                         │
│  • Never logged or exposed                             │
├────────────────────────────────────────────────────────┤
│  Environment Variables (Cloud Run)                     │
│  • GCP_PROJECT_ID                                      │
│  • MQTT_BROKER_URL                                     │
│  • MQTT_USERNAME                                       │
│  • MQTT_PASSWORD                                       │
│  • Set via Cloud Console or gcloud CLI                 │
├────────────────────────────────────────────────────────┤
│  Client Environment Variables (Vite)                   │
│  • VITE_FIREBASE_API_KEY (public, safe to expose)      │
│  • VITE_FIREBASE_PROJECT_ID                            │
│  • VITE_FIREBASE_APP_ID                                │
│  • VITE_MQTT_BRIDGE_URL (for health checks)            │
└────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Logging Strategy
```
┌────────────────────────────────────────────────────────┐
│  Firebase Functions Logging                            │
│  • logger.info(): Normal operations, milestones        │
│  • logger.warn(): Recoverable errors, degraded state   │
│  • logger.error(): Critical errors, need investigation │
│  • logger.debug(): Development-only, verbose details   │
├────────────────────────────────────────────────────────┤
│  MQTT Bridge Logging (Pino)                            │
│  • level: 'error' (production)                         │
│  • Only critical errors logged                         │
│  • Reduces noise, focuses on failures                  │
├────────────────────────────────────────────────────────┤
│  Client Logging (Console)                              │
│  • Development: Verbose logging                        │
│  • Production: Errors only                             │
│  • Optional: Send to error tracking service            │
└────────────────────────────────────────────────────────┘
```

### Health Checks
```
┌────────────────────────────────────────────────────────┐
│  MQTT Bridge Health Endpoint                           │
│  GET /health                                           │
│  Response:                                             │
│  {                                                     │
│    status: "healthy" | "degraded" | "unhealthy",       │
│    timestamp: 1700000000000,                           │
│    uptime: "1h 23m 45s",                               │
│    memory: {                                           │
│      rss: "123 MB",                                    │
│      heapUsed: "89 MB",                                │
│      utilization: 48.05                                │
│    },                                                  │
│    cpu: {                                              │
│      current: 12.5,                                    │
│      average: 10.2,                                    │
│      peak: 25.0                                        │
│    },                                                  │
│    buffers: {                                          │
│      "iot-sensor-readings": 15,                        │
│      "iot-device-registration": 0                      │
│    },                                                  │
│    metrics: {                                          │
│      received: 12345,                                  │
│      published: 12300,                                 │
│      failed: 5,                                        │
│      flushes: 123,                                     │
│      circuitBreakerOpen: false                         │
│    }                                                   │
│  }                                                     │
└────────────────────────────────────────────────────────┘
```

### Metrics (Prometheus Format)
```
┌────────────────────────────────────────────────────────┐
│  MQTT Bridge Metrics Endpoint                          │
│  GET /metrics (Prometheus format)                      │
│                                                        │
│  mqtt_messages_received_total 12345                    │
│  mqtt_messages_published_total 12300                   │
│  mqtt_messages_failed_total 5                          │
│  mqtt_buffer_flushes_total 123                         │
│  mqtt_memory_rss_bytes 129024000                       │
│  mqtt_memory_heap_used_bytes 93323264                  │
│  mqtt_cpu_usage_percent 12.5                           │
│  mqtt_circuit_breaker_open 0                           │
└────────────────────────────────────────────────────────┘
```

---

**Generated:** 2025-11-19  
**System Version:** 1.0.0  
**Status:** Production-Ready

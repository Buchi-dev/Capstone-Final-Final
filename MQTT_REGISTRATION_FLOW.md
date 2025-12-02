# MQTT Device Registration Flow

## Overview
The device registration system has been updated to use a **client-driven architecture** where the frontend listens to MQTT for new device registrations instead of the server auto-creating devices in the database.

## Architecture Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐         ┌──────────────┐
│   Device    │ MQTT    │  HiveMQ      │  MQTT   │   Client    │  HTTP   │    Server    │
│  (Arduino)  ├────────►│   Broker     ├────────►│  (React)    ├────────►│   (Node.js)  │
└─────────────┘         └──────────────┘         └─────────────┘         └──────────────┘
     │                         │                         │                        │
     │ 1. Publish registration │                         │                        │
     │    to topic:            │                         │                        │
     │    devices/{id}/register│                         │                        │
     ├─────────────────────────►                         │                        │
     │                         │                         │                        │
     │                         │ 2. Forward message      │                        │
     │                         │    to subscribed client │                        │
     │                         ├─────────────────────────►                        │
     │                         │                         │                        │
     │                         │                         │ 3. Store in local state│
     │                         │                         │    Show notification   │
     │                         │                         │                        │
     │                         │                         │ 4. Admin assigns       │
     │                         │                         │    location & registers│
     │                         │                         ├────────────────────────►
     │                         │                         │                        │
     │                         │                         │    5. Save to database │
     │                         │                         │       isRegistered=true│
     │                         │                         ◄────────────────────────┤
     │                         │                         │                        │
```

## Components

### 1. Device (Arduino)
**File:** `device_config/Arduino_Uno_R4_Optimized.ino`

**Actions:**
- On startup, publishes registration message to `devices/{deviceId}/register`
- Message format:
```json
{
  "deviceId": "arduino_uno_r4_002",
  "name": "Water Quality Monitor R4",
  "type": "Arduino UNO R4 WiFi",
  "firmwareVersion": "8.1.0",
  "macAddress": "64:E8:33:5E:AF:E4",
  "ipAddress": "192.168.88.244",
  "sensors": ["pH", "turbidity", "tds"]
}
```

### 2. MQTT Broker (HiveMQ Cloud)
**Configuration:** `server/src/configs/mqtt.config.js`

**Topics:**
- `devices/+/register` - Device registration messages
- `devices/+/data` - Sensor data
- `devices/+/status` - Device status updates
- `devices/+/commands` - Commands to devices
- `devices/+/presence` - Device online/offline announcements

### 3. Client (React Frontend)

#### A. MQTT Hook - `useDeviceRegistrations`
**File:** `client/src/hooks/useDeviceRegistrations.ts`

**Purpose:** Listen to MQTT for device registration messages

**Features:**
- Subscribes to `devices/+/register` topic
- Validates incoming registration data
- Shows notification when new device detected
- Calls `onDeviceDetected` callback with device data

**Usage:**
```typescript
useDeviceRegistrations({
  enabled: true,
  onDeviceDetected: (device) => {
    console.log('New device detected:', device);
  }
});
```

#### B. Admin Component
**File:** `client/src/pages/admin/AdminDeviceManagement/AdminDeviceManagement.tsx`

**State Management:**
```typescript
const [unregisteredDevices, setUnregisteredDevices] = useState<DeviceRegistrationData[]>([]);
```

**Flow:**
1. Listens to MQTT via `useDeviceRegistrations` hook
2. When device detected:
   - Adds to `unregisteredDevices` state
   - Shows notification to admin
3. Device appears in "Unregistered" tab
4. Admin clicks "Register" → Opens modal
5. Admin assigns location (building/floor)
6. Calls API to save to database with `isRegistered=true`
7. Removes from MQTT list
8. Device moves to "Registered" tab

#### C. Device Filter Hook
**File:** `client/src/pages/admin/AdminDeviceManagement/hooks/useDeviceFilter.ts`

**Purpose:** Merge database devices with MQTT-detected devices

**Logic:**
- Filter devices from database by `isRegistered` flag
- Convert MQTT registration data to Device format
- Exclude MQTT devices that already exist in database
- Combine both lists for "Unregistered" tab

### 4. Server (Node.js Backend)

#### A. MQTT Service
**File:** `server/src/utils/mqtt.service.js`

**Changes:**
- **DISABLED** auto-registration when receiving MQTT message
- Server now only logs the registration message
- Does NOT call `deviceRegister()` automatically

**Code:**
```javascript
} else if (topic.includes('/register')) {
  // NOTE: Client-side now handles device registration via MQTT listener
  logger.info(`[MQTT Service] Device registration message received from ${deviceId} - handled by client`, data);
  // this.handleDeviceRegistration(deviceId, data); // DISABLED
}
```

#### B. Device Controller
**File:** `server/src/devices/device.Controller.js`

**Registration Endpoint:** `POST /api/devices/register`

**Flow:**
1. Receives registration request from client (after admin assigns location)
2. Creates device in database with:
   - `status: 'online'` (device is online if it can register)
   - `isRegistered: false` (not yet assigned location)
   - All device metadata from MQTT message
3. Returns created device

**Note:** The `isRegistered` flag is set to `true` later when admin assigns location via the registration modal.

## MQTT Topics Reference

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `devices/{id}/register` | Device → Broker → Client | Device announces itself for registration |
| `devices/{id}/data` | Device → Broker → Server | Sensor data readings |
| `devices/{id}/status` | Device → Broker → Server | Device status updates |
| `devices/{id}/commands` | Client/Server → Broker → Device | Commands (go, restart, etc.) |
| `devices/{id}/presence` | Device → Broker → Server | Online/offline announcements |

## Device Commands

The client can send commands directly via MQTT:

| Command | Purpose | Handler |
|---------|---------|---------|
| `go` | Start sensor reading cycle | Device firmware |
| `restart` | Reboot device | Device firmware |
| `send_now` | Send reading immediately | Device firmware |
| `deregister` | Reset device registration | Device firmware |

**Example:**
```typescript
import { sendDeregisterCommand } from '../utils/mqtt';

// Send deregister command before deleting
await sendDeregisterCommand(deviceId);
```

## Data Flow Examples

### Example 1: New Device Registration
```
1. Arduino boots up → Publishes to devices/arduino_uno_r4_003/register
2. Client receives message → Adds to unregisteredDevices state
3. Notification shown: "New device detected: Water Quality Monitor R4 (arduino_uno_r4_003)"
4. Admin sees device in "Unregistered" tab
5. Admin clicks "Register" → Modal opens
6. Admin selects Building A, Floor 1, adds notes
7. Client sends POST /api/devices/{deviceId}/register with location data
8. Server updates device: isRegistered=true, building='Building A', floor='Floor 1'
9. Client removes from MQTT list, refetches data
10. Device appears in "Registered" tab
```

### Example 2: Device Deletion
```
1. Admin clicks "Delete" on device
2. Confirmation modal shown
3. Admin confirms
4. If device is online:
   - Client sends "deregister" command via MQTT
   - Device receives command and resets itself
   - Wait 1.5 seconds
5. Client sends DELETE /api/devices/{deviceId}
6. Server deletes device from database
7. Client refetches device list
8. Device removed from UI
```

## Key Benefits

### Previous Architecture (Server-Driven)
❌ Server auto-creates device in database immediately
❌ Device shows as "unregistered" in database before admin assigns location
❌ Extra database entries for devices admin might not want to register
❌ No admin control over which devices get added

### New Architecture (Client-Driven)
✅ Client detects devices via MQTT
✅ Devices stored in local state only until admin registers
✅ Admin has full control over which devices to register
✅ Cleaner database - only registered devices saved
✅ Faster UI feedback - no API call needed to show new device
✅ Better separation of concerns

## Database Schema

```javascript
{
  deviceId: String,           // e.g., "arduino_uno_r4_002"
  name: String,               // e.g., "Water Quality Monitor R4"
  type: String,               // e.g., "Arduino UNO R4 WiFi"
  status: String,             // 'online' | 'offline' | 'maintenance'
  ipAddress: String,          // e.g., "192.168.88.244"
  macAddress: String,         // e.g., "64:E8:33:5E:AF:E4"
  firmwareVersion: String,    // e.g., "8.1.0"
  isRegistered: Boolean,      // true after admin assigns location
  registrationStatus: String, // 'registered' | 'pending'
  building: String,           // Assigned by admin
  floor: String,              // Assigned by admin
  notes: String,              // Optional notes from admin
  lastSeen: Date,             // Last activity timestamp
  createdAt: Date,
  updatedAt: Date
}
```

## Troubleshooting

### Device not appearing in "Unregistered" tab
1. Check MQTT connection in browser console
2. Verify device is publishing to correct topic: `devices/{deviceId}/register`
3. Check client is subscribed: Look for "[Device Registration] Subscribing to device registrations"
4. Verify MQTT broker credentials

### Device appears in database but not in UI
- This shouldn't happen with new architecture
- If it does, device was registered via old flow
- Check `isRegistered` field in database

### Duplicate devices appearing
- Hook prevents duplicates by checking deviceId
- If device is already in database, it won't show in MQTT list
- processedRegistrations map prevents duplicate processing (30s cooldown)

## Testing

### Test New Device Registration
```bash
# 1. Start client and server
# 2. Power on Arduino device
# 3. Watch for notification in UI
# 4. Check browser console for:
[Device Registration] New device detected: {...}
# 5. Verify device appears in "Unregistered" tab
# 6. Register device via modal
# 7. Verify device moves to "Registered" tab
```

### Test Client MQTT Listener
```javascript
// In browser console
console.log('MQTT Topics:', MQTT_TOPICS);
console.log('Connected:', mqtt.connected);
```

## Migration Notes

### For Existing Systems
If you have devices already registered via the old flow:
1. They will continue to work normally
2. New devices will use the client-driven flow
3. No migration needed - both flows compatible

### Reverting to Server-Driven
If needed, uncomment this line in `server/src/utils/mqtt.service.js`:
```javascript
this.handleDeviceRegistration(deviceId, data);
```

## Files Modified

### Created
- ✅ `client/src/hooks/useDeviceRegistrations.ts` - MQTT listener hook

### Modified
- ✅ `client/src/utils/mqtt.ts` - Added DEVICE_REGISTER topic
- ✅ `client/src/hooks/index.ts` - Export new hook
- ✅ `client/src/pages/admin/AdminDeviceManagement/AdminDeviceManagement.tsx` - Added MQTT listener and state
- ✅ `client/src/pages/admin/AdminDeviceManagement/hooks/useDeviceFilter.ts` - Merge MQTT + DB devices
- ✅ `server/src/utils/mqtt.service.js` - Disabled auto-registration

## Security Considerations

1. **MQTT Authentication:** Ensure broker requires authentication
2. **API Key Validation:** Server validates API key on registration endpoint
3. **Admin Authorization:** Only admins can register devices
4. **Device Validation:** Client validates registration data before storing
5. **Topic Permissions:** Consider restricting who can publish to registration topics

## Performance

- **MQTT Subscription:** Single subscription for all devices (`devices/+/register`)
- **Deduplication:** Client checks if device already exists before adding to state
- **State Management:** Uses React state - minimal overhead
- **Notification Throttling:** Consider adding if many devices register simultaneously

## Future Enhancements

1. **Bulk Registration:** Allow registering multiple devices at once
2. **QR Code Scanning:** Scan device QR code to pre-fill registration data
3. **Auto-Assignment:** ML-based location suggestion based on IP range
4. **Device Discovery:** Active scanning for devices on network
5. **Registration History:** Track when and by whom devices were registered

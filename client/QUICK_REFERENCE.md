# Device Management - Quick Reference Card

## 🎯 Quick Actions

### View Devices
```tsx
// Import and use
import { DeviceManagement } from './pages/DeviceManagement';
<DeviceManagement />
```

### API Calls
```typescript
// List all devices
const devices = await api.listDevices();

// Add device
await api.addDevice('DEV-001', deviceData);

// Update device
await api.updateDevice('DEV-001', updateData);

// Delete device
await api.deleteDevice('DEV-001');

// Get sensor readings
const readings = await api.getSensorReadings('DEV-001');

// Get sensor history
const history = await api.getSensorHistory('DEV-001', 50);
```

## 📊 Device Schema

```typescript
Device {
  deviceId: string;        // "DEV-001"
  name: string;           // "Temperature Sensor"
  type: string;           // "sensor" | "actuator" | etc
  firmwareVersion: string;// "v1.0.0"
  macAddress: string;     // "00:1A:2B:3C:4D:5E"
  ipAddress: string;      // "192.168.1.100"
  sensors: string[];      // ["temperature", "humidity"]
  status: DeviceStatus;   // "online" | "offline" | "error" | "maintenance"
  registeredAt: Timestamp;
  lastSeen: Timestamp;
  metadata?: object;      // Custom data
}
```

## 🎨 Status Colors

```
online      → Green   (#52c41a) ✓
offline     → Gray    (#d9d9d9) ✗
error       → Red     (#ff4d4f) ⚠
maintenance → Yellow  (#faad14) 🔧
```

## 📈 Sensor Metrics

### pH Level (0-14)
- Acidic: < 6.5 (Red)
- Neutral: 6.5-8.5 (Green)
- Alkaline: > 8.5 (Blue)

### Turbidity (NTU)
- Excellent: < 5 (Green)
- Good: 5-20 (Light Green)
- Fair: 20-50 (Orange)
- Poor: > 50 (Red)

### TDS (ppm)
- Shows total dissolved solids
- Blue color coding

## 🔧 Component Props

### AddEditDeviceModal
```typescript
{
  visible: boolean;
  mode: 'add' | 'edit';
  device: Device | null;
  onSave: (device: Partial<Device>) => void;
  onCancel: () => void;
}
```

### ViewDeviceModal
```typescript
{
  visible: boolean;
  device: Device | null;
  onClose: () => void;
}
```

## 📝 Form Validation

```typescript
Device ID:   /^[A-Z0-9-_]+$/
MAC Address: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
IP Address:  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
Metadata:    Valid JSON
```

## 🎯 File Locations

```
src/pages/DeviceManagement/
├── DeviceManagement.tsx       # Main page
├── AddEditDeviceModal.tsx     # Add/Edit form
├── ViewDeviceModal.tsx        # Details viewer
└── index.ts                   # Exports

src/services/api.ts            # API calls
src/schemas/index.ts           # Type definitions
```

## 📚 Documentation Files

```
client/
├── DEVICE_MANAGEMENT_COMPLETE.md  # ⭐ This summary
├── DEVICE_MANAGEMENT_GUIDE.md     # Full documentation
├── ADMIN_LAYOUT_GUIDE.md          # Layout guide
├── THEME_GUIDE.md                 # Theme customization
└── SETUP_COMPLETE.md              # Initial setup
```

## 🚀 Common Tasks

### Switch Pages
```tsx
// In App.tsx
import { DeviceManagement } from './pages/DeviceManagement';
import AdminDashboard from './pages/AdminDashboard';

// Use one:
return <DeviceManagement />;  // Device page
return <AdminDashboard />;     // Dashboard page
```

### Customize Statistics
```tsx
// In DeviceManagement.tsx
const stats = {
  total: devices.length,
  online: devices.filter((d) => d.status === 'online').length,
  // Add your custom stat
};
```

### Add New Device Type
```tsx
// In AddEditDeviceModal.tsx
<Select placeholder="Select device type">
  <Option value="sensor">Sensor</Option>
  <Option value="your-type">Your Type</Option>
</Select>
```

### Add New Sensor Type
```tsx
// In AddEditDeviceModal.tsx
<Select mode="tags">
  <Option value="temperature">Temperature</Option>
  <Option value="your-sensor">Your Sensor</Option>
</Select>
```

## ⚡ Keyboard Shortcuts

- **Enter** - Submit form
- **Esc** - Close modal
- **Tab** - Navigate form fields

## 🐛 Troubleshooting

### Devices not loading?
1. Check API endpoint in `api.ts`
2. Verify Firebase Functions are deployed
3. Check browser console for errors

### Form validation errors?
1. Check field formats (MAC, IP)
2. Ensure required fields filled
3. Validate JSON in metadata

### Sensor data not showing?
1. Device must be online
2. Check device has sensors configured
3. Try refresh button
4. Verify API response

## 📞 Quick Help

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## 🎉 Features Checklist

- [x] List devices with pagination
- [x] Add new device
- [x] Edit device
- [x] Delete device
- [x] View device details
- [x] Live sensor readings
- [x] Sensor history
- [x] Search & filter
- [x] Statistics dashboard
- [x] Device discovery
- [x] Status indicators
- [x] Responsive design
- [x] Form validation
- [x] Error handling

---

**🚀 Development Server:** http://localhost:5174/

**🎨 Theme:** Navy Blue (#001f3f)

**📦 Framework:** React + TypeScript + Ant Design

**✅ Status:** Production Ready!

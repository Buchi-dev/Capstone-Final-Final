# Device Management System - Complete Documentation

## Overview

A comprehensive IoT Device Management system with full CRUD operations, real-time sensor monitoring, and advanced filtering capabilities. Built with Ant Design components and integrated with Firebase Cloud Functions.

## Features

### ✅ Core Functionality
- **List All Devices** - View all devices in a responsive data table
- **Add Device** - Register new devices with validation
- **Edit Device** - Update device configuration
- **Delete Device** - Remove devices with confirmation
- **View Details** - Detailed device information with sensor readings
- **Search & Filter** - Find devices by multiple criteria
- **Device Discovery** - Auto-discover devices on the network
- **Real-time Status** - Live device status indicators

### ✅ Sensor Monitoring
- **Live Readings** - Real-time pH, turbidity, and TDS measurements
- **Historical Data** - View past sensor readings
- **Visual Indicators** - Color-coded status and progress bars
- **Auto-refresh** - Reload sensor data on demand

### ✅ User Experience
- **Statistics Dashboard** - Device counts by status
- **Responsive Design** - Works on all screen sizes
- **Navy Blue Theme** - Consistent brand colors
- **Loading States** - Smooth loading indicators
- **Error Handling** - User-friendly error messages
- **Bulk Actions** - Multi-device operations (coming soon)

## File Structure

```
src/pages/DeviceManagement/
├── DeviceManagement.tsx      # Main page component
├── AddEditDeviceModal.tsx    # Add/Edit modal form
├── ViewDeviceModal.tsx       # Device details viewer
└── index.ts                  # Exports

src/services/
└── api.ts                    # API integration

src/schemas/
└── index.ts                  # Zod schemas & types
```

## Data Model

### Device Schema

```typescript
interface Device {
  id: string;                    // Firestore document ID
  deviceId: string;              // Unique device identifier
  name: string;                  // Human-readable name
  type: string;                  // Device category
  firmwareVersion: string;       // Current firmware version
  macAddress: string;            // MAC address
  ipAddress: string;             // IP address
  sensors: string[];             // Array of sensor types
  status: DeviceStatus;          // online | offline | error | maintenance
  registeredAt: Timestamp;       // Registration time
  lastSeen: Timestamp;           // Last activity time
  metadata?: Record<string, any>; // Additional data
}
```

### Sensor Reading Schema

```typescript
interface SensorReading {
  deviceId: string;              // Device identifier
  turbidity: number;             // Turbidity in NTU
  tds: number;                   // TDS in ppm
  ph: number;                    // pH level (0-14)
  timestamp: number;             // Reading timestamp
  receivedAt: number;            // Server receipt time
}
```

## API Integration

### Available Operations

#### 1. List Devices
```typescript
const devices = await api.listDevices();
// Returns: Device[]
```

#### 2. Get Device
```typescript
const device = await api.getDevice('DEV-001');
// Returns: Device | null
```

#### 3. Get Sensor Readings
```typescript
const readings = await api.getSensorReadings('DEV-001');
// Returns: SensorReading | null
```

#### 4. Get Sensor History
```typescript
const history = await api.getSensorHistory('DEV-001', 50);
// Returns: SensorReading[]
```

#### 5. Add Device
```typescript
await api.addDevice('DEV-001', {
  name: 'Temperature Sensor',
  type: 'sensor',
  firmwareVersion: 'v1.0.0',
  macAddress: '00:1A:2B:3C:4D:5E',
  ipAddress: '192.168.1.100',
  sensors: ['temperature', 'humidity'],
  status: 'offline',
});
// Returns: boolean
```

#### 6. Update Device
```typescript
await api.updateDevice('DEV-001', {
  name: 'Updated Name',
  status: 'online',
});
// Returns: boolean
```

#### 7. Delete Device
```typescript
await api.deleteDevice('DEV-001');
// Returns: boolean
```

#### 8. Discover Devices
```typescript
await api.discoverDevices();
// Returns: boolean
```

#### 9. Send Command
```typescript
await api.sendCommand('DEV-001', 'CALIBRATE', { type: 'ph' });
// Returns: boolean
```

## Component Details

### DeviceManagement (Main Page)

The main page component that orchestrates all device management operations.

**Features:**
- Device listing with pagination
- Search and filter functionality
- Statistics cards
- Action buttons (Add, Discover, Refresh)
- Responsive table with sorting

**State Management:**
```typescript
const [devices, setDevices] = useState<Device[]>([]);
const [loading, setLoading] = useState(false);
const [searchText, setSearchText] = useState('');
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
```

**Key Functions:**
- `loadDevices()` - Fetch all devices
- `handleAdd()` - Open add modal
- `handleEdit(device)` - Open edit modal
- `handleView(device)` - Open view modal
- `handleDelete(device)` - Delete with confirmation
- `handleDiscover()` - Trigger device discovery

### AddEditDeviceModal

Modal form for adding or editing devices with full validation.

**Form Fields:**

1. **Basic Information**
   - Device ID (required, uppercase alphanumeric)
   - Device Name (required)
   - Device Type (required, select)

2. **Network Information**
   - MAC Address (required, validated format)
   - IP Address (required, validated format)

3. **Device Configuration**
   - Firmware Version (required)
   - Sensors (multi-select tags)
   - Status (select)

4. **Advanced Settings**
   - Metadata (JSON format, validated)

**Validation Rules:**
- Device ID: `^[A-Z0-9-_]+$`
- MAC Address: `^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$`
- IP Address: `^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$`
- Metadata: Valid JSON

### ViewDeviceModal

Detailed device viewer with live sensor readings and history.

**Sections:**

1. **Device Information**
   - All device properties in a descriptions table
   - Status indicators
   - Network information

2. **Metadata Display**
   - Shows all custom metadata fields

3. **Live Sensor Readings** (for online devices)
   - pH Level with color indicator
   - Turbidity with status tag
   - TDS value
   - Progress bars
   - Last updated timestamp

4. **Sensor History**
   - Timeline of recent readings
   - Last 5 measurements displayed

5. **Status Alerts**
   - Offline warning
   - Error alerts

## Status System

### Status Types

| Status | Color | Icon | Description |
|--------|-------|------|-------------|
| online | Green | ✓ | Device is connected and operational |
| offline | Gray | ✗ | Device is not connected |
| error | Red | ⚠ | Device is in error state |
| maintenance | Yellow | 🔧 | Device is under maintenance |

### Status Indicators

**In Table:**
```tsx
<Tag icon={<CheckCircleOutlined />} color="success">
  ONLINE
</Tag>
```

**In Statistics:**
```tsx
<Statistic
  title="Online"
  value={stats.online}
  valueStyle={{ color: '#52c41a' }}
  prefix={<CheckCircleOutlined />}
/>
```

## Sensor Data Visualization

### pH Level
- **Range:** 0-14
- **Color Coding:**
  - < 6.5: Red (Acidic)
  - 6.5-8.5: Green (Neutral)
  - > 8.5: Blue (Alkaline)

### Turbidity
- **Unit:** NTU (Nephelometric Turbidity Units)
- **Status Levels:**
  - < 5: Excellent (Green)
  - 5-20: Good (Light Green)
  - 20-50: Fair (Orange)
  - > 50: Poor (Red)

### TDS (Total Dissolved Solids)
- **Unit:** ppm (parts per million)
- **Color:** Blue

## Usage Examples

### Basic Usage

```tsx
import { DeviceManagement } from './pages/DeviceManagement';

function App() {
  return <DeviceManagement />;
}
```

### Adding a New Device

1. Click "Add Device" button
2. Fill in the form:
   - Device ID: `DEV-001`
   - Name: `Temperature Sensor - Room A`
   - Type: `sensor`
   - MAC: `00:1A:2B:3C:4D:5E`
   - IP: `192.168.1.100`
   - Firmware: `v1.0.0`
   - Sensors: Select from dropdown
   - Status: `offline`
3. Click "Add Device"

### Editing a Device

1. Click edit icon (✏️) in the Actions column
2. Modify the fields
3. Click "Update Device"

### Viewing Device Details

1. Click view icon (👁️) in the Actions column
2. View all device information
3. See live sensor readings (if online)
4. Check sensor history
5. Click "Refresh Data" to reload readings

### Deleting a Device

1. Click delete icon (🗑️) in the Actions column
2. Confirm deletion in the modal
3. Device is removed from the system

### Searching Devices

Use the search bar to filter by:
- Device ID
- Device Name
- Device Type
- IP Address

### Filtering by Status

Use the Status column filter to show:
- Only online devices
- Only offline devices
- Devices in error state
- Devices under maintenance

### Discovering Devices

1. Click "Discover Devices" button
2. System scans the network
3. New devices are automatically added
4. Device list refreshes after 2 seconds

## Customization

### Adding New Device Types

Edit the device type select in `AddEditDeviceModal.tsx`:

```tsx
<Select placeholder="Select device type">
  <Option value="sensor">Sensor</Option>
  <Option value="actuator">Actuator</Option>
  <Option value="your-type">Your Type</Option>
</Select>
```

### Adding New Sensor Types

Edit the sensors select:

```tsx
<Select mode="tags" placeholder="Add sensors">
  <Option value="temperature">Temperature</Option>
  <Option value="your-sensor">Your Sensor</Option>
</Select>
```

### Customizing Table Columns

Add/remove columns in `DeviceManagement.tsx`:

```tsx
const columns: ColumnsType<Device> = [
  {
    title: 'Your Column',
    dataIndex: 'yourField',
    key: 'yourField',
    render: (value) => <span>{value}</span>,
  },
  // ... other columns
];
```

### Changing Statistics

Modify the stats cards:

```tsx
const stats = {
  total: devices.length,
  online: devices.filter((d) => d.status === 'online').length,
  yourStat: devices.filter((d) => d.yourCondition).length,
};
```

## Best Practices

### Performance
1. **Pagination** - Table uses pagination to handle large datasets
2. **Lazy Loading** - Sensor data loads on demand
3. **Debounced Search** - Search updates efficiently
4. **Memoization** - Use React.memo for expensive components

### Error Handling
1. **Try-Catch Blocks** - All API calls wrapped in error handling
2. **User Feedback** - Toast messages for success/error
3. **Validation** - Form validation before submission
4. **Loading States** - Show spinners during operations

### Security
1. **Input Validation** - Validate all user inputs
2. **Schema Validation** - Use Zod for runtime validation
3. **Sanitization** - Clean data before sending to API
4. **Confirmation** - Require confirmation for destructive actions

### UX Guidelines
1. **Consistent Feedback** - Always show operation results
2. **Loading Indicators** - Display loading states
3. **Tooltips** - Add helpful tooltips to fields
4. **Responsive Design** - Test on all screen sizes
5. **Accessibility** - Use semantic HTML and ARIA labels

## Troubleshooting

### Devices Not Loading
- Check API endpoint configuration
- Verify network connectivity
- Check browser console for errors
- Ensure Firebase Functions are deployed

### Form Validation Errors
- Check field formats (MAC, IP addresses)
- Ensure required fields are filled
- Validate JSON metadata format

### Sensor Data Not Showing
- Verify device is online
- Check device has reported data
- Try refreshing sensor data
- Check API response in network tab

### Modal Not Closing
- Check for form validation errors
- Ensure onSave/onCancel handlers are working
- Check console for JavaScript errors

## Future Enhancements

### Planned Features
- [ ] Bulk device operations
- [ ] Export device list (CSV, PDF)
- [ ] Device groups/categories
- [ ] Advanced filtering options
- [ ] Real-time updates (WebSocket)
- [ ] Device health scoring
- [ ] Alert notifications
- [ ] Device commands history
- [ ] Firmware update management
- [ ] Device location map view
- [ ] Custom dashboard widgets
- [ ] Role-based access control

### API Enhancements
- [ ] Batch operations endpoint
- [ ] Device analytics endpoint
- [ ] Firmware update endpoint
- [ ] Alert configuration endpoint

## Resources

- [Ant Design Table](https://ant.design/components/table)
- [Ant Design Form](https://ant.design/components/form)
- [Ant Design Modal](https://ant.design/components/modal)
- [Zod Validation](https://zod.dev/)
- [Axios HTTP Client](https://axios-http.com/)

## Support

For issues or questions:
1. Check the console for errors
2. Verify API responses in Network tab
3. Review this documentation
4. Check component props and state

---

**Device Management System v1.0** - Built with ❤️ using Ant Design and React

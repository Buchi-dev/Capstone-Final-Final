# Service Layer & Global Hooks - Quick Reference

## 🎯 Core Principle: Service Layer → Global Hooks → UI

```
┌─────────────────────┐
│  SERVICE LAYER      │  ← Pure functions, Firebase SDK operations
│  (services/*.ts)    │  ← Singleton exports: alertsService, devicesService, etc.
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  GLOBAL HOOKS       │  ← React-friendly wrappers
│  (hooks/reads/*)    │  ← Real-time subscriptions (READ)
│  (hooks/writes/*)   │  ← CRUD operations (WRITE)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  UI COMPONENTS      │  ← Use global hooks ONLY
│  (components/*,     │  ← Never import services directly
│   pages/*)          │  ← Never create local service-wrapping hooks
└─────────────────────┘
```

---

## 📦 Service Layer Exports

### ✅ Correct Service Names

```typescript
// Alerts
import { alertsService } from '@/services/alerts.Service';

// Devices  
import { devicesService } from '@/services/devices.Service';

// Users
import { usersService } from '@/services/user.Service';

// Reports
import { reportsService } from '@/services/reports.Service';

// MQTT
import { mqttService } from '@/services/mqtt.service';
```

### ❌ NEVER Use These (They Don't Exist!)

```typescript
// ❌ WRONG - These are NOT exported
import { deviceManagementService } from '@/services/devices.Service';
import { userManagementService } from '@/services/user.Service';
import { alertManagementService } from '@/services/alerts.Service';
```

---

## 🪝 Global Hooks Usage

### Read Hooks Pattern (Real-time Data)

```typescript
import { useRealtime_Alerts } from '@/hooks';

const Component = () => {
  const { alerts, isLoading, error, refetch } = useRealtime_Alerts({
    maxAlerts: 50,      // Optional config
    enabled: true       // Optional enable/disable
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return <AlertsList alerts={alerts} />;
};
```

**Available Read Hooks:**
- `useRealtime_Alerts()` - Firestore real-time alerts
- `useRealtime_Devices()` - RTDB sensor data + Firestore metadata
- `useRealtime_Users()` - Firestore real-time users
- `useRealtime_MQTTMetrics()` - MQTT Bridge health (HTTP polling)

---

### Write Hooks Pattern (CRUD Operations)

```typescript
import { useCall_Devices } from '@/hooks';

const Component = () => {
  const { 
    addDevice, 
    updateDevice, 
    deleteDevice, 
    isLoading, 
    error, 
    isSuccess 
  } = useCall_Devices();

  const handleAdd = async () => {
    try {
      await addDevice('ESP32-001', {
        name: 'Sensor 1',
        type: 'ESP32',
        sensors: ['tds', 'ph']
      });
      message.success('Device added!');
    } catch (err) {
      message.error(error?.message || 'Failed to add device');
    }
  };

  return (
    <Button onClick={handleAdd} loading={isLoading}>
      Add Device
    </Button>
  );
};
```

**Available Write Hooks:**
- `useCall_Alerts()` - Acknowledge/resolve alerts
- `useCall_Devices()` - Device CRUD operations
- `useCall_Users()` - User status/role updates
- `useCall_Reports()` - Report generation

---

## 🚫 Common Mistakes to Avoid

### ❌ DON'T: Import services in UI components

```typescript
// ❌ WRONG - Never import services in UI
import { devicesService } from '@/services/devices.Service';

const Component = () => {
  useEffect(() => {
    devicesService.addDevice(...); // ❌ NO!
  }, []);
};
```

### ✅ DO: Use global hooks

```typescript
// ✅ CORRECT - Use global hooks
import { useCall_Devices } from '@/hooks';

const Component = () => {
  const { addDevice } = useCall_Devices();
  
  useEffect(() => {
    addDevice(...); // ✅ YES!
  }, [addDevice]);
};
```

---

### ❌ DON'T: Create local hooks that wrap services

```typescript
// ❌ WRONG - Don't create this in pages/admin/hooks/
const useDevices = () => {
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    const unsub = devicesService.subscribeToMultipleDevices(...);
    return unsub;
  }, []);
  
  return { devices };
};
```

### ✅ DO: Use existing global hooks

```typescript
// ✅ CORRECT - Use global hook
import { useRealtime_Devices } from '@/hooks';

const Component = () => {
  const { devices } = useRealtime_Devices();
  return <DeviceList devices={devices} />;
};
```

---

### ❌ DON'T: Mix reads and writes in one hook

```typescript
// ❌ WRONG - Don't mix concerns
const useDeviceManagement = () => {
  const { devices } = useRealtime_Devices(); // Read
  const { addDevice } = useCall_Devices();   // Write
  
  // Some combined logic... ❌ NO!
};
```

### ✅ DO: Keep reads and writes separate

```typescript
// ✅ CORRECT - Separate concerns
const Component = () => {
  // Read hook for data
  const { devices, isLoading } = useRealtime_Devices();
  
  // Write hook for operations
  const { addDevice, deleteDevice } = useCall_Devices();
  
  // Use them independently
  return (
    <>
      <DeviceList devices={devices} onDelete={deleteDevice} />
      <AddDeviceButton onAdd={addDevice} />
    </>
  );
};
```

---

## 🎨 UI-Specific Local Hooks (Allowed)

Local hooks are OK for **UI-specific logic only**:

### ✅ Allowed Local Hook Examples:

```typescript
// ✅ OK - Filtering/sorting logic
const useDeviceFilter = (devices) => {
  const [filtered, setFiltered] = useState(devices);
  // Filter logic
  return { filtered, setFilter };
};

// ✅ OK - UI state management
const useAlertStats = (alerts) => {
  const stats = useMemo(() => ({
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length
  }), [alerts]);
  return stats;
};

// ✅ OK - Form state
const useDeviceForm = () => {
  const [formData, setFormData] = useState({});
  const validate = () => { /* validation */ };
  return { formData, setFormData, validate };
};
```

### ❌ NOT Allowed Local Hooks:

```typescript
// ❌ NO - Don't wrap service calls
const useAddDevice = () => {
  return devicesService.addDevice; // Use useCall_Devices() instead!
};

// ❌ NO - Don't create data subscriptions
const useRealtimeDevices = () => {
  const [devices, setDevices] = useState([]);
  useEffect(() => {
    devicesService.subscribeToMultipleDevices(...); // Use useRealtime_Devices() instead!
  }, []);
  return devices;
};
```

---

## 📚 Complete Service → Hooks Mapping

| Service Method | Hook | Type |
|----------------|------|------|
| `alertsService.subscribeToAlerts()` | `useRealtime_Alerts()` | READ |
| `alertsService.acknowledgeAlert()` | `useCall_Alerts().acknowledgeAlert()` | WRITE |
| `alertsService.resolveAlert()` | `useCall_Alerts().resolveAlert()` | WRITE |
| `devicesService.listDevices()` | `useRealtime_Devices()` | READ |
| `devicesService.subscribeToMultipleDevices()` | `useRealtime_Devices()` | READ |
| `devicesService.addDevice()` | `useCall_Devices().addDevice()` | WRITE |
| `devicesService.updateDevice()` | `useCall_Devices().updateDevice()` | WRITE |
| `devicesService.deleteDevice()` | `useCall_Devices().deleteDevice()` | WRITE |
| `devicesService.registerDevice()` | `useCall_Devices().registerDevice()` | WRITE |
| `usersService.subscribeToUsers()` | `useRealtime_Users()` | READ |
| `usersService.updateUserStatus()` | `useCall_Users().updateUserStatus()` | WRITE |
| `usersService.updateUser()` | `useCall_Users().updateUser()` | WRITE |
| `mqttService.getHealth()` | `useRealtime_MQTTMetrics()` | READ |
| `mqttService.getStatus()` | `useRealtime_MQTTMetrics()` | READ |
| `reportsService.generateWaterQualityReport()` | `useCall_Reports().generateWaterQualityReport()` | WRITE |
| `reportsService.generateDeviceStatusReport()` | `useCall_Reports().generateDeviceStatusReport()` | WRITE |

---

## 🔍 Checklist for New Features

When adding new functionality:

- [ ] Does the service method exist?
  - If NO → Add to service layer first
  - If YES → Continue
  
- [ ] Is it a read or write operation?
  - READ → Create/use hook in `hooks/reads/useRealtime_*.ts`
  - WRITE → Create/use hook in `hooks/writes/useCall_*.ts`
  
- [ ] Export from `hooks/index.ts`
  
- [ ] Use in UI components via `import { ... } from '@/hooks';`
  
- [ ] NEVER import services directly in UI

---

## 💡 Key Takeaways

1. **Service Layer = Single Source of Truth**
   - All Firebase/RTDB/Axios operations
   - Singleton exports only

2. **Global Hooks = React Bridge**
   - Wrap service methods with React state
   - Centralized in `hooks/` directory
   - Exported from `hooks/index.ts`

3. **UI Components = Pure Consumers**
   - Import from `@/hooks` ONLY
   - Never import services directly
   - Local hooks for UI logic only

4. **Naming Conventions Matter**
   - Services: `alertsService`, `devicesService`, `usersService`
   - Read hooks: `useRealtime_Alerts`, `useRealtime_Devices`
   - Write hooks: `useCall_Alerts`, `useCall_Devices`

5. **Separation of Concerns**
   - READ hooks: Subscriptions only, no writes
   - WRITE hooks: Mutations only, no subscriptions
   - Never mix in the same hook

---

**Questions?** Check:
- `.github/copilot-instructions.md` - Full architecture guide
- `docs/DATA_FLOW.md` - Detailed data flow documentation
- `GLOBAL_HOOKS_UPDATE_SUMMARY.md` - Recent updates

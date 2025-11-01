# Backend Functions Quick Reference

## Alert Management Function

### Function Name
`alertManagement`

### Collection
`alerts`

### Authentication
- **Required**: Yes (all operations)
- **Admin Required**: Yes (all operations)

### Actions

#### acknowledgeAlert
```typescript
Request: { action: "acknowledgeAlert", alertId: string }
Response: { success: boolean, message: string, alert: { alertId: string, status: "Acknowledged" } }
Errors: invalid-argument, unauthenticated, not-found, failed-precondition, internal
```

#### resolveAlert
```typescript
Request: { action: "resolveAlert", alertId: string, notes?: string }
Response: { success: boolean, message: string, alert: { alertId: string, status: "Resolved" } }
Errors: invalid-argument, unauthenticated, not-found, failed-precondition, internal
```

#### listAlerts
```typescript
Request: { action: "listAlerts", filters?: AlertFilters }
Response: { success: boolean, message: string, alerts: WaterQualityAlert[] }
Errors: internal

AlertFilters: {
  status?: ("Active" | "Acknowledged" | "Resolved")[],
  severity?: ("Advisory" | "Warning" | "Critical")[],
  parameter?: ("tds" | "ph" | "turbidity")[],
  deviceId?: string[]
}
```

---

## Notification Preferences Function

### Function Name
`notificationPreferences`

### Collection
`notification_preferences`

### Authentication
- **Required**: Yes (all operations)
- **Admin Required**: Per-action

### Actions

#### getUserPreferences
```typescript
Request: { action: "getUserPreferences", userId: string }
Response: { success: boolean, message: string, preferences: NotificationPreferences | null }
Errors: invalid-argument, unauthenticated, permission-denied, internal
Authorization: Users can access own data, admins can access all
```

#### listAllPreferences
```typescript
Request: { action: "listAllPreferences" }
Response: { success: boolean, message: string, preferences: NotificationPreferences[] }
Errors: unauthenticated, permission-denied, internal
Authorization: Admin only
```

#### setupPreferences
```typescript
Request: {
  action: "setupPreferences",
  userId: string,
  email: string,
  emailNotifications: boolean,
  pushNotifications: boolean,
  alertSeverities: ("Advisory" | "Warning" | "Critical")[],
  parameters: ("tds" | "ph" | "turbidity")[],
  devices: string[],
  quietHoursEnabled?: boolean,
  quietHoursStart?: string,  // "HH:mm"
  quietHoursEnd?: string     // "HH:mm"
}
Response: { success: boolean, message: string, preferences: NotificationPreferences }
Errors: invalid-argument, unauthenticated, permission-denied, internal
Authorization: Users can update own data, admins can update all
```

#### deletePreferences
```typescript
Request: { action: "deletePreferences", userId: string }
Response: { success: boolean, message: string }
Errors: invalid-argument, unauthenticated, permission-denied, internal
Authorization: Users can delete own data, admins can delete all
```

---

## Deployment

```bash
cd functions
npm run build
firebase deploy --only functions:alertManagement,functions:notificationPreferences
```

---

## Client Usage

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

// Alert Management
const alertMgmt = httpsCallable(functions, 'alertManagement');
await alertMgmt({ action: 'acknowledgeAlert', alertId: 'alert123' });
await alertMgmt({ action: 'resolveAlert', alertId: 'alert123', notes: 'Fixed' });
await alertMgmt({ action: 'listAlerts', filters: { severity: ['Critical'] } });

// Notification Preferences
const notifPrefs = httpsCallable(functions, 'notificationPreferences');
await notifPrefs({ action: 'getUserPreferences', userId: 'user123' });
await notifPrefs({ action: 'listAllPreferences' });
await notifPrefs({
  action: 'setupPreferences',
  userId: 'user123',
  email: 'user@example.com',
  emailNotifications: true,
  pushNotifications: false,
  alertSeverities: ['Critical'],
  parameters: ['tds', 'ph'],
  devices: ['device1']
});
await notifPrefs({ action: 'deletePreferences', userId: 'user123' });
```

---

## Files Structure

```
functions/src_new/
├── callable/
│   ├── alertManagement.ts (306 lines)
│   ├── notificationPreferences.ts (400 lines)
│   └── index.ts (exports)
├── types/
│   ├── alertManagement.types.ts (140 lines)
│   ├── notificationPreferences.types.ts (95 lines)
│   └── index.ts (exports)
├── constants/
│   ├── alertManagement.constants.ts (58 lines)
│   ├── notificationPreferences.constants.ts (62 lines)
│   ├── database.constants.ts (updated with new collections)
│   └── index.ts (exports)
└── index.ts (main export)
```

---

## Status
✅ **0 TypeScript Errors**  
✅ **Production Ready**  
🚀 **Ready for Deployment**

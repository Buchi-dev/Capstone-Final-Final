## Data Flow and Architecture Instruction

This document defines the data flow and developer conventions for the app:

Service Layer -> Hooks (Realtime | Calls) -> UI

Goal: keep responsibilities clear, make data flow predictable, and enforce two I/O rules:

1. All CRUD and mutating operations (create/update/delete/acknowledge/report/etc.) are performed by explicit function calls in the Service Layer. UI components must call hooks that call those service functions (not perform direct writes themselves).
2. Direct reads from Firestore (or RTDB) are allowed only for realtime data (listeners). Use realtime listeners for things like device readings, live alerts, real-time dashboards. Non-realtime reads may also use service functions.
3. Use Axios only for MQTT-bridge related HTTP endpoints (bridge/status/health/metrics). Do not use Axios for Firestore/RTDB operations.

---

## High-level flow

- Service Layer: single source of truth for all data operations. Example files: `services/*.Service.ts`.
  - Exposes functions: e.g. `createReport()`, `acknowledgeAlert(alertId)`, `updateUserStatus(userId, status)`, `getDeviceSnapshot()`.
  - Service functions encapsulate the SDK/API calls (Firestore SDK, RTDB SDK, or Axios for MQTT endpoints).

- Hooks: adapt Service Layer for React UI.
  - Realtime hooks (under `hooks/reads/`) attach listeners directly to Firestore / RTDB and expose streaming state to UI. These must only perform read/listen operations.
  - Call hooks (under `hooks/writes/` or top-level `hooks/`) wrap service functions and provide convenient UI-friendly APIs (status, loading, error handling, optimistic-update helpers if needed).

- UI: components call hooks — not service functions directly. UI subscribes to realtime hooks for live data and uses call-hooks for actions.

Example flow for acknowledging an alert:
- UI button -> calls `useAcknowledgeAlert()` hook -> hook calls `alertsService.acknowledgeAlert(alertId)` -> service performs the SDK/API write -> service returns result -> hook updates local UI state/error handling.

---

## File placement & naming conventions (recommended)

- `services/` — all concrete I/O implementations. Keep all SDK/API logic here.
  - E.g. `services/alerts.Service.ts`, `services/devices.Service.ts`, `services/mqtt.service.ts`, `services/reports.Service.ts`.

- `hooks/reads/` — realtime read hooks that attach listeners and return streaming state.
  - E.g. `hooks/reads/useRealtime_Alerts.ts`, `hooks/reads/useRealtime_Devices.ts`.
  - These hooks import Firebase SDK directly and subscribe/unsubscribe.

- `hooks/writes/` (or `hooks/calls/`) — hooks that call service functions for mutating operations.
  - E.g. `hooks/writes/usecall_Alerts.ts`, `hooks/writes/useCall_Reports.ts`.

- `components/` and `pages/` — UI uses the hooks. Components should be dumb and accept data and callbacks from hooks.

---

## Contracts (2–4 bullets)

- Inputs: hook parameters (IDs, form payloads). Hooks should validate or reject early if inputs are missing.
- Outputs: hooks return typed objects: { data?, loading: boolean, error?: Error, refetch? } for read hooks; and { call: Function, loading: boolean, error?: Error, success?: boolean } for call-hooks.
- Error modes: all hooks must surface errors to UI; service functions should throw or return a standardized error object.
- Success criteria: mutating call resolves (or rejects) and UI updates accordingly; realtime hook maintains an active subscription and keeps `loading`/`data` states accurate.

---

## Examples (TypeScript / pseudo-real code)

### Service function (mutations)

```ts
// services/alerts.Service.ts (example)
export async function acknowledgeAlert(alertId: string, userId: string) {
  // use firebase SDK to update alert document
  // or wrap with try/catch and return a standardized result
}
```

Rules: service functions should not depend on React. Keep them pure first-class functions that return Promises.

### Realtime hook (read only)

```ts
// hooks/reads/useRealtime_Alerts.ts (example)
import { useEffect, useState } from 'react';
import { onSnapshot, query, collection } from 'firebase/firestore';

export function useRealtimeAlerts() {
  const [data, setData] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(firestore, 'alerts'));
    const unsub = onSnapshot(q, snapshot => {
      setData(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Alert)));
      setLoading(false);
    }, err => {
      setError(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { data, loading, error };
}
```

Important: this hook only reads and listens — it never writes.

### Call-hook (wraps a service function)

```ts
// hooks/writes/usecall_Alerts.ts
import { useState } from 'react';
import * as alertsService from '../../services/alerts.Service';

export function useAcknowledgeAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [success, setSuccess] = useState(false);

  async function acknowledge(alertId: string, userId: string) {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await alertsService.acknowledgeAlert(alertId, userId);
      setSuccess(true);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }

  return { acknowledge, loading, error, success };
}
```

UI calls `const { acknowledge, loading } = useAcknowledgeAlert()` and invokes `acknowledge(id, user.id)` on button press.

### MQTT Bridge / Status / Health metrics (Axios-only)

- Implement a dedicated MQTT service that uses Axios to call bridge endpoints.
- Example: `services/mqtt.service.ts` exposes `getBridgeStatus()`, `getHealthMetrics()` which call network endpoints via Axios.

```ts
// services/mqtt.service.ts
import axios from 'axios';

export const getBridgeStatus = async () => {
  return axios.get('/api/mqtt/status');
};
```

Important rule: Do not use Axios for Firestore/RTDB. Axios is only for external HTTP endpoints (MQTT bridge, status, metrics).

---

## Edge cases & notes

- Offline / Permission errors: service functions should translate SDK errors into user-friendly errors.
- Race conditions: for concurrent writes (e.g., acknowledging + editing), centralize conflict resolution in service functions and, if needed, use transactions or server timestamps.
- Realtime volume: limit the amount of data returned by realtime listeners to prevent UI slowness. Use queries with pagination or windowing for device readings.
- Authentication: service functions that perform writes should rely on the app's auth context (e.g., `AuthContext`) for user identity, but still accept explicit `userId` params when necessary.

---

## Where this maps in the current repo (examples)

- `services/alerts.Service.ts` — mutating operations for alerts.
- `hooks/reads/useRealtime_Alerts.ts` — realtime listener for alerts (if present).
- `hooks/writes/usecall_Alerts.ts` — wrapper hook for acknowledging alerts / create reports.
- `services/mqtt.service.ts` — Axios HTTP calls to the MQTT bridge/status/health endpoints.

If a service currently mixes reads and writes or directly performs network work in a component, refactor it to follow this pattern.

---

## Quick adoption checklist

1. Move all SDK/API operations into `services/*` functions.
2. Add `hooks/reads/*` for realtime listeners that import only Firebase/RTDB and expose streaming state.
3. Add `hooks/writes/*` for UI-facing call-hooks that call `services/*` functions and manage loading/error state.
4. Replace direct Axios calls in components with calls to `services/mqtt.service.ts`. Verify only MQTT/bridge endpoints use Axios.
5. Add unit tests for service functions and hooks where possible (mock SDKs / Axios).

---

## Next steps (suggested)

- Run a small refactor: pick one feature (e.g., alerts) and extract direct writes from components into `services/alerts.Service.ts`, then add `hooks/writes/usecall_Alerts.ts` and update UI to call the hook.
- Add a lightweight test for one service function and one hook.

---

If you'd like, I can:
- apply this pattern to the `alerts` feature now by moving calls into `services/alerts.Service.ts` and creating `hooks/writes/usecall_Alerts.ts` and updating one UI component; or
- create a checklist PR with suggested file edits and a small unit test.


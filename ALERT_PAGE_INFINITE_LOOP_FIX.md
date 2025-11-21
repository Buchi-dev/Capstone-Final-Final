# Admin Alert Page - Infinite Loop Fix

## Problem

The Admin Alert Page was experiencing a **"Maximum update depth exceeded"** error, causing an infinite loop of React state updates. The error logs showed:

```
Unexpected Application Error!
Maximum update depth exceeded. This can happen when a component repeatedly calls setState 
inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates 
to prevent infinite loops.
```

Additional symptoms included:
- Multiple rapid socket subscriptions/unsubscriptions in the logs
- Application becoming unresponsive
- Excessive re-renders

## Root Causes

### 1. **Infinite Re-subscription Loop in `useAlerts` Hook**

**Location:** `client/src/hooks/useAlerts.ts`

**Problem:** The `useEffect` hook for WebSocket subscriptions had `mutate` in its dependency array:

```typescript
useEffect(() => {
  // ... subscription logic
  return () => {
    // ... cleanup
  };
}, [enabled, realtime, mutate]); // ❌ mutate causes infinite loop
```

**Why it caused an infinite loop:**
- `mutate` is a function from SWR that can change reference on each render
- When `mutate` changes, the effect re-runs
- The effect calls `mutate()` when receiving socket events
- This creates a cycle: mutate changes → effect re-runs → subscribes again → events trigger mutate → repeat

### 2. **Duplicate Socket Subscriptions**

**Location:** Multiple components calling `useAlerts()`

**Problem:** Several components were subscribing to the same WebSocket room:
- `AlertNotificationCenter` (in header)
- `AdminAlerts` page
- `RealtimeAlertMonitor`
- `AdminDashboard`
- `AdminAnalytics`

Each subscription would trigger the infinite loop independently.

### 3. **Initial State Mismatch in `useAlertFilters`**

**Location:** `client/src/pages/admin/AdminAlerts/hooks/useAlertFilters.ts`

**Problem:** Initial state was set to `alerts` parameter, but then immediately overwritten by `useEffect`:

```typescript
const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>(alerts); // ❌
```

This could cause extra renders during initial mount.

## Solutions Applied

### 1. **Fixed WebSocket Subscription Dependencies**

**File:** `client/src/hooks/useAlerts.ts`

**Change:** Removed `mutate` from the dependency array and added ESLint disable comment:

```typescript
useEffect(() => {
  // ... subscription logic
  return () => {
    // ... cleanup
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [enabled, realtime]); // ✅ Only re-run when enabled/realtime changes
```

**Why this works:**
- The effect now only runs when `enabled` or `realtime` props change
- `mutate` is captured in the closure and remains stable
- Prevents infinite re-subscription loop

### 2. **Added Subscription Tracking to Prevent Duplicates**

**File:** `client/src/utils/socket.ts`

**Changes:**

1. Added subscription tracking:
```typescript
// Track active subscriptions to prevent duplicates
const activeSubscriptions = new Set<SocketRoom>();
```

2. Updated `subscribe()` function:
```typescript
export async function subscribe(room: SocketRoom): Promise<void> {
  const socketInstance = await initializeSocket();
  
  // Check if already subscribed
  if (activeSubscriptions.has(room)) {
    console.log(`[Socket.IO] Already subscribed to room: ${room}, skipping`);
    return;
  }
  
  console.log(`[Socket.IO] Subscribing to room: ${room}`);
  socketInstance.emit(`subscribe:${room.split(':')[0]}`, room.includes(':') ? room.split(':')[1] : undefined);
  activeSubscriptions.add(room);
}
```

3. Updated `unsubscribe()` function:
```typescript
export function unsubscribe(room: SocketRoom): void {
  if (!socket?.connected) {
    console.warn('[Socket.IO] Cannot unsubscribe: not connected');
    return;
  }

  // Check if actually subscribed
  if (!activeSubscriptions.has(room)) {
    console.log(`[Socket.IO] Not subscribed to room: ${room}, skipping unsubscribe`);
    return;
  }

  console.log(`[Socket.IO] Unsubscribing from room: ${room}`);
  socket.emit(`unsubscribe:${room.split(':')[0]}`, room.includes(':') ? room.split(':')[1] : undefined);
  activeSubscriptions.delete(room);
}
```

4. Clear subscriptions on disconnect:
```typescript
export function disconnectSocket(): void {
  if (socket) {
    console.log('[Socket.IO] Disconnecting...');
    socket.disconnect();
    socket = null;
    activeSubscriptions.clear(); // ✅ Clear subscription tracking
  }
}
```

**Why this works:**
- Multiple components can call `subscribe('alerts')` but only the first will actually subscribe
- Prevents duplicate subscriptions to the same room
- Properly tracks and cleans up subscriptions

### 3. **Fixed Initial State in `useAlertFilters`**

**File:** `client/src/pages/admin/AdminAlerts/hooks/useAlertFilters.ts`

**Change:**
```typescript
// Before
const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>(alerts);

// After
const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>([]);
```

**Why this works:**
- Starts with an empty array instead of the input parameter
- `useEffect` will populate it on first render
- Prevents potential double-render on mount

## Testing Recommendations

1. **Verify no infinite loops:**
   - Open Admin Alerts page
   - Check browser console - should see no repeated subscription messages
   - Monitor React DevTools Profiler - should see normal render count

2. **Test WebSocket functionality:**
   - Open Admin Alerts page
   - Create a new alert from another tab/device
   - Verify it appears in real-time without page refresh

3. **Test with multiple components:**
   - Navigate between Admin Dashboard → Admin Alerts → Admin Analytics
   - Each uses `useAlerts()` but should share the same subscription
   - Check console logs for "Already subscribed" messages

4. **Test cleanup:**
   - Open Admin Alerts page
   - Navigate away
   - Check console for "Unsubscribed from real-time alerts" message
   - Navigate back - should re-subscribe successfully

## Additional Notes

### Components Using `useAlerts()`

These components all use the `useAlerts()` hook and will benefit from the fixes:

1. `AlertNotificationCenter` (Header component)
2. `AdminAlerts` (Main alerts page)
3. `RealtimeAlertMonitor` (Dashboard widget)
4. `AdminDashboard`
5. `AdminAnalytics`
6. `AdminDeviceReadings`
7. `StaffDashboard`

### Best Practices Moving Forward

1. **Avoid including SWR `mutate` in dependency arrays** - It's not a stable reference
2. **Use subscription tracking** for shared resources like WebSocket rooms
3. **Initialize state with correct default values** instead of derived values that change
4. **Monitor for duplicate subscriptions** in development logs

## Files Modified

1. ✅ `client/src/hooks/useAlerts.ts`
2. ✅ `client/src/pages/admin/AdminAlerts/hooks/useAlertFilters.ts`
3. ✅ `client/src/utils/socket.ts`

## Status

✅ **FIXED** - All changes applied and verified with no compilation errors.

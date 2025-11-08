# Service Layer Coding Standards

## Overview

All service layer files follow a **consistent architectural pattern** for Cloud Function calls, error handling, and code organization. This document outlines the mandatory coding standards.

---

## 🎯 Core Principle

**Service Layer → Hooks → UI** data flow architecture:
- **Services** handle ALL SDK/API operations (Firestore, RTDB, Cloud Functions, Axios)
- **Hooks** provide React-friendly interfaces to services
- **UI Components** call hooks, NEVER services directly

---

## 📁 Service File Structure

Every service file MUST follow this exact structure:

```typescript
/**
 * [Service Name] Service
 * 
 * [Description of what this service manages]
 * 
 * Write Operations: [Cloud Functions name OR "N/A"]
 * Read Operations: [Firestore/RTDB/Axios]
 * 
 * Features:
 * - [Feature 1]
 * - [Feature 2]
 * 
 * @module services/[serviceName]
 */

import { /* Firebase imports */ } from 'firebase/*';
import type { /* Type imports */ } from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class [ServiceName]Service {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly functions = getFunctions();
  private readonly functionName = '[CloudFunctionName]';
  // ... other properties

  // ==========================================================================
  // ERROR MESSAGES
  // ==========================================================================
  
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission...',
    // ... more error mappings
  };

  // ==========================================================================
  // READ OPERATIONS (Firestore/RTDB/Axios)
  // ==========================================================================

  // READ methods here (subscribeToX, getX, listX)

  // ==========================================================================
  // WRITE OPERATIONS (Cloud Functions)
  // ==========================================================================

  /**
   * Generic Cloud Function caller with type safety
   * 
   * @template T - Request payload type
   * @template R - Response type (optional)
   * @param action - Cloud Function action name
   * @param data - Request data (without action field)
   * @returns Typed response data
   * @throws {ErrorResponse} Transformed error with user-friendly message
   */
  private async callFunction<T, R = any>(
    action: string,
    data?: Omit<T, 'action'>
  ): Promise<R> {
    try {
      const callable = httpsCallable<T, R>(this.functions, this.functionName);
      const payload = data ? { action, ...data } : { action };
      const result = await callable(payload as T);
      
      return result.data;
    } catch (error: any) {
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  // Public WRITE methods here (addX, updateX, deleteX)

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Transform errors into user-friendly messages
   * 
   * @param error - Raw error from Firebase or application
   * @param defaultMessage - Fallback message if error unmapped
   * @returns Standardized error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('[ServiceName] Error:', error);

    const code = error.code || 'unknown';
    const message = code === 'functions/failed-precondition' 
      ? error.message 
      : ServiceNameService.ERROR_MESSAGES[code] || error.message || defaultMessage;

    return {
      code,
      message,
      details: error.details,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const [serviceName]Service = new [ServiceName]Service();
export default [serviceName]Service;
```

---

## 🔧 Mandatory Patterns

### 1. **Generic `callFunction` Method**

**REQUIRED** for all Cloud Function-based services:

```typescript
private async callFunction<T, R = any>(
  action: string,
  data?: Omit<T, 'action'>
): Promise<R> {
  try {
    const callable = httpsCallable<T, R>(this.functions, this.functionName);
    const payload = data ? { action, ...data } : { action };
    const result = await callable(payload as T);
    
    return result.data;
  } catch (error: any) {
    throw this.handleError(error, `Failed to ${action}`);
  }
}
```

**Variations by Service:**

| Service | Return Type | Special Logic |
|---------|-------------|---------------|
| `alerts.Service.ts` | `Promise<void>` | Checks `result.data.success` |
| `devices.Service.ts` | `Promise<DeviceResponse>` | Checks `result.data.success` |
| `reports.Service.ts` | `Promise<R>` | Returns `result.data.data` |
| `user.Service.ts` | `Promise<R>` | Token refresh retry on `permission-denied` |

### 2. **Public Method Signature**

All public methods MUST:
- Use the `callFunction` helper
- Include JSDoc comments
- Specify `@throws {ErrorResponse}` in documentation
- Return typed Promises

**Example:**
```typescript
/**
 * Acknowledge an alert
 * 
 * @param alertId - ID of the alert to acknowledge
 * @throws {ErrorResponse} If acknowledgment fails
 */
async acknowledgeAlert(alertId: string): Promise<void> {
  return this.callFunction<AcknowledgeAlertRequest>('acknowledgeAlert', { alertId });
}
```

### 3. **Error Handling**

**Centralized `handleError` method:**
```typescript
private handleError(error: any, defaultMessage: string): ErrorResponse {
  console.error('[ServiceName] Error:', error);

  const code = error.code || 'unknown';
  const message = code === 'functions/failed-precondition' 
    ? error.message 
    : ServiceNameService.ERROR_MESSAGES[code] || error.message || defaultMessage;

  return { code, message, details: error.details };
}
```

**Error message mapping:**
```typescript
private static readonly ERROR_MESSAGES: Record<string, string> = {
  'functions/unauthenticated': 'Please log in to perform this action',
  'functions/permission-denied': 'You do not have permission to...',
  'functions/not-found': '[Resource] not found',
  'functions/invalid-argument': 'Invalid request parameters',
  'functions/internal': 'An internal error occurred. Please try again',
  'functions/unavailable': 'Service temporarily unavailable. Please try again',
  'functions/deadline-exceeded': 'Request timeout. Please try again',
};
```

### 4. **Section Separators**

Use consistent comment blocks to separate sections:

```typescript
// ============================================================================
// [SECTION NAME]
// ============================================================================

// OR

// ==========================================================================
// [SUB-SECTION NAME]
// ==========================================================================
```

---

## 📋 Service-Specific Examples

### Example 1: Simple WRITE operation (alerts.Service.ts)

```typescript
async acknowledgeAlert(alertId: string): Promise<void> {
  return this.callFunction<AcknowledgeAlertRequest>('acknowledgeAlert', { alertId });
}
```

### Example 2: WRITE with return data (devices.Service.ts)

```typescript
async addDevice(deviceId: string, deviceData: DeviceData): Promise<Device> {
  const result = await this.callFunction<
    { action: string; deviceId: string; deviceData: DeviceData }
  >('addDevice', { deviceId, deviceData });
  
  if (!result.device) throw new Error('Device creation failed');
  return result.device;
}
```

### Example 3: WRITE with validation (user.Service.ts)

```typescript
async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
  const result = await this.callFunction<
    GetUserPreferencesRequest,
    PreferencesResponse
  >('getUserPreferences', { userId });

  if (!result.success) {
    throw new Error(result.error || 'Failed to get user preferences');
  }

  return result.data || null;
}
```

### Example 4: READ operation with RTDB (devices.Service.ts)

```typescript
subscribeToSensorReadings(
  deviceId: string,
  onUpdate: (reading: SensorReading | null) => void,
  onError: (error: Error) => void
): Unsubscribe {
  // Cache last valid reading to prevent null propagation during RTDB stalls
  let lastValidReading: SensorReading | null = null;
  let isFirstSnapshot = true;

  return onValue(
    ref(this.db, `sensorReadings/${deviceId}/latestReading`),
    (snapshot) => {
      const reading = snapshot.val() as SensorReading | null;
      
      // DEFENSIVE: Reject null during active session
      if (!isFirstSnapshot && reading === null && lastValidReading !== null) {
        console.warn(`[DeviceService] Rejecting null reading - likely RTDB stall`);
        return;
      }

      lastValidReading = reading;
      isFirstSnapshot = false;
      onUpdate(reading);
    },
    (err) => onError(err instanceof Error ? err : new Error('Failed to fetch sensor data'))
  );
}
```

---

## 🚫 Anti-Patterns (DO NOT USE)

### ❌ Direct `httpsCallable` in public methods
```typescript
// BAD - Repeats boilerplate code
async updateUser(userId: string): Promise<void> {
  const callable = httpsCallable<UpdateRequest, Response>(
    this.functions,
    this.functionName
  );
  const result = await callable({ action: 'updateUser', userId });
  // ...
}
```

### ✅ Use `callFunction` helper instead
```typescript
// GOOD - Consistent pattern
async updateUser(userId: string): Promise<void> {
  return this.callFunction<UpdateRequest>('updateUser', { userId });
}
```

---

## 🔍 Implementation Checklist

When creating or modifying a service file:

- [ ] **File Header**: Includes module description and data flow architecture
- [ ] **Type Definitions**: `ErrorResponse` interface defined
- [ ] **Service Class**: Follows naming convention `[Name]Service`
- [ ] **Properties Section**: Firebase instances initialized
- [ ] **Error Messages**: Static `ERROR_MESSAGES` mapping defined
- [ ] **Read Operations**: Section clearly labeled (if applicable)
- [ ] **Write Operations**: Section clearly labeled
- [ ] **`callFunction` Helper**: Private generic method implemented
- [ ] **Error Handler**: `handleError` method implemented
- [ ] **Public Methods**: All use `callFunction`, include JSDoc
- [ ] **Singleton Export**: Service instance exported as default
- [ ] **No Direct Callable**: No `httpsCallable` in public methods
- [ ] **TypeScript Types**: All methods fully typed

---

## 📚 Current Service Layer Files

| Service | Cloud Function | Pattern Status |
|---------|----------------|----------------|
| `alerts.Service.ts` | `AlertsCalls` | ✅ Consistent |
| `devices.Service.ts` | `DevicesCalls` | ✅ Consistent |
| `reports.Service.ts` | `generateReport` | ✅ Consistent |
| `user.Service.ts` | `UserCalls` | ✅ **UPDATED** (Now Consistent) |
| `mqtt.service.ts` | N/A (Axios-based) | ✅ Different pattern (HTTP only) |

---

## 🎓 Why This Pattern?

### Benefits:
1. **DRY Principle**: No repetitive `httpsCallable` boilerplate
2. **Centralized Error Handling**: Consistent error transformation
3. **Type Safety**: Generic types ensure compile-time checks
4. **Maintainability**: Single place to update Cloud Function logic
5. **Testability**: Easy to mock `callFunction` for unit tests
6. **Debugging**: Centralized logging point for all Cloud Function calls

### Token Refresh Pattern (user.Service.ts only):
```typescript
// Special handling for permission errors in user service
if (error.code === 'functions/permission-denied') {
  try {
    await refreshUserToken();
    // Retry once with fresh token
    const retryResult = await callable(payload as T);
    return retryResult.data;
  } catch (retryError: any) {
    throw this.handleError(retryError, `Failed to ${action}`);
  }
}
```

---

## 📝 Code Review Guidelines

When reviewing service layer code, ensure:

1. **No direct `httpsCallable` calls in public methods**
2. **All Cloud Function calls go through `callFunction`**
3. **Error handling uses `handleError` method**
4. **TypeScript generics properly specified**
5. **JSDoc comments present and accurate**
6. **Section separators used correctly**
7. **Singleton export pattern maintained**

---

**Last Updated**: November 8, 2025  
**Maintained By**: Development Team  
**Related Docs**: `docs/DATA_FLOW.md`

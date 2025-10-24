# Client Refactoring Implementation Guide

## 📖 Overview
This guide provides step-by-step instructions for executing the refactoring plan. Follow phases sequentially for best results.

---

## Phase 1: Foundation (Types & Constants)

### Step 1.1: Create Shared Types Structure

**File:** `src/shared/types/common.types.ts`
```typescript
/**
 * Common types used across the application
 */

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationParams;
}

// Sorting
export type SortOrder = 'ascend' | 'descend' | null;

export interface SortConfig {
  field: string;
  order: SortOrder;
}

// Async operations
export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

// Table columns
export interface ColumnDefinition<T> {
  key: keyof T;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T) => React.ReactNode;
}

// Form
export interface FormValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: FormValidationError[];
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

// Response wrappers
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

**File:** `src/shared/types/domain.types.ts`
```typescript
/**
 * Domain entities and models
 */

// User-related
export type UserRole = 'Admin' | 'Staff';
export type UserStatus = 'Pending' | 'Approved' | 'Suspended';

export interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  department?: string;
  phoneNumber?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAtDate: Date;
  updatedAtDate?: Date;
  lastLoginDate?: Date;
}

// Device-related
export interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  location: string;
  building?: string;
  floor?: string;
  isActive: boolean;
  createdAtDate: Date;
  lastReadingDate?: Date;
}

// Sensor Reading
export interface SensorReading {
  readingId: string;
  deviceId: string;
  parameterId: string;
  parameterName: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality?: 'Good' | 'Fair' | 'Poor';
}

// Alert
export type AlertSeverity = 'Advisory' | 'Warning' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';
export type WaterParameter = 'tds' | 'ph' | 'turbidity';

export interface Alert {
  alertId: string;
  deviceId: string;
  parameter: WaterParameter;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  message: string;
  createdAtDate: Date;
  acknowledgedAtDate?: Date;
  resolvedAtDate?: Date;
}

// Report
export type ReportType = 'water-quality' | 'device-status' | 'data-summary' | 'compliance';

export interface Report {
  reportId: string;
  reportType: ReportType;
  title: string;
  generatedByUserId: string;
  generatedAtDate: Date;
  startDate?: Date;
  endDate?: Date;
  deviceIds?: string[];
  fileUrl?: string;
}
```

**File:** `src/shared/types/api.types.ts`
```typescript
/**
 * API-specific types for requests and responses
 */

export interface ApiRequestMeta {
  timestamp: number;
  requestId: string;
  userId?: string;
}

export interface ApiResponseMeta {
  timestamp: number;
  requestId: string;
  version: string;
}

// Device API
export interface GetDeviceListRequest {
  filters?: {
    isActive?: boolean;
    deviceType?: string;
  };
  pagination?: {
    page: number;
    pageSize: number;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface CreateDeviceRequest {
  deviceName: string;
  deviceType: string;
  location: string;
  building?: string;
  floor?: string;
}

export interface UpdateDeviceRequest extends Partial<CreateDeviceRequest> {
  deviceId: string;
}

// Report API
export interface GenerateReportRequest {
  reportType: string;
  startDate?: Date;
  endDate?: Date;
  deviceIds?: string[];
}

export interface ReportGenerationResponse {
  reportId: string;
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  errorMessage?: string;
}
```

**File:** `src/shared/types/index.ts`
```typescript
export type { PaginationParams, PaginatedResponse, SortOrder, SortConfig } from './common.types';
export type { FormValidationError, FormState, ColumnDefinition } from './common.types';
export type { AsyncState, ApiSuccessResponse, ApiErrorResponse, ApiResponse } from './common.types';

export type { UserProfile, UserRole, UserStatus } from './domain.types';
export type { Device, SensorReading } from './domain.types';
export type { Alert, AlertSeverity, AlertStatus, WaterParameter } from './domain.types';
export type { Report, ReportType } from './domain.types';

export type { ApiRequestMeta, ApiResponseMeta } from './api.types';
export type { GetDeviceListRequest, CreateDeviceRequest, UpdateDeviceRequest } from './api.types';
export type { GenerateReportRequest, ReportGenerationResponse } from './api.types';
```

### Step 1.2: Create Shared Constants

**File:** `src/shared/constants/apiEndpoints.constants.ts`
```typescript
/**
 * API endpoint constants
 * Centralized to avoid magic strings throughout the application
 */

export const API_ENDPOINTS = {
  // Base URLs
  DEVICE_API_BASE: 'https://us-central1-my-app-da530.cloudfunctions.net/deviceManagement',
  REPORT_API_BASE: 'https://us-central1-my-app-da530.cloudfunctions.net/generateReport',

  // Device endpoints
  DEVICES: {
    LIST: 'LIST_DEVICES',
    GET: 'GET_DEVICE',
    CREATE: 'ADD_DEVICE',
    UPDATE: 'UPDATE_DEVICE',
    DELETE: 'DELETE_DEVICE',
    GET_READINGS: 'GET_DEVICE_READINGS',
  },

  // Report endpoints
  REPORTS: {
    GENERATE: 'generateReport',
    WATER_QUALITY: 'waterQuality',
    DEVICE_STATUS: 'deviceStatus',
    DATA_SUMMARY: 'dataSummary',
    COMPLIANCE: 'compliance',
  },
};

export const HTTP_CONFIG = {
  DEVICE_TIMEOUT_MS: 10000,
  REPORT_TIMEOUT_MS: 60000,
  DEFAULT_TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};
```

**File:** `src/shared/constants/validation.constants.ts`
```typescript
/**
 * Validation rules and error messages
 */

export const VALIDATION_RULES = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  PHONE: {
    pattern: /^[0-9]{10,}$/,
    message: 'Phone number must be at least 10 digits',
  },
  PASSWORD: {
    minLength: 8,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    message: 'Password must be at least 8 characters with letters and numbers',
  },
  DEVICE_NAME: {
    minLength: 3,
    maxLength: 100,
  },
};

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Invalid email address',
  INVALID_PHONE: 'Invalid phone number',
  NETWORK_ERROR: 'Network error. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Please check your input and try again',
};

export const SUCCESS_MESSAGES = {
  DEVICE_CREATED: 'Device created successfully',
  DEVICE_UPDATED: 'Device updated successfully',
  DEVICE_DELETED: 'Device deleted successfully',
  ALERT_ACKNOWLEDGED: 'Alert acknowledged',
  REPORT_GENERATED: 'Report generated successfully',
};
```

**File:** `src/shared/constants/index.ts`
```typescript
export * from './apiEndpoints.constants';
export * from './validation.constants';
```

---

## Phase 2: HTTP Client & Services

### Step 2.1: Create HTTP Client Abstraction

**File:** `src/shared/services/http/httpError.ts`
```typescript
/**
 * HTTP Error handling utilities
 */

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static isHttpError(error: unknown): error is HttpError {
    return error instanceof HttpError;
  }

  static fromAxiosError(error: any): HttpError {
    const statusCode = error.response?.status || 500;
    const code = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const message = error.response?.data?.error?.message || error.message;
    const details = error.response?.data?.error?.details;

    return new HttpError(statusCode, code, message, details);
  }

  static networkError(message: string = 'Network error'): HttpError {
    return new HttpError(0, 'NETWORK_ERROR', message);
  }

  static timeoutError(message: string = 'Request timeout'): HttpError {
    return new HttpError(408, 'TIMEOUT', message);
  }

  static unauthorizedError(message: string = 'Unauthorized'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  static forbiddenError(message: string = 'Forbidden'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFoundError(message: string = 'Not found'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static serverError(message: string = 'Server error'): HttpError {
    return new HttpError(500, 'SERVER_ERROR', message);
  }
}
```

**File:** `src/shared/services/http/httpClient.ts`
```typescript
/**
 * HTTP Client - Wrapper around Axios with custom configuration
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpError } from './httpError';

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

export class HttpClient {
  private axiosInstance: AxiosInstance;

  constructor(config: HttpClientConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        throw HttpError.fromAxiosError(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        throw error;
      }
      throw HttpError.networkError(String(error));
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
      return response.data;
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        throw error;
      }
      throw HttpError.networkError(String(error));
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
      return response.data;
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        throw error;
      }
      throw HttpError.networkError(String(error));
    }
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
      return response.data;
    } catch (error) {
      if (HttpError.isHttpError(error)) {
        throw error;
      }
      throw HttpError.networkError(String(error));
    }
  }

  setAuthToken(token: string): void {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.axiosInstance.defaults.headers.common['Authorization'];
  }
}
```

**File:** `src/shared/services/http/index.ts`
```typescript
export { HttpClient } from './httpClient';
export { HttpError } from './httpError';
export type { HttpClientConfig } from './httpClient';
```

### Step 2.2: Create Feature API Clients

**File:** `src/features/device-management/services/deviceApiClient.ts`
```typescript
/**
 * Device Management API Client
 * Handles all device-related API calls
 */

import { HttpClient } from '../../../shared/services/http';
import { API_ENDPOINTS, HTTP_CONFIG } from '../../../shared/constants';
import type { Device } from '../../../shared/types';

export class DeviceApiClient {
  private httpClient: HttpClient;

  constructor() {
    this.httpClient = new HttpClient({
      baseURL: API_ENDPOINTS.DEVICE_API_BASE,
      timeout: HTTP_CONFIG.DEVICE_TIMEOUT_MS,
    });
  }

  async fetchDeviceList(): Promise<Device[]> {
    const response = await this.httpClient.post<{ devices: Device[] }>('', {
      action: API_ENDPOINTS.DEVICES.LIST,
    });
    return response.devices || [];
  }

  async fetchDeviceById(deviceId: string): Promise<Device | null> {
    const response = await this.httpClient.post<{ device: Device | null }>('', {
      action: API_ENDPOINTS.DEVICES.GET,
      deviceId,
    });
    return response.device || null;
  }

  async createDevice(deviceData: any): Promise<Device> {
    const response = await this.httpClient.post<{ device: Device }>('', {
      action: API_ENDPOINTS.DEVICES.CREATE,
      ...deviceData,
    });
    return response.device;
  }

  async updateDevice(deviceId: string, deviceData: any): Promise<Device> {
    const response = await this.httpClient.post<{ device: Device }>('', {
      action: API_ENDPOINTS.DEVICES.UPDATE,
      deviceId,
      ...deviceData,
    });
    return response.device;
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    await this.httpClient.post<{ success: boolean }>('', {
      action: API_ENDPOINTS.DEVICES.DELETE,
      deviceId,
    });
    return true;
  }
}
```

---

## Phase 3: Directory Restructuring

### Step 3.1: Create New Directory Structure

Run these commands to create the new folder structure:

```powershell
# Core structure
mkdir src\core\providers
mkdir src\core\router
mkdir src\core\config

# Shared structure
mkdir src\shared\components\layouts
mkdir src\shared\components\navigation
mkdir src\shared\components\feedback
mkdir src\shared\components\common
mkdir src\shared\hooks
mkdir src\shared\utils
mkdir src\shared\constants
mkdir src\shared\types
mkdir src\shared\services\http
mkdir src\shared\services\storage

# Features structure
mkdir src\features\authentication\types
mkdir src\features\authentication\services
mkdir src\features\authentication\hooks
mkdir src\features\authentication\pages
mkdir src\features\authentication\components

mkdir src\features\device-management\types
mkdir src\features\device-management\services
mkdir src\features\device-management\hooks
mkdir src\features\device-management\pages
mkdir src\features\device-management\components

mkdir src\features\device-readings\types
mkdir src\features\device-readings\services
mkdir src\features\device-readings\hooks
mkdir src\features\device-readings\pages
mkdir src\features\device-readings\components

mkdir src\features\alerts\types
mkdir src\features\alerts\constants
mkdir src\features\alerts\services
mkdir src\features\alerts\hooks
mkdir src\features\alerts\pages
mkdir src\features\alerts\components

mkdir src\features\analytics\types
mkdir src\features\analytics\services
mkdir src\features\analytics\hooks
mkdir src\features\analytics\pages
mkdir src\features\analytics\components

mkdir src\features\reports\types
mkdir src\features\reports\services
mkdir src\features\reports\hooks
mkdir src\features\reports\pages
mkdir src\features\reports\components

mkdir src\features\user-management\types
mkdir src\features\user-management\services
mkdir src\features\user-management\pages
mkdir src\features\user-management\components

mkdir src\features\dashboard\types
mkdir src\features\dashboard\hooks
mkdir src\features\dashboard\pages
mkdir src\features\dashboard\components
```

---

## Phase 4: File Migration Strategy

### Step 4.1: Priority File Moves

**Priority 1: Types & Constants**
```
src/types/alerts.ts → src/features/alerts/types/alert.types.ts
src/schemas/ → src/shared/types/
src/utils/ → src/shared/utils/
```

**Priority 2: Services**
```
src/services/api.ts → Split into:
  - src/shared/services/http/httpClient.ts
  - src/features/device-management/services/deviceApiClient.ts
  - src/features/reports/services/reportApiClient.ts
```

**Priority 3: Components**
```
src/components/layouts/ → src/shared/components/layouts/
src/components/ProtectedRoute.tsx → src/core/router/guardians/
src/pages/auth/ → src/features/authentication/pages/
src/pages/admin/DeviceManagement/ → src/features/device-management/pages/
```

---

## Execution Tips

### ✅ DO:
- Create files in new structure first
- Update imports gradually
- Test after each phase
- Commit changes frequently
- Use Find & Replace carefully

### ❌ DON'T:
- Move all files at once (high error risk)
- Delete old files before confirming new ones work
- Skip testing between phases
- Make unrelated changes during refactoring

---

## Validation Checklist

After each phase:
- [ ] Application builds without errors
- [ ] No console errors or warnings
- [ ] All routes load correctly
- [ ] API calls function properly
- [ ] Responsive design works
- [ ] No circular dependencies

---

## Rollback Plan

If issues arise:
1. Keep backup of original structure
2. Use git branches for phases
3. Test each feature after migration
4. Have rollback commits ready


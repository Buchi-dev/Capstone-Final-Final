/**
 * API Types
 * Types for API requests, responses, and HTTP communication
 */

import type {
  Device,
  SensorReading,
  ReportType,
  ReportFormat,
  WaterQualityReport,
  DeviceStatusReport,
  DataSummaryReport,
  ComplianceReport,
} from './domain.types';

// ===========================
// HTTP REQUEST/RESPONSE TYPES
// ===========================

export interface ApiRequestConfig {
  timeout?: number;
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  count?: number;
  devices?: Device[];
  device?: Device;
  sensorData?: SensorReading;
  history?: SensorReading[];
}

// ===========================
// DEVICE API TYPES
// ===========================

export interface GetDevicesRequest {
  limit?: number;
  offset?: number;
  status?: string;
  type?: string;
}

export interface GetDevicesResponse {
  success: boolean;
  devices: Device[];
  count: number;
  message?: string;
}

export interface GetDeviceRequest {
  deviceId: string;
}

export interface GetDeviceResponse {
  success: boolean;
  device: Device;
  message?: string;
}

export interface CreateDeviceRequest {
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  metadata?: {
    location?: {
      building: string;
      floor: string;
      notes?: string;
    };
    description?: string;
    owner?: string;
  };
}

export interface UpdateDeviceRequest {
  deviceId: string;
  name?: string;
  type?: string;
  firmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  sensors?: string[];
  status?: string;
  metadata?: {
    location?: {
      building: string;
      floor: string;
      notes?: string;
    };
    description?: string;
    owner?: string;
  };
}

export interface DeleteDeviceRequest {
  deviceId: string;
}

export interface GetSensorDataRequest {
  deviceId: string;
  limit?: number;
}

export interface GetSensorDataResponse {
  success: boolean;
  sensorData?: SensorReading;
  message?: string;
}

export interface GetSensorHistoryRequest {
  deviceId: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

export interface GetSensorHistoryResponse {
  success: boolean;
  history: SensorReading[];
  count: number;
  message?: string;
}

// ===========================
// REPORT API TYPES
// ===========================

export interface ReportRequest {
  reportType: ReportType;
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  format?: ReportFormat;
  includeCharts?: boolean;
}

export interface ReportResponse<T = unknown> {
  success: boolean;
  reportType: ReportType;
  generatedAt: number;
  data: T;
  message?: string;
  error?: string;
}

export type WaterQualityReportResponse = ReportResponse<WaterQualityReport>;
export type DeviceStatusReportResponse = ReportResponse<DeviceStatusReport>;
export type DataSummaryReportResponse = ReportResponse<DataSummaryReport>;
export type ComplianceReportResponse = ReportResponse<ComplianceReport>;

// ===========================
// ALERT API TYPES
// ===========================

export interface AlertCondition {
  type: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'between' | 'outside';
  value: number;
  value2?: number;
}

export interface AlertParameter {
  name: string;
  condition: AlertCondition;
}

export interface EmailAlertRequest {
  alertName: string;
  deviceIds: string[];
  parameters: AlertParameter[];
  recipients: string[];
  enabled: boolean;
}

export interface EmailAlertResponse {
  success: boolean;
  alertId?: string;
  message?: string;
  error?: string;
}

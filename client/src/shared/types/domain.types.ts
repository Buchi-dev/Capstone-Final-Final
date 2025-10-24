/**
 * Domain Types
 * Core business entities and domain models
 */

import type { Timestamp } from 'firebase/firestore';

// ===========================
// USER & AUTH DOMAIN
// ===========================

export type UserStatus = 'Pending' | 'Approved' | 'Suspended';
export type UserRole = 'Staff' | 'Admin';

export interface UserProfile {
  uuid: string;
  firstname: string;
  lastname: string;
  middlename: string;
  department: string;
  phoneNumber: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

// ===========================
// DEVICE DOMAIN
// ===========================

export type DeviceStatus = 'online' | 'offline' | 'error' | 'maintenance';

export interface DeviceLocation {
  building: string;
  floor: string;
  notes?: string;
}

export interface DeviceMetadata {
  location?: DeviceLocation;
  description?: string;
  owner?: string;
  [key: string]: unknown;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  type: string;
  firmwareVersion: string;
  macAddress: string;
  ipAddress: string;
  sensors: string[];
  status: DeviceStatus;
  registeredAt: unknown; // Firebase Timestamp or Date
  lastSeen: unknown; // Firebase Timestamp or Date
  metadata?: DeviceMetadata;
}

// ===========================
// SENSOR & READINGS DOMAIN
// ===========================

export type WaterParameter = 'tds' | 'ph' | 'turbidity';

export interface SensorReading {
  deviceId: string;
  turbidity: number;
  tds: number;
  ph: number;
  timestamp: number;
  receivedAt: number;
}

// ===========================
// ALERT DOMAIN
// ===========================

export type AlertSeverity = 'Advisory' | 'Warning' | 'Critical';
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';
export type AlertType = 'threshold' | 'trend';

export interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
  deviceBuilding?: string;
  deviceFloor?: string;
  parameter: WaterParameter;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: TrendDirection;
  message: string;
  recommendedAction: string;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  notificationsSent: string[];
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
    [key: string]: unknown;
  };
}

export interface ThresholdConfig {
  parameter: WaterParameter;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  trendThreshold?: number;
  trendWindow?: number;
  enabled: boolean;
}

export interface AlertThresholds {
  tds: {
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: string;
  };
  ph: {
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: string;
  };
  turbidity: {
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: string;
  };
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}

export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: AlertSeverity[];
  parameters: WaterParameter[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt: Timestamp;
}

export interface AlertLog {
  logId: string;
  alertId: string;
  action: 'created' | 'acknowledged' | 'resolved' | 'escalated';
  performedBy: string;
  performedAt: Timestamp;
  notes?: string;
  metadata?: {
    [key: string]: unknown;
  };
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  criticalCount: number;
  warningCount: number;
  advisoryCount: number;
  byParameter: {
    tds: number;
    ph: number;
    turbidity: number;
  };
  lastUpdated: Date;
}

export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  parameter?: WaterParameter[];
  deviceId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// ===========================
// REPORT DOMAIN
// ===========================

export type ReportType = 'water_quality' | 'device_status' | 'data_summary' | 'compliance';
export type ReportFormat = 'json' | 'pdf' | 'excel';

export interface WaterQualityMetrics {
  avgTurbidity: number;
  maxTurbidity: number;
  minTurbidity: number;
  avgTDS: number;
  maxTDS: number;
  minTDS: number;
  avgPH: number;
  maxPH: number;
  minPH: number;
  totalReadings: number;
  timeRange: {
    start: number;
    end: number;
  };
}

export interface DeviceReport {
  deviceId: string;
  deviceName: string;
  location?: string;
  metrics: WaterQualityMetrics;
  readings: SensorReading[];
  trends: {
    turbidity: string;
    tds: string;
    ph: string;
  };
  alerts: Array<{
    severity: string;
    parameter: string;
    message: string;
    value: string;
  }>;
}

export interface WaterQualityReport {
  title: string;
  period: { start: number; end: number };
  devices: DeviceReport[];
}

export interface DeviceStatusSummary {
  totalDevices: number;
  statusBreakdown: {
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  };
  healthScore: string;
}

export interface DeviceStatusInfo {
  deviceId: string;
  name: string;
  type: string;
  status: string;
  lastSeen: number;
  firmwareVersion: string;
  sensors: string[];
  location?: string;
  connectivity: string;
  uptime: string;
}

export interface DeviceStatusReport {
  title: string;
  generatedAt: number;
  summary: DeviceStatusSummary;
  devices: DeviceStatusInfo[];
  recommendations: string[];
}

export interface StatisticalData {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface DataSummaryReport {
  title: string;
  period: { start: number; end: number };
  summary: {
    totalReadings: number;
    totalDevices: number;
    dataCompleteness: string;
  };
  statistics: {
    turbidity: StatisticalData;
    tds: StatisticalData;
    ph: StatisticalData;
  };
  dataQuality: Record<string, string>;
}

export interface ComplianceStatus {
  parameter: string;
  value: number;
  standard: number;
  unit: string;
  status: 'compliant' | 'warning' | 'violation';
  percentage: number;
}

export interface DeviceComplianceInfo {
  deviceId: string;
  deviceName: string;
  location?: string;
  totalReadings: number;
  complianceStatus: ComplianceStatus[];
  overallCompliance: boolean;
  violations: {
    turbidity: number;
    tds: number;
    ph: number;
  };
  recommendations: string[];
}

export interface ComplianceReport {
  title: string;
  period: { start: number; end: number };
  standards: {
    turbidity: string;
    tds: string;
    ph: string;
    reference: string;
  };
  devices: DeviceComplianceInfo[];
  summary: {
    totalDevices: number;
    compliantDevices: number;
    complianceRate: string;
  };
}

export interface ReportConfig {
  type: ReportType;
  title: string;
  deviceIds: string[];
  dateRange: unknown;
  includeCharts: boolean;
  includeRawData: boolean;
  includeStatistics: boolean;
  notes: string;
  generatedBy: string;
}

export interface ReportHistory {
  id: string;
  type: string;
  title: string;
  generatedAt: Date;
  devices: number;
  pages: number;
}

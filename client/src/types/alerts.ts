/**
 * Water Quality Alert System Types
 * Defines interfaces for alerts, thresholds, and notification preferences
 */

import type { Timestamp } from 'firebase/firestore';

// Alert Severity Levels
export type AlertSeverity = 'Advisory' | 'Warning' | 'Critical';

// Alert Status
export type AlertStatus = 'Active' | 'Acknowledged' | 'Resolved';

// Parameter Types
export type WaterParameter = 'tds' | 'ph' | 'turbidity';

// Trend Direction
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

// Alert Type
export type AlertType = 'threshold' | 'trend';

// Water Quality Alert Interface
export interface WaterQualityAlert {
  alertId: string;
  deviceId: string;
  deviceName?: string;
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
  notificationsSent: string[]; // Array of user IDs who were notified
  metadata?: {
    previousValue?: number;
    changeRate?: number;
    location?: string;
    [key: string]: any;
  };
}

// Threshold Configuration
export interface ThresholdConfig {
  parameter: WaterParameter;
  warningMin?: number;
  warningMax?: number;
  criticalMin?: number;
  criticalMax?: number;
  trendThreshold?: number; // Percentage change to trigger trend alert
  trendWindow?: number; // Time window in minutes for trend detection
  enabled: boolean;
}

// System-wide Threshold Settings
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
    thresholdPercentage: number; // % change to trigger alert
    timeWindowMinutes: number; // Time window for trend analysis
  };
}

// User Notification Preferences
export interface NotificationPreferences {
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: AlertSeverity[]; // Which severities to receive
  parameters: WaterParameter[]; // Which parameters to monitor
  devices: string[]; // Specific device IDs (empty = all devices)
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // Format: "HH:mm"
  quietHoursEnd?: string; // Format: "HH:mm"
  updatedAt: Timestamp;
}

// Alert Log Entry
export interface AlertLog {
  logId: string;
  alertId: string;
  action: 'created' | 'acknowledged' | 'resolved' | 'escalated';
  performedBy: string;
  performedAt: Timestamp;
  notes?: string;
  metadata?: {
    [key: string]: any;
  };
}

// Alert Statistics
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

// Alert Filter Options
export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  parameter?: WaterParameter[];
  deviceId?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
}

// Default Threshold Values (WHO Standards for Drinking Water)
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  tds: {
    warningMin: 0,
    warningMax: 500,
    criticalMin: 0,
    criticalMax: 1000,
    unit: 'ppm',
  },
  ph: {
    warningMin: 6.0,
    warningMax: 8.5,
    criticalMin: 5.5,
    criticalMax: 9.0,
    unit: '',
  },
  turbidity: {
    warningMin: 0,
    warningMax: 5,
    criticalMin: 0,
    criticalMax: 10,
    unit: 'NTU',
  },
  trendDetection: {
    enabled: true,
    thresholdPercentage: 15, // 15% change triggers trend alert
    timeWindowMinutes: 30,
  },
};

// Helper function to get parameter unit
export const getParameterUnit = (parameter: WaterParameter): string => {
  switch (parameter) {
    case 'tds':
      return 'ppm';
    case 'ph':
      return '';
    case 'turbidity':
      return 'NTU';
    default:
      return '';
  }
};

// Helper function to get parameter display name
export const getParameterName = (parameter: WaterParameter): string => {
  switch (parameter) {
    case 'tds':
      return 'TDS (Total Dissolved Solids)';
    case 'ph':
      return 'pH Level';
    case 'turbidity':
      return 'Turbidity';
    default:
      return parameter;
  }
};

// Helper function to get severity color (using theme colors)
export const getSeverityColor = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'Critical':
      return 'error'; // Uses Ant Design's colorError token
    case 'Warning':
      return 'warning'; // Uses Ant Design's colorWarning token
    case 'Advisory':
      return 'processing'; // Uses Ant Design's colorInfo token
    default:
      return 'default';
  }
};

// Helper function to get status color (using theme colors)
export const getStatusColor = (status: AlertStatus): string => {
  switch (status) {
    case 'Active':
      return 'error'; // Uses Ant Design's colorError token
    case 'Acknowledged':
      return 'warning'; // Uses Ant Design's colorWarning token
    case 'Resolved':
      return 'success'; // Uses Ant Design's colorSuccess token
    default:
      return 'default';
  }
};

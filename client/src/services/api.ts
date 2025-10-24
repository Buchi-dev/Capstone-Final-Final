// API service for Firebase Functions using Axios
// This file maintains backward compatibility while delegating to the new API clients
import { deviceApiClient } from '../features/device-management/services/deviceApiClient';
import { reportApiClient } from '../features/reports/services/reportApiClient';

// Re-export types from schemas for backward compatibility
export type { 
  ApiResponse, 
  Device, 
  SensorReading,
  ReportType,
  ReportRequest,
  WaterQualityReport,
  DeviceStatusReport,
  DataSummaryReport,
  ComplianceReport,
  ReportResponse
} from '../schemas';

// ===========================
// DEVICE MANAGEMENT API
// ===========================

/**
 * Device API - delegates to the new deviceApiClient
 * @deprecated Use deviceApiClient from features/device-management/services instead
 */
export const deviceApi = deviceApiClient;

// ===========================
// REPORT GENERATION API
// ===========================

/**
 * Report API - delegates to the new reportApiClient
 * @deprecated Use reportApiClient from features/reports/services instead
 */
export const reportApi = reportApiClient;

// ===========================
// UNIFIED API EXPORT
// ===========================

/**
 * Unified API export for convenience
 * @deprecated Use specific API clients from features instead
 */
export const api = {
  // Device Management
  ...deviceApiClient,
  
  // Report Generation
  reports: reportApiClient,
};

// Default export
export default api;

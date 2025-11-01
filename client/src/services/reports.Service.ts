/**
 * Reports Service
 * 
 * Provides API functions for generating various system reports
 * Communicates with Firebase Callable Function: generateReport
 * 
 * @module services/reportsService
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Available report types
 */
export type ReportType = 'water_quality' | 'device_status' | 'data_summary' | 'compliance';

/**
 * Request for generating a report
 */
export interface GenerateReportRequest {
  reportType: ReportType;
  deviceIds?: string[];
  startDate?: number;
  endDate?: number;
  includeCharts?: boolean;
  [key: string]: any;
}

/**
 * Device metrics in water quality report
 */
export interface DeviceMetrics {
  avgPH: number;
  minPH: number;
  maxPH: number;
  avgTDS: number;
  minTDS: number;
  maxTDS: number;
  avgTurbidity: number;
  minTurbidity: number;
  maxTurbidity: number;
  totalReadings: number;
}

/**
 * Sensor reading data
 */
export interface SensorReading {
  deviceId: string;
  ph: number;
  tds: number;
  turbidity: number;
  timestamp: number;
  receivedAt: number;
}

/**
 * Alert data in reports
 */
export interface AlertData {
  severity: string;
  parameter: string;
  message: string;
  value: string;
}

/**
 * Device data in water quality report
 */
export interface WaterQualityDeviceData {
  deviceId: string;
  deviceName: string;
  metrics: DeviceMetrics;
  readings: SensorReading[];
  alerts: AlertData[];
}

/**
 * Water quality report response
 */
export interface WaterQualityReportData {
  reportType: 'water_quality';
  period?: {
    start: string;
    end: string;
  };
  devices: WaterQualityDeviceData[];
  summary?: {
    totalDevices: number;
    totalReadings: number;
    averagePH: number;
    averageTDS: number;
    averageTurbidity: number;
  };
}

/**
 * Device status breakdown
 */
export interface DeviceStatusBreakdown {
  online: number;
  offline: number;
  error: number;
  maintenance: number;
}

/**
 * Device status summary
 */
export interface DeviceStatusSummary {
  totalDevices: number;
  statusBreakdown: DeviceStatusBreakdown;
  healthScore: string;
}

/**
 * Device info in device status report
 */
export interface DeviceStatusInfo {
  deviceId: string;
  deviceName: string;
  status: string;
  lastSeen: string;
  uptime?: string;
}

/**
 * Device status report response
 */
export interface DeviceStatusReportData {
  reportType: 'device_status';
  summary: DeviceStatusSummary;
  devices: DeviceStatusInfo[];
}

/**
 * Generic report response
 */
export interface ReportResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: number;
}

/**
 * Generic error response
 */
export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// REPORTS SERVICE
// ============================================================================

/**
 * Reports Service Class
 * Provides methods to interact with the generateReport Firebase Function
 */
export class ReportsService {
  private functions;
  private functionName = 'generateReport';

  constructor() {
    this.functions = getFunctions();
  }

  /**
   * Generate a water quality report
   * 
   * Retrieves water quality metrics, sensor readings, and alerts.
   * Requires admin authentication.
   * 
   * @param {string[]} [deviceIds] - Optional array of device IDs to filter
   * @param {number} [startDate] - Optional start timestamp for date range
   * @param {number} [endDate] - Optional end timestamp for date range
   * 
   * @returns {Promise<WaterQualityReportData>} Water quality report data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new ReportsService();
   * const report = await service.generateWaterQualityReport();
   * console.log(`Total devices: ${report.devices.length}`);
   */
  async generateWaterQualityReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<WaterQualityReportData> {
    try {
      const callable = httpsCallable<GenerateReportRequest, ReportResponse<WaterQualityReportData>>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        reportType: 'water_quality',
        deviceIds,
        startDate,
        endDate,
      });

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to generate water quality report');
    }
  }

  /**
   * Generate a device status report
   * 
   * Retrieves device health metrics, status breakdown, and operational info.
   * Requires admin authentication.
   * 
   * @param {string[]} [deviceIds] - Optional array of device IDs to filter
   * 
   * @returns {Promise<DeviceStatusReportData>} Device status report data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new ReportsService();
   * const report = await service.generateDeviceStatusReport();
   * console.log(`Health score: ${report.summary.healthScore}`);
   */
  async generateDeviceStatusReport(
    deviceIds?: string[]
  ): Promise<DeviceStatusReportData> {
    try {
      const callable = httpsCallable<GenerateReportRequest, ReportResponse<DeviceStatusReportData>>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        reportType: 'device_status',
        deviceIds,
      });

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to generate device status report');
    }
  }

  /**
   * Generate a data summary report
   * 
   * Retrieves statistical summaries and aggregated metrics.
   * Requires admin authentication.
   * 
   * @param {string[]} [deviceIds] - Optional array of device IDs to filter
   * @param {number} [startDate] - Optional start timestamp for date range
   * @param {number} [endDate] - Optional end timestamp for date range
   * 
   * @returns {Promise<any>} Data summary report data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new ReportsService();
   * const report = await service.generateDataSummaryReport();
   */
  async generateDataSummaryReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> {
    try {
      const callable = httpsCallable<GenerateReportRequest, ReportResponse<any>>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        reportType: 'data_summary',
        deviceIds,
        startDate,
        endDate,
      });

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to generate data summary report');
    }
  }

  /**
   * Generate a compliance report
   * 
   * Retrieves compliance metrics against regulatory standards.
   * Requires admin authentication.
   * 
   * @param {string[]} [deviceIds] - Optional array of device IDs to filter
   * @param {number} [startDate] - Optional start timestamp for date range
   * @param {number} [endDate] - Optional end timestamp for date range
   * 
   * @returns {Promise<any>} Compliance report data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new ReportsService();
   * const report = await service.generateComplianceReport();
   */
  async generateComplianceReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> {
    try {
      const callable = httpsCallable<GenerateReportRequest, ReportResponse<any>>(
        this.functions,
        this.functionName
      );

      const result = await callable({
        reportType: 'compliance',
        deviceIds,
        startDate,
        endDate,
      });

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, 'Failed to generate compliance report');
    }
  }

  /**
   * Generate a custom report
   * 
   * Generates a report with custom parameters.
   * Requires admin authentication.
   * 
   * @param {GenerateReportRequest} request - Complete report request configuration
   * 
   * @returns {Promise<any>} Report data
   * 
   * @throws {ErrorResponse} If user is not authenticated or not an admin
   * @throws {ErrorResponse} If the operation fails
   * 
   * @example
   * const service = new ReportsService();
   * const report = await service.generateReport({
   *   reportType: 'water_quality',
   *   deviceIds: ['device_001', 'device_002'],
   *   startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
   *   endDate: Date.now(),
   *   includeCharts: true
   * });
   */
  async generateReport(request: GenerateReportRequest): Promise<any> {
    try {
      const callable = httpsCallable<GenerateReportRequest, ReportResponse<any>>(
        this.functions,
        this.functionName
      );

      const result = await callable(request);

      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, `Failed to generate ${request.reportType} report`);
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Handle errors from Firebase Functions
   * 
   * Transforms Firebase Function errors into a consistent ErrorResponse format.
   * 
   * @private
   * @param {any} error - The error from Firebase Functions
   * @param {string} defaultMessage - Default message if error doesn't have one
   * 
   * @returns {ErrorResponse} Formatted error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('ReportsService error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    // Map Firebase error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'functions/unauthenticated': 'Please log in to perform this action',
      'functions/permission-denied': 'You do not have permission to generate reports',
      'functions/not-found': 'Report generation function not found',
      'functions/invalid-argument': 'Invalid report parameters',
      'functions/failed-precondition': message, // Use original message
      'functions/internal': 'An internal error occurred. Please try again',
      'functions/unavailable': 'Report service temporarily unavailable. Please try again',
      'functions/deadline-exceeded': 'Report generation timeout. Please try again',
    };

    const friendlyMessage = errorMessages[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE EXPORT
// ============================================================================

/**
 * Singleton instance of ReportsService
 * Use this exported instance in your application
 * 
 * @example
 * import { reportsService } from './services/reports.Service';
 * 
 * // Generate water quality report
 * const waterQuality = await reportsService.generateWaterQualityReport();
 * 
 * // Generate device status report
 * const deviceStatus = await reportsService.generateDeviceStatusReport();
 * 
 * // Generate custom report
 * const customReport = await reportsService.generateReport({
 *   reportType: 'data_summary',
 *   startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
 *   endDate: Date.now()
 * });
 */
export const reportsService = new ReportsService();

/**
 * Default export for convenience
 */
export default reportsService;

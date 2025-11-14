/**
 * Reports Service
 * 
 * Generates various types of analytical reports for water quality data.
 * 
 * Write Operations: Cloud Functions (generateReport)
 * 
 * Features:
 * - Water quality reports
 * - Device status reports
 * - Data summary reports
 * - Compliance reports
 * 
 * @module services/reports
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type {
  GenerateReportRequest,
  WaterQualityReportData,
  DeviceStatusReportData,
  ReportResponse,
} from '../schemas';

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

export class ReportsService {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly functions = getFunctions();
  private readonly functionName = 'ReportCalls';

  // ==========================================================================
  // ERROR MESSAGES
  // ==========================================================================
  
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission to generate reports',
    'functions/not-found': 'Report generation function not found',
    'functions/invalid-argument': 'Invalid report parameters',
    'functions/failed-precondition': '', // Use backend message
    'functions/internal': 'An internal error occurred. Please try again',
    'functions/unavailable': 'Report service temporarily unavailable. Please try again',
    'functions/deadline-exceeded': 'Report generation timeout. Please try again',
  };

  // ==========================================================================
  // WRITE OPERATIONS (Cloud Functions)
  // ==========================================================================

  /**
   * Generic Cloud Function caller with type safety
   * 
   * @template T - Request payload type
   * @template R - Response data type
   * @param action - Cloud Function action name
   * @param data - Request data (without action field)
   * @returns Typed response data
   * @throws {ErrorResponse} If function call fails
   */
  private async callFunction<T, R = any>(
    action: string, 
    data: Omit<T, 'action'>
  ): Promise<R> {
    try {
      const callable = httpsCallable<T, ReportResponse<R>>(
        this.functions,
        this.functionName
      );
      const result = await callable({ action, ...data } as T);
      
      if (!result.data.success) {
        throw new Error(result.data.error || `Failed to ${action}`);
      }
      
      return result.data.data;
    } catch (error: any) {
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  /**
   * Generate water quality report
   * 
   * @param deviceIds - Optional device IDs to filter
   * @param startDate - Optional start timestamp
   * @param endDate - Optional end timestamp
   * @returns Water quality report data
   * @throws {ErrorResponse} If generation fails
   */
  async generateWaterQualityReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<WaterQualityReportData> {
    return this.callFunction<GenerateReportRequest, WaterQualityReportData>(
      'generateWaterQualityReport',
      { deviceIds, startDate, endDate }
    );
  }

  /**
   * Generate device status report
   * 
   * @param deviceIds - Optional device IDs to filter
   * @returns Device status report data
   * @throws {ErrorResponse} If generation fails
   */
  async generateDeviceStatusReport(
    deviceIds?: string[]
  ): Promise<DeviceStatusReportData> {
    return this.callFunction<GenerateReportRequest, DeviceStatusReportData>(
      'generateDeviceStatusReport',
      { deviceIds }
    );
  }

  /**
   * Generate data summary report
   * 
   * @param deviceIds - Optional device IDs to filter
   * @param startDate - Optional start timestamp
   * @param endDate - Optional end timestamp
   * @returns Data summary report
   * @throws {ErrorResponse} If generation fails
   */
  async generateDataSummaryReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> {
    return this.callFunction<GenerateReportRequest, any>(
      'generateDataSummaryReport',
      { deviceIds, startDate, endDate }
    );
  }

  /**
   * Generate compliance report
   * 
   * @param deviceIds - Optional device IDs to filter
   * @param startDate - Optional start timestamp
   * @param endDate - Optional end timestamp
   * @returns Compliance report data
   * @throws {ErrorResponse} If generation fails
   */
  async generateComplianceReport(
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> {
    return this.callFunction<GenerateReportRequest, any>(
      'generateComplianceReport',
      { deviceIds, startDate, endDate }
    );
  }

  /**
   * Generate report (generic method)
   * 
   * @param request - Report generation request
   * @returns Report data based on report type
   * @throws {ErrorResponse} If generation fails
   */
  async generateReport(request: GenerateReportRequest): Promise<any> {
    // Map reportType to action name for backend routing
    const actionMap: Record<string, string> = {
      'water_quality': 'generateWaterQualityReport',
      'device_status': 'generateDeviceStatusReport',
      'data_summary': 'generateDataSummaryReport',
      'compliance': 'generateComplianceReport',
    };

    const reportType = request.reportType || 'water_quality';
    const action = actionMap[reportType];
    if (!action) {
      throw new Error(`Unknown report type: ${reportType}`);
    }

    return this.callFunction<GenerateReportRequest, any>(
      action,
      {
        deviceIds: request.deviceIds,
        startDate: request.startDate,
        endDate: request.endDate,
      }
    );
  }

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
    console.error('[ReportsService] Error:', error);

    // Extract error details from Firebase Functions error
    const code = error.code || 'unknown';
    const message = error.message || defaultMessage;
    const details = error.details || undefined;

    const friendlyMessage = code === 'functions/failed-precondition'
      ? message
      : ReportsService.ERROR_MESSAGES[code] || message;

    return {
      code,
      message: friendlyMessage,
      details,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const reportsService = new ReportsService();
export default reportsService;

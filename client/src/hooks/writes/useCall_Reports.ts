/**
 * useCall_Reports - Write Hook
 * 
 * Handles report generation operations.
 * Wraps reportsService functions with React-friendly state management.
 * 
 * ⚠️ WRITE ONLY - Generates reports, does not handle real-time data
 * 
 * @module hooks/writes
 */

import { useState, useCallback } from 'react';
import { reportsService } from '../../services/reports.Service';
import type { 
  WaterQualityReportData, 
  DeviceStatusReportData,
  GenerateReportRequest 
} from '../../schemas';

/**
 * Report operation types
 */
type ReportOperation = 'waterQuality' | 'deviceStatus' | 'dataSummary' | 'compliance' | 'custom';

/**
 * Hook return value
 */
interface UseCallReportsReturn {
  /** Generate a water quality report */
  generateWaterQualityReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<WaterQualityReportData>;
  
  /** Generate a device status report */
  generateDeviceStatusReport: (deviceIds?: string[]) => Promise<DeviceStatusReportData>;
  
  /** Generate a data summary report */
  generateDataSummaryReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<any>;
  
  /** Generate a compliance report */
  generateComplianceReport: (
    deviceIds?: string[], 
    startDate?: number, 
    endDate?: number
  ) => Promise<any>;
  
  /** Generate a custom report with full control */
  generateReport: (request: GenerateReportRequest) => Promise<any>;
  
  /** Loading state for any operation */
  isLoading: boolean;
  /** Error from last operation */
  error: Error | null;
  /** Success flag - true after successful operation */
  isSuccess: boolean;
  /** Currently executing operation type */
  operationType: ReportOperation | null;
  /** Data from last successful report generation */
  reportData: any | null;
  /** Reset error, success states, and report data */
  reset: () => void;
}

/**
 * Hook for report generation operations
 * 
 * Provides functions to generate various types of reports with proper
 * loading/error/success state management.
 * 
 * @example
 * ```tsx
 * const { 
 *   generateWaterQualityReport,
 *   generateDeviceStatusReport,
 *   isLoading, 
 *   error, 
 *   reportData,
 *   isSuccess
 * } = useCall_Reports();
 * 
 * // Generate water quality report
 * const report = await generateWaterQualityReport(
 *   ['ESP32-001', 'ESP32-002'], 
 *   Date.now() - 7 * 24 * 60 * 60 * 1000, 
 *   Date.now()
 * );
 * 
 * // Generate device status report (all devices)
 * const statusReport = await generateDeviceStatusReport();
 * 
 * if (isSuccess) {
 *   console.log('Report generated:', reportData);
 * }
 * ```
 * 
 * @returns Report generation functions and state
 */
export const useCall_Reports = (): UseCallReportsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [operationType, setOperationType] = useState<ReportOperation | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setIsSuccess(false);
    setOperationType(null);
    setReportData(null);
  }, []);

  const generateWaterQualityReport = useCallback(async (
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<WaterQualityReportData> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('waterQuality');
      setReportData(null);

      const data = await reportsService.generateWaterQualityReport(
        deviceIds,
        startDate,
        endDate
      );

      setIsSuccess(true);
      setReportData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate water quality report');
      console.error('[useCall_Reports] Water quality report error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDeviceStatusReport = useCallback(async (
    deviceIds?: string[]
  ): Promise<DeviceStatusReportData> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('deviceStatus');
      setReportData(null);

      const data = await reportsService.generateDeviceStatusReport(deviceIds);

      setIsSuccess(true);
      setReportData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate device status report');
      console.error('[useCall_Reports] Device status report error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDataSummaryReport = useCallback(async (
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('dataSummary');
      setReportData(null);

      const data = await reportsService.generateDataSummaryReport(
        deviceIds,
        startDate,
        endDate
      );

      setIsSuccess(true);
      setReportData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate data summary report');
      console.error('[useCall_Reports] Data summary report error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateComplianceReport = useCallback(async (
    deviceIds?: string[],
    startDate?: number,
    endDate?: number
  ): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('compliance');
      setReportData(null);

      const data = await reportsService.generateComplianceReport(
        deviceIds,
        startDate,
        endDate
      );

      setIsSuccess(true);
      setReportData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate compliance report');
      console.error('[useCall_Reports] Compliance report error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (
    request: GenerateReportRequest
  ): Promise<any> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsSuccess(false);
      setOperationType('custom');
      setReportData(null);

      const data = await reportsService.generateReport(request);

      setIsSuccess(true);
      setReportData(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate report');
      console.error('[useCall_Reports] Custom report error:', error);
      setError(error);
      setIsSuccess(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateWaterQualityReport,
    generateDeviceStatusReport,
    generateDataSummaryReport,
    generateComplianceReport,
    generateReport,
    isLoading,
    error,
    isSuccess,
    operationType,
    reportData,
    reset,
  };
};

export default useCall_Reports;

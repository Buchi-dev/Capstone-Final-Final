/**
 * Report API Client
 * API client for report generation operations using the shared HTTP client
 */

import { reportHttpClient } from '../../../shared/services/http/httpClient';
import type {
  ReportRequest,
  ReportResponse,
  WaterQualityReport,
  DeviceStatusReport,
  DataSummaryReport,
  ComplianceReport,
} from '../../../schemas';

/**
 * Report API Operations
 */
export const reportApiClient = {
  /**
   * Generate Water Quality Report
   * Comprehensive analysis of water quality parameters
   */
  generateWaterQualityReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number,
    includeCharts = false
  ): Promise<WaterQualityReport> => {
    try {
      const { data } = await reportHttpClient.post<ReportResponse<WaterQualityReport>>('', {
        reportType: 'water_quality',
        deviceId,
        startDate,
        endDate,
        format: 'json',
        includeCharts,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate water quality report');
      }

      return data.data;
    } catch (error) {
      console.error('Water Quality Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Device Status Report
   * Overview of all device statuses and operational health
   */
  generateDeviceStatusReport: async (): Promise<DeviceStatusReport> => {
    try {
      const { data } = await reportHttpClient.post<ReportResponse<DeviceStatusReport>>('', {
        reportType: 'device_status',
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate device status report');
      }

      return data.data;
    } catch (error) {
      console.error('Device Status Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Data Summary Report
   * Statistical summary of sensor data over selected time period
   */
  generateDataSummaryReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number
  ): Promise<DataSummaryReport> => {
    try {
      const { data } = await reportHttpClient.post<ReportResponse<DataSummaryReport>>('', {
        reportType: 'data_summary',
        deviceId,
        startDate,
        endDate,
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate data summary report');
      }

      return data.data;
    } catch (error) {
      console.error('Data Summary Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Compliance Report
   * Regulatory compliance assessment and quality standards verification
   */
  generateComplianceReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number
  ): Promise<ComplianceReport> => {
    try {
      const { data } = await reportHttpClient.post<ReportResponse<ComplianceReport>>('', {
        reportType: 'compliance',
        deviceId,
        startDate,
        endDate,
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate compliance report');
      }

      return data.data;
    } catch (error) {
      console.error('Compliance Report Error:', error);
      throw error;
    }
  },

  /**
   * Generic report generator - supports all report types
   */
  generateReport: async <T = unknown>(request: ReportRequest): Promise<ReportResponse<T>> => {
    try {
      const { data } = await reportHttpClient.post<ReportResponse<T>>('', request);

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report');
      }

      return data;
    } catch (error) {
      console.error('Report Generation Error:', error);
      throw error;
    }
  },
};

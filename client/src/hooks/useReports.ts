/**
 * useReports - Global Hook for Report Operations
 * 
 * Provides both read and write operations for analytical reports.
 * Uses SWR for efficient data fetching and caching.
 * 
 * Read Operations:
 * - List reports with filtering
 * - Get report by ID
 * 
 * Write Operations:
 * - Generate water quality reports
 * - Generate device status reports
 * - Delete reports
 * 
 * @module hooks/useReports
 */

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import {
  reportsService,
  type ReportFilters,
  type Report,
  type WaterQualityReportRequest,
  type DeviceStatusReportRequest,
} from '../services/reports.Service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseReportsOptions {
  filters?: ReportFilters;
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseReportsReturn {
  reports: Report[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  } | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: () => Promise<void>;
}

export interface UseReportOptions {
  reportId: string;
  enabled?: boolean;
}

export interface UseReportReturn {
  report: Report | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseReportMutationsReturn {
  generateWaterQualityReport: (request: WaterQualityReportRequest) => Promise<Report>;
  generateDeviceStatusReport: (request: DeviceStatusReportRequest) => Promise<Report>;
  deleteReport: (reportId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// READ HOOK - Fetch reports list
// ============================================================================

/**
 * Fetch reports with optional filtering
 * 
 * @example
 * const { reports, pagination, isLoading, refetch } = useReports({
 *   filters: { type: 'water-quality', status: 'completed', page: 1, limit: 20 }
 * });
 */
export function useReports(options: UseReportsOptions = {}): UseReportsReturn {
  const {
    filters = {},
    pollInterval = 0, // No polling by default for reports
    enabled = true,
  } = options;

  const cacheKey = enabled
    ? ['reports', 'list', JSON.stringify(filters)]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await reportsService.getReports(filters);
      return {
        reports: response.data,
        pagination: response.pagination || null,
      };
    },
    {
      refreshInterval: pollInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    reports: data?.reports || [],
    pagination: data?.pagination || null,
    isLoading,
    error: error || null,
    refetch,
    mutate: async () => { await mutate(); },
  };
}

// ============================================================================
// READ HOOK - Fetch single report
// ============================================================================

/**
 * Fetch a single report by ID
 * 
 * @example
 * const { report, isLoading, refetch } = useReport({
 *   reportId: 'report-123'
 * });
 */
export function useReport(options: UseReportOptions): UseReportReturn {
  const { reportId, enabled = true } = options;

  const cacheKey = enabled && reportId
    ? ['reports', reportId]
    : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await reportsService.getReportById(reportId);
      return response.data;
    },
    {
      revalidateOnFocus: false,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    report: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// WRITE HOOK - Report mutations
// ============================================================================

/**
 * Perform write operations on reports (generate, delete)
 * 
 * @example
 * const { generateWaterQualityReport, deleteReport, isLoading } = useReportMutations();
 * 
 * const report = await generateWaterQualityReport({
 *   startDate: '2024-01-01',
 *   endDate: '2024-01-31',
 *   deviceIds: ['DEVICE-001', 'DEVICE-002']
 * });
 * 
 * await deleteReport('report-123');
 */
export function useReportMutations(): UseReportMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateWaterQualityReport = useCallback(
    async (request: WaterQualityReportRequest): Promise<Report> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await reportsService.generateWaterQualityReport(request);
        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate water quality report');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const generateDeviceStatusReport = useCallback(
    async (request: DeviceStatusReportRequest): Promise<Report> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await reportsService.generateDeviceStatusReport(request);
        return response.data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to generate device status report');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteReport = useCallback(async (reportId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await reportsService.deleteReport(reportId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete report');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateWaterQualityReport,
    generateDeviceStatusReport,
    deleteReport,
    isLoading,
    error,
  };
}

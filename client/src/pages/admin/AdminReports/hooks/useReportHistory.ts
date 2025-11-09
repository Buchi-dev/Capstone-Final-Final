/**
 * useReportHistory - Local UI Hook
 * 
 * Manages report history in localStorage (UI state only).
 * This is acceptable as a local hook because it handles client-side
 * persistence and does NOT wrap service layer operations.
 * 
 * @module pages/admin/AdminReports/hooks
 */
import { useState, useEffect } from 'react';
import type { ReportHistory } from '../../../../schemas';

/**
 * Manages report generation history in localStorage
 * 
 * Stores last 10 generated reports for quick access.
 * This is UI-specific state management, not data fetching.
 * 
 * @example
 * ```tsx
 * const { reportHistory, addReportToHistory } = useReportHistory();
 * 
 * // Add new report to history
 * addReportToHistory({
 *   id: 'report-123',
 *   type: 'water_quality',
 *   generatedAt: new Date(),
 *   config: formValues,
 *   summary: 'Water quality report for 5 devices'
 * });
 * ```
 * 
 * @returns Report history array and management functions
 */
export const useReportHistory = () => {
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);

  const loadReportHistory = () => {
    try {
      const history = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      setReportHistory(history.map((item: any) => ({
        ...item,
        generatedAt: new Date(item.generatedAt)
      })));
    } catch (error) {
      console.warn('[useReportHistory] Failed to load report history:', error);
      setReportHistory([]);
    }
  };

  const addReportToHistory = (report: ReportHistory) => {
    try {
      const existingHistory = JSON.parse(localStorage.getItem('reportHistory') || '[]');
      const updatedHistory = [report, ...existingHistory].slice(0, 10);
      localStorage.setItem('reportHistory', JSON.stringify(updatedHistory));
      setReportHistory(updatedHistory);
    } catch (error) {
      console.warn('[useReportHistory] Failed to save report to history:', error);
    }
  };

  useEffect(() => {
    loadReportHistory();
  }, []);

  return {
    reportHistory,
    loadReportHistory,
    addReportToHistory,
  };
};

/**
 * useAlerts - Global Hook for Alert Operations
 * 
 * Provides both read and write operations for water quality alerts.
 * Uses SWR for efficient data fetching and caching.
 * 
 * Read Operations:
 * - List alerts with filtering
 * - Get alert statistics
 * - Real-time updates via polling
 * 
 * Write Operations:
 * - Acknowledge alerts
 * - Resolve alerts
 * 
 * @module hooks/useAlerts
 */

import useSWR from 'swr';
import { useState, useCallback } from 'react';
import { alertsService, type AlertFilters, type AlertStats } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAlertsOptions {
  filters?: AlertFilters;
  enabled?: boolean;
}

export interface UseAlertsReturn {
  alerts: WaterQualityAlert[];
  stats: AlertStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: () => Promise<void>;
}

export interface UseAlertMutationsReturn {
  acknowledgeAlert: (alertId: string) => Promise<void>;
  resolveAlert: (alertId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// READ HOOK - Fetch and subscribe to alerts
// ============================================================================

/**
 * Fetch alerts with optional filtering
 * 
 * @example
 * const { alerts, stats, isLoading, refetch } = useAlerts({
 *   filters: { status: 'Unacknowledged', severity: 'Critical' }
 * });
 */
export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    filters = {},
    enabled = true,
  } = options;

  // Generate cache key from filters
  const cacheKey = enabled
    ? ['alerts', 'list', JSON.stringify(filters)]
    : null;

  // Fetch alerts with SWR
  const {
    data: alertsData,
    error: alertsError,
    mutate,
    isLoading: alertsLoading,
  } = useSWR(
    cacheKey,
    async () => {
      const response = await alertsService.getAlerts(filters);
      return response.data;
    },
    {
      revalidateOnFocus: false, // Rely on manual refresh or polling
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Prevent duplicate requests for 10 seconds
    }
  );

  // Fetch stats
  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(
    enabled ? ['alerts', 'stats'] : null,
    async () => {
      const response = await alertsService.getAlertStats();
      return response.data;
    },
    {
      revalidateOnFocus: false, // Stats don't change frequently
      dedupingInterval: 15000, // Increased deduping interval
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    alerts: alertsData || [],
    stats: statsData || null,
    isLoading: alertsLoading || statsLoading,
    error: alertsError || statsError || null,
    refetch,
    mutate: async () => { await mutate(); },
  };
}

// ============================================================================
// WRITE HOOK - Alert mutations
// ============================================================================

/**
 * Perform write operations on alerts (acknowledge, resolve)
 * 
 * @example
 * const { acknowledgeAlert, resolveAlert, isLoading } = useAlertMutations();
 * 
 * await acknowledgeAlert('alert-123');
 * await resolveAlert('alert-456');
 */
export function useAlertMutations(): UseAlertMutationsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await alertsService.acknowledgeAlert(alertId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to acknowledge alert');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await alertsService.resolveAlert(alertId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resolve alert');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    acknowledgeAlert,
    resolveAlert,
    isLoading,
    error,
  };
}

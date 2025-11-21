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
import { useState, useCallback, useEffect } from 'react';
import { alertsService, type AlertFilters, type AlertStats } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';
import { useVisibilityPolling } from './useVisibilityPolling';
import { getSocket, subscribe, unsubscribe } from '../utils/socket';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseAlertsOptions {
  filters?: AlertFilters;
  pollInterval?: number;
  enabled?: boolean;
  realtime?: boolean; // Enable WebSocket real-time updates
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
 * Fetch alerts with optional filtering and real-time updates
 * 
 * @example
 * const { alerts, stats, isLoading, refetch } = useAlerts({
 *   filters: { status: 'Unacknowledged', severity: 'Critical' },
 *   pollInterval: 5000 // Poll every 5 seconds
 * });
 */
export function useAlerts(options: UseAlertsOptions = {}): UseAlertsReturn {
  const {
    filters = {},
    pollInterval = 15000, // Changed from 10000 to 15000
    enabled = true,
    realtime = true, // Enable WebSocket by default
  } = options;

  // Add visibility detection to pause polling when tab is hidden
  const adjustedPollInterval = useVisibilityPolling(pollInterval);

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
      refreshInterval: realtime ? 0 : adjustedPollInterval, // Disable polling if realtime
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!enabled || !realtime) return;

    const socket = getSocket();
    if (!socket?.connected) {
      console.warn('[useAlerts] Socket not connected, using polling fallback');
      return;
    }

    // Subscribe to alerts room
    subscribe('alerts');
    console.log('[useAlerts] Subscribed to real-time alerts');

    // Handle new alerts
    const handleNewAlert = (data: any) => {
      console.log('[useAlerts] New alert received:', data.alert);
      mutate(); // Revalidate cache
    };

    // Handle alert updates
    const handleAlertUpdated = (data: any) => {
      console.log('[useAlerts] Alert updated:', data.alertId);
      mutate(); // Revalidate cache
    };

    socket.on('alert:new', handleNewAlert);
    socket.on('alert:updated', handleAlertUpdated);

    return () => {
      socket.off('alert:new', handleNewAlert);
      socket.off('alert:updated', handleAlertUpdated);
      unsubscribe('alerts');
      console.log('[useAlerts] Unsubscribed from real-time alerts');
    };
  }, [enabled, realtime, mutate]);

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
      refreshInterval: pollInterval * 2, // Stats update less frequently
      revalidateOnFocus: false,
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

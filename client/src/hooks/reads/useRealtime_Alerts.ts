/**
 * useRealtime_Alerts - Read Hook
 * 
 * Real-time listener for water quality alerts via Firestore.
 * Subscribes to alert updates and maintains live data sync.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import { useState, useEffect } from 'react';
import { alertsService } from '../../services/alerts.Service';
import type { WaterQualityAlert } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeAlertsOptions {
  /** Maximum number of alerts to fetch (default: 20) */
  maxAlerts?: number;
  /** Enable/disable auto-subscription (default: true) */
  enabled?: boolean;
}

/**
 * Hook return value
 */
interface UseRealtimeAlertsReturn {
  /** Array of real-time alerts */
  alerts: WaterQualityAlert[];
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function (reconnects listener) */
  refetch: () => void;
}

/**
 * Subscribe to real-time water quality alerts from Firestore
 * 
 * @example
 * ```tsx
 * const { alerts, isLoading, error } = useRealtime_Alerts({ maxAlerts: 50 });
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time alerts data, loading state, and error state
 */
export const useRealtime_Alerts = (
  options: UseRealtimeAlertsOptions = {}
): UseRealtimeAlertsReturn => {
  const { maxAlerts = 20, enabled = true } = options;

  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Subscribe to real-time alerts via service layer
    const unsubscribe = alertsService.subscribeToAlerts(
      (alertsData) => {
        setAlerts(alertsData);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('[useRealtime_Alerts] Subscription error:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
        setIsLoading(false);
      },
      maxAlerts
    );

    return () => {
      unsubscribe();
    };
  }, [maxAlerts, enabled, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return {
    alerts,
    isLoading,
    error,
    refetch,
  };
};

export default useRealtime_Alerts;

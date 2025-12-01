/**
 * useHealth - Global Hook for System Health Monitoring
 * 
 * Provides read-only access to system health metrics including:
 * - Comprehensive system health
 * - Liveness probe
 * - Readiness probe
 * 
 * Uses SWR for efficient data fetching and caching with real-time updates.
 * 
 * @module hooks/useHealth
 */

import useSWR from 'swr';
import { useCallback } from 'react';
import {
  healthService,
  type SystemHealth,
  type LivenessResponse,
  type ReadinessResponse,
} from '../services/health.Service';
import { useVisibilityPolling } from './useVisibilityPolling';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UseSystemHealthOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseSystemHealthReturn {
  health: SystemHealth | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseLivenessOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseLivenessReturn {
  liveness: LivenessResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseReadinessOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export interface UseReadinessReturn {
  readiness: ReadinessResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// SYSTEM HEALTH HOOK
// ============================================================================

/**
 * Fetch comprehensive system health metrics
 * Includes database, Redis, email service, memory, and OAuth status
 * 
 * @example
 * const { health, isLoading, refetch } = useSystemHealth({
 *   pollInterval: 10000 // Update every 10 seconds
 * });
 */
export function useSystemHealth(
  options: UseSystemHealthOptions = {}
): UseSystemHealthReturn {
  const {
    pollInterval = 60000, // Changed from 15000 to 60000
    enabled = true,
  } = options;

  // Add visibility detection to pause polling when tab is hidden
  const adjustedPollInterval = useVisibilityPolling(pollInterval);

  const cacheKey = enabled ? ['health', 'system'] : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      return await healthService.getSystemHealth();
    },
    {
      refreshInterval: adjustedPollInterval, // Use adjusted interval
      revalidateOnFocus: false, // Disabled to prevent duplicate calls on focus
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Prevent duplicate requests for 60 seconds (increased from 3s)
      keepPreviousData: true, // Keep showing old data while fetching
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    health: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// LIVENESS PROBE HOOK
// ============================================================================

/**
 * Fetch liveness probe status (Kubernetes health check)
 * Indicates if the application is running
 * 
 * @example
 * const { liveness, isLoading } = useLiveness({
 *   pollInterval: 30000 // Check every 30 seconds
 * });
 */
export function useLiveness(
  options: UseLivenessOptions = {}
): UseLivenessReturn {
  const {
    pollInterval = 30000, // Default 30 seconds
    enabled = true,
  } = options;

  const cacheKey = enabled ? ['health', 'liveness'] : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      return await healthService.checkLiveness();
    },
    {
      refreshInterval: pollInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    liveness: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

// ============================================================================
// READINESS PROBE HOOK
// ============================================================================

/**
 * Fetch readiness probe status (Kubernetes health check)
 * Indicates if the application is ready to accept traffic
 * 
 * @example
 * const { readiness, isLoading } = useReadiness({
 *   pollInterval: 30000 // Check every 30 seconds
 * });
 */
export function useReadiness(
  options: UseReadinessOptions = {}
): UseReadinessReturn {
  const {
    pollInterval = 30000, // Default 30 seconds
    enabled = true,
  } = options;

  const cacheKey = enabled ? ['health', 'readiness'] : null;

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR(
    cacheKey,
    async () => {
      return await healthService.checkReadiness();
    },
    {
      refreshInterval: pollInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    readiness: data || null,
    isLoading,
    error: error || null,
    refetch,
  };
}

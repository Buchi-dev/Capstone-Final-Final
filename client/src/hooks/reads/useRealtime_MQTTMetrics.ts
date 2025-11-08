/**
 * useRealtime_MQTTMetrics - Read Hook
 * 
 * Real-time polling for MQTT Bridge health and status metrics.
 * Uses HTTP polling (not WebSocket) to fetch metrics at regular intervals.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * @module hooks/reads
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mqttService } from '../../services/mqtt.service';
import type { MqttBridgeHealth, MqttBridgeStatus } from '../../services/mqtt.service';

/**
 * Hook configuration options
 */
interface UseRealtimeMQTTMetricsOptions {
  /** Polling interval in milliseconds (default: 2000ms / 2 seconds) */
  pollInterval?: number;
  /** Enable/disable auto-polling (default: true) */
  enabled?: boolean;
  /** Retry delay after errors in milliseconds (default: 5000ms) */
  retryDelay?: number;
}

/**
 * Hook return value
 */
interface UseRealtimeMQTTMetricsReturn {
  /** MQTT Bridge health data */
  health: MqttBridgeHealth | null;
  /** MQTT Bridge status data */
  status: MqttBridgeStatus | null;
  /** Loading state - true on initial load only */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Timestamp of last successful update */
  lastUpdate: Date | null;
  /** Manual refetch function */
  refetch: () => Promise<void>;
  /** Whether actively polling */
  isPolling: boolean;
}

/**
 * Poll MQTT Bridge metrics in real-time
 * 
 * Fetches health and status data at regular intervals using HTTP polling.
 * Implements smart caching and error recovery.
 * 
 * @example
 * ```tsx
 * const { 
 *   health, 
 *   status, 
 *   isLoading, 
 *   error, 
 *   lastUpdate 
 * } = useRealtime_MQTTMetrics({
 *   pollInterval: 3000 // Poll every 3 seconds
 * });
 * 
 * if (health?.mqtt.connected) {
 *   console.log('MQTT Bridge is connected');
 * }
 * ```
 * 
 * @param options - Configuration options
 * @returns Real-time MQTT metrics data, loading state, and error state
 */
export const useRealtime_MQTTMetrics = (
  options: UseRealtimeMQTTMetricsOptions = {}
): UseRealtimeMQTTMetricsReturn => {
  const { 
    pollInterval = 2000, 
    enabled = true,
    retryDelay = 5000
  } = options;

  const [health, setHealth] = useState<MqttBridgeHealth | null>(null);
  const [status, setStatus] = useState<MqttBridgeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Refs for optimization and cleanup
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const lastValidHealthRef = useRef<MqttBridgeHealth | null>(null);
  const lastValidStatusRef = useRef<MqttBridgeStatus | null>(null);
  const prevHealthStrRef = useRef<string | null>(null);
  const prevStatusStrRef = useRef<string | null>(null);

  /**
   * Fetch both health and status data
   */
  const fetchMetrics = useCallback(async () => {
    try {
      // Fetch both endpoints in parallel
      const [healthData, statusData] = await Promise.all([
        mqttService.getHealth(),
        mqttService.getStatus(),
      ]);

      // Deduplicate health data
      const healthStr = JSON.stringify(healthData);
      if (prevHealthStrRef.current !== healthStr) {
        setHealth(healthData);
        lastValidHealthRef.current = healthData;
        prevHealthStrRef.current = healthStr;
      }

      // Deduplicate status data
      const statusStr = JSON.stringify(statusData);
      if (prevStatusStrRef.current !== statusStr) {
        setStatus(statusData);
        lastValidStatusRef.current = statusData;
        prevStatusStrRef.current = statusStr;
      }

      setError(null);
      setLastUpdate(new Date());
      setIsLoading(false);
      errorCountRef.current = 0; // Reset error count on success

    } catch (err) {
      errorCountRef.current++;
      const error = err instanceof Error ? err : new Error('Failed to fetch MQTT metrics');
      
      console.error('[useRealtime_MQTTMetrics] Fetch error:', error);
      
      // Keep last valid data on error
      if (lastValidHealthRef.current) {
        console.warn('[useRealtime_MQTTMetrics] Using cached health data due to error');
      }
      if (lastValidStatusRef.current) {
        console.warn('[useRealtime_MQTTMetrics] Using cached status data due to error');
      }

      setError(error);
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual refetch
   */
  const refetch = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  /**
   * Polling effect
   */
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      await fetchMetrics();

      // Schedule next poll with adaptive delay
      const delay = errorCountRef.current > 0 ? retryDelay : pollInterval;
      
      timeoutIdRef.current = setTimeout(poll, delay);
    };

    // Start polling
    poll();

    return () => {
      setIsPolling(false);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  }, [enabled, pollInterval, retryDelay, fetchMetrics]);

  return {
    health,
    status,
    isLoading,
    error,
    lastUpdate,
    refetch,
    isPolling,
  };
};

export default useRealtime_MQTTMetrics;

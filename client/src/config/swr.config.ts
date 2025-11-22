/**
 * SWR Configuration for Data Fetching with Polling
 * Provides real-time-like updates through HTTP polling with aggressive deduplication
 */
import { type SWRConfiguration } from 'swr';
import { apiClient } from './api.config';

/**
 * Fetcher function for SWR
 * Extracts data from the response (handles both { data } and direct responses)
 */
export const fetcher = async (url: string) => {
  const response = await apiClient.get(url);
  // Extract data from standardized API response { success, data }
  // Backend returns: { success: true, data: [...], pagination?: {...} }
  // We return the full response to preserve pagination info
  return response.data;
};

/**
 * Base SWR configuration
 * Applied to all SWR hooks unless overridden
 * 
 * OPTIMIZED FOR RATE LIMIT COMPLIANCE:
 * - Long deduping interval prevents duplicate requests
 * - Cache-first strategy reduces unnecessary network calls
 * - Shared cache across all components
 * - Aggressive deduplication to stay under 20 req/min limit
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,    // Disabled to prevent refetch on tab switch
  revalidateOnReconnect: true, // Refetch when network reconnects
  shouldRetryOnError: true,    // Retry failed requests
  errorRetryCount: 3,          // Max retry attempts
  errorRetryInterval: 10000,   // 10 seconds between retries (was 5s)
  dedupingInterval: 60000,     // 1 minute - prevent duplicate requests (was 10s)
  focusThrottleInterval: 60000, // Throttle focus revalidation to max once per minute (was 30s)
  provider: () => new Map(),   // Use global cache provider
  onError: (error: Error) => {
    console.error('[SWR Error]', error);
  },
};

/**
 * Real-time polling configuration
 * For critical data that needs frequent updates (alerts, sensor readings)
 * NOTE: Should rely on WebSocket for real-time updates, HTTP polling is fallback only
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 60000, // 1 minute fallback polling (WebSocket is primary)
  dedupingInterval: 30000, // 30 second deduplication
};

/**
 * Important data polling configuration
 * For important but less critical data (device list, analytics)
 */
export const swrImportantConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 120000, // 2 minutes
  dedupingInterval: 60000, // 1 minute deduplication
};

/**
 * Static data configuration
 * For data that rarely changes (reports, user profiles)
 * No automatic polling - manual refresh only
 */
export const swrStaticConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 0, // No polling
  revalidateOnFocus: false, // Don't refetch on focus
};

/**
 * Analytics polling configuration
 * Poll every 2 minutes for dashboard analytics
 */
export const swrAnalyticsConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 120000, // Poll every 2 minutes (was 30s)
};

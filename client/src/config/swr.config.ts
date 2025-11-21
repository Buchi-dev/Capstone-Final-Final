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
 * OPTIMIZED FOR DEDUPLICATION:
 * - Long deduping interval prevents duplicate requests
 * - Cache-first strategy reduces unnecessary network calls
 * - Shared cache across all components
 */
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,    // Disabled to prevent refetch on tab switch (use manual refresh instead)
  revalidateOnReconnect: true, // Refetch when network reconnects
  shouldRetryOnError: true,    // Retry failed requests
  errorRetryCount: 3,          // Max retry attempts
  errorRetryInterval: 5000,    // 5 seconds between retries
  dedupingInterval: 10000,     // Increased from 2s to 10s - prevent duplicate requests for 10 seconds
  focusThrottleInterval: 30000, // Throttle focus revalidation to max once per 30 seconds
  provider: () => new Map(),   // Use global cache provider
  onError: (error: Error) => {
    console.error('[SWR Error]', error);
  },
};

/**
 * Real-time polling configuration
 * For critical data that needs frequent updates (alerts, sensor readings)
 * Optimized from 5 seconds to 30 seconds - rely on WebSocket for real-time updates
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Changed from 15000 to 30000 (30 seconds)
  dedupingInterval: 15000, // Increased from 1000 to 15000
};

/**
 * Important data polling configuration
 * For important but less critical data (device list, analytics)
 * Optimized from 10 seconds to 30 seconds
 */
export const swrImportantConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Changed from 10000 to 30000
  dedupingInterval: 2000,
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
 * Poll every 30 seconds for dashboard analytics
 */
export const swrAnalyticsConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Poll every 30 seconds
};

/**
 * useRealtime_AnalyticsData - Global Read Hook
 * 
 * Fetches historical sensor data and analytics for date range.
 * Combines device history, alerts, and aggregated metrics.
 * 
 * ⚠️ READ ONLY - No write operations allowed
 * 
 * Architecture:
 * - Fetches historical data from RTDB (sensorReadings/{deviceId}/history)
 * - Fetches alerts from Firestore
 * - Enriches data with device metadata
 * - Provides aggregated metrics and time-series data
 * 
 * @module hooks/reads
 */

import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../../services/analytics.service';
import { devicesService } from '../../services/devices.Service';
import type {
  DateRangeFilter,
  HistoricalSensorData,
  AggregatedMetrics,
  TimeSeriesDataPoint,
  AlertStatistics,
  DevicePerformanceMetrics,
  AnalyticsComplianceStatus,
  LocationAnalytics,
} from '../../schemas/analytics.schema';
import type { Device, WaterQualityAlert } from '../../schemas';

/**
 * Hook configuration options
 */
interface UseRealtimeAnalyticsDataOptions {
  /** Date range for analytics (required) */
  dateRange: DateRangeFilter;
  /** Device IDs to include (optional, defaults to all devices) */
  deviceIds?: string[];
  /** Enable/disable auto-fetch (default: true) */
  enabled?: boolean;
  /** Aggregation interval for metrics (default: 'day') */
  aggregationInterval?: 'hour' | 'day' | 'week';
}

/**
 * Hook return value
 */
interface UseRealtimeAnalyticsDataReturn {
  /** Historical sensor data with device context */
  historicalData: HistoricalSensorData[];
  /** Time-series data points for charts */
  timeSeriesData: TimeSeriesDataPoint[];
  /** Aggregated metrics by time period */
  aggregatedMetrics: AggregatedMetrics[];
  /** Alert statistics by time period */
  alertStatistics: AlertStatistics[];
  /** Device performance metrics */
  devicePerformance: DevicePerformanceMetrics[];
  /** Compliance status for water quality parameters */
  complianceStatus: AnalyticsComplianceStatus[];
  /** Location-based analytics */
  locationAnalytics: LocationAnalytics[];
  /** Historical alerts */
  historicalAlerts: WaterQualityAlert[];
  /** Device metadata */
  devices: Device[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Manual refetch function */
  refetch: () => void;
}

/**
 * Fetch and process historical analytics data
 * 
 * Provides comprehensive analytics including:
 * - Historical sensor readings
 * - Time-series data for charts
 * - Aggregated metrics (hourly/daily/weekly)
 * - Alert statistics
 * - Device performance metrics
 * - Compliance tracking
 * - Location-based insights
 * 
 * @example
 * ```tsx
 * const { 
 *   historicalData, 
 *   timeSeriesData, 
 *   aggregatedMetrics,
 *   isLoading 
 * } = useRealtime_AnalyticsData({
 *   dateRange: {
 *     startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
 *     endDate: new Date()
 *   },
 *   aggregationInterval: 'day'
 * });
 * ```
 * 
 * @param options - Configuration options
 * @returns Historical analytics data, metrics, and loading state
 */
export const useRealtime_AnalyticsData = (
  options: UseRealtimeAnalyticsDataOptions
): UseRealtimeAnalyticsDataReturn => {
  const {
    dateRange,
    deviceIds,
    enabled = true,
    aggregationInterval = 'day',
  } = options;

  const [historicalData, setHistoricalData] = useState<HistoricalSensorData[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetrics[]>([]);
  const [alertStatistics, setAlertStatistics] = useState<AlertStatistics[]>([]);
  const [devicePerformance, setDevicePerformance] = useState<DevicePerformanceMetrics[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<AnalyticsComplianceStatus[]>([]);
  const [locationAnalytics, setLocationAnalytics] = useState<LocationAnalytics[]>([]);
  const [historicalAlerts, setHistoricalAlerts] = useState<WaterQualityAlert[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchAnalyticsData = useCallback(async () => {
    if (!enabled || !dateRange) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // STEP 1: Fetch device list from Firestore
      const allDevices = await devicesService.listDevices();
      setDevices(allDevices);

      // Filter devices if deviceIds provided
      const targetDevices = deviceIds
        ? allDevices.filter(d => deviceIds.includes(d.deviceId))
        : allDevices;

      if (targetDevices.length === 0) {
        setIsLoading(false);
        return;
      }

      const targetDeviceIds = targetDevices.map(d => d.deviceId);

      // STEP 2: Fetch historical sensor data from RTDB
      const rawHistoricalData = await analyticsService.getMultiDeviceHistory(
        targetDeviceIds,
        dateRange,
        1000 // Limit per device
      );

      // Enrich with device metadata
      const enrichedData = analyticsService.enrichHistoricalData(
        rawHistoricalData,
        targetDevices
      );
      setHistoricalData(enrichedData);

      // STEP 3: Process time-series data
      const timeSeries = analyticsService.aggregateToTimeSeries(
        enrichedData,
        aggregationInterval === 'hour' ? 60 : aggregationInterval === 'day' ? 1440 : 10080
      );
      setTimeSeriesData(timeSeries);

      // STEP 4: Calculate aggregated metrics
      const allReadings = enrichedData.flatMap(d => d.readings);
      const metrics = analyticsService.calculateAggregatedMetrics(
        allReadings,
        aggregationInterval
      );
      setAggregatedMetrics(metrics);

      // STEP 5: Calculate compliance status
      const compliance = analyticsService.calculateComplianceStatus(allReadings);
      setComplianceStatus(compliance);

      // STEP 6: Fetch and process historical alerts
      const alerts = await analyticsService.getHistoricalAlerts(dateRange);
      setHistoricalAlerts(alerts);

      // Calculate alert statistics
      const alertStats = analyticsService.calculateAlertStatistics(
        alerts,
        aggregationInterval
      );
      setAlertStatistics(alertStats);

      // STEP 7: Calculate device performance metrics
      const historicalDataMap = new Map(
        enrichedData.map(d => [d.deviceId, d.readings])
      );
      const performance = analyticsService.calculateDevicePerformance(
        targetDevices,
        historicalDataMap,
        alerts,
        dateRange
      );
      setDevicePerformance(performance);

      // STEP 8: Calculate location-based analytics
      const locationData = analyticsService.calculateLocationAnalytics(
        targetDevices,
        historicalDataMap,
        alerts.filter(a => a.status === 'Active')
      );
      setLocationAnalytics(locationData);

      setIsLoading(false);
    } catch (err) {
      console.error('[useRealtime_AnalyticsData] Error fetching analytics:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics data'));
      setIsLoading(false);
    }
  }, [dateRange, deviceIds, enabled, aggregationInterval]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    historicalData,
    timeSeriesData,
    aggregatedMetrics,
    alertStatistics,
    devicePerformance,
    complianceStatus,
    locationAnalytics,
    historicalAlerts,
    devices,
    isLoading,
    error,
    refetch,
  };
};

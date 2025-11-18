/**
 * Analytics Service
 * 
 * Provides advanced analytics operations for water quality monitoring.
 * Fetches historical sensor data, aggregates metrics, and computes trends.
 * 
 * Data Sources:
 * - RTDB: Historical sensor readings (sensorReadings/{deviceId}/history)
 * - Firestore: Device metadata, alerts historical data
 * 
 * @module services/analytics
 */

import { getDatabase, ref, query, limitToLast, get } from 'firebase/database';
import { getFirestore, collection, query as firestoreQuery, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { SensorReading, Device, WaterQualityAlert, AnalyticsComplianceStatus } from '../schemas';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Date range filter for analytics queries
 */
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

/**
 * Historical sensor data with device context
 */
export interface HistoricalSensorData {
  deviceId: string;
  deviceName: string;
  location?: string;
  readings: SensorReading[];
}

/**
 * Aggregated metrics for a time period
 */
export interface AggregatedMetrics {
  period: string; // ISO date string
  avgPh: number;
  avgTds: number;
  avgTurbidity: number;
  minPh: number;
  maxPh: number;
  minTds: number;
  maxTds: number;
  minTurbidity: number;
  maxTurbidity: number;
  readingCount: number;
  devicesCount: number;
}

/**
 * Time-series data point for charts
 */
export interface TimeSeriesDataPoint {
  timestamp: number;
  date: string;
  ph: number;
  tds: number;
  turbidity: number;
  deviceId: string;
  deviceName: string;
}

/**
 * Alert statistics for a time period
 */
export interface AlertStatistics {
  period: string;
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  advisoryAlerts: number;
  resolvedAlerts: number;
  avgResolutionTime: number; // in minutes
}

/**
 * Device performance metrics
 */
export interface DevicePerformanceMetrics {
  deviceId: string;
  deviceName: string;
  location?: string;
  uptimePercentage: number;
  totalReadings: number;
  avgPh: number;
  avgTds: number;
  avgTurbidity: number;
  alertCount: number;
  lastSeen: number;
  qualityScore: number; // 0-100
}

/**
 * Location-based analytics
 */
export interface LocationAnalytics {
  building: string;
  floor: string;
  deviceCount: number;
  avgWaterQualityScore: number;
  activeAlertCount: number;
  readings: {
    avgPh: number;
    avgTds: number;
    avgTurbidity: number;
  };
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AnalyticsService {
  private readonly rtdb = getDatabase();
  private readonly firestore = getFirestore();

  // WHO Water Quality Guidelines
  private static readonly THRESHOLDS = {
    ph: { min: 6.5, max: 8.5 },
    tds: { max: 500 }, // ppm
    turbidity: { max: 5 }, // NTU
  };

  // ==========================================================================
  // HISTORICAL DATA FETCHING
  // ==========================================================================

  /**
   * Fetch historical sensor readings for a device within a date range
   * 
   * @param deviceId - Device identifier
   * @param dateRange - Date range filter (optional, defaults to last 24 hours)
   * @param limit - Maximum number of readings (default: 1000)
   * @returns Historical sensor readings
   * 
   * @example
   * ```ts
   * const history = await analyticsService.getDeviceHistory('device-123', {
   *   startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   endDate: new Date()
   * });
   * ```
   */
  async getDeviceHistory(
    deviceId: string,
    dateRange?: DateRangeFilter,
    limit: number = 1000
  ): Promise<SensorReading[]> {
    try {
      const historyRef = ref(this.rtdb, `sensorReadings/${deviceId}/history`);
      
      // Firebase RTDB doesn't support complex range queries, so fetch all and filter client-side
      const snapshot = await get(query(historyRef, limitToLast(limit)));
      
      if (!snapshot.exists()) {
        return [];
      }

      const allReadings = Object.values(snapshot.val()) as SensorReading[];
      
      // Filter by date range if provided
      if (dateRange) {
        const startTimestamp = dateRange.startDate.getTime();
        const endTimestamp = dateRange.endDate.getTime();
        
        return allReadings
          .filter(reading => 
            reading.timestamp >= startTimestamp && 
            reading.timestamp <= endTimestamp
          )
          .sort((a, b) => b.timestamp - a.timestamp);
      }

      return allReadings.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(`Error fetching device history for ${deviceId}:`, error);
      throw new Error(`Failed to fetch device history: ${deviceId}`);
    }
  }

  /**
   * Fetch historical data for multiple devices
   * 
   * @param deviceIds - Array of device identifiers
   * @param dateRange - Date range filter
   * @param limit - Maximum readings per device
   * @returns Historical data for all devices
   */
  async getMultiDeviceHistory(
    deviceIds: string[],
    dateRange?: DateRangeFilter,
    limit: number = 500
  ): Promise<HistoricalSensorData[]> {
    try {
      const promises = deviceIds.map(async (deviceId) => {
        const readings = await this.getDeviceHistory(deviceId, dateRange, limit);
        return {
          deviceId,
          deviceName: deviceId, // Will be enriched with device metadata
          readings,
        };
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Error fetching multi-device history:', error);
      throw new Error('Failed to fetch multi-device history');
    }
  }

  /**
   * Enrich historical data with device metadata (name, location)
   * 
   * @param historicalData - Historical sensor data
   * @param devices - Device metadata array
   * @returns Enriched historical data
   */
  enrichHistoricalData(
    historicalData: HistoricalSensorData[],
    devices: Device[]
  ): HistoricalSensorData[] {
    const deviceMap = new Map(devices.map(d => [d.deviceId, d]));

    return historicalData.map(data => {
      const device = deviceMap.get(data.deviceId);
      return {
        ...data,
        deviceName: device?.name || data.deviceId,
        location: device?.metadata?.location
          ? `${device.metadata.location.building}, ${device.metadata.location.floor}`
          : undefined,
      };
    });
  }

  // ==========================================================================
  // AGGREGATION & TIME-SERIES
  // ==========================================================================

  /**
   * Aggregate sensor readings into time-series data points
   * 
   * @param historicalData - Historical sensor data
   * @param interval - Time interval in minutes (default: 60 = hourly)
   * @returns Time-series data points
   */
  aggregateToTimeSeries(
    historicalData: HistoricalSensorData[],
    interval: number = 60
  ): TimeSeriesDataPoint[] {
    const intervalMs = interval * 60 * 1000;
    const dataPoints: TimeSeriesDataPoint[] = [];

    historicalData.forEach(deviceData => {
      deviceData.readings.forEach(reading => {
        // Round timestamp to interval
        const roundedTimestamp = Math.floor(reading.timestamp / intervalMs) * intervalMs;
        
        dataPoints.push({
          timestamp: roundedTimestamp,
          date: new Date(roundedTimestamp).toISOString(),
          ph: reading.ph,
          tds: reading.tds,
          turbidity: reading.turbidity,
          deviceId: deviceData.deviceId,
          deviceName: deviceData.deviceName,
        });
      });
    });

    // Sort by timestamp
    return dataPoints.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculate aggregated metrics for time periods (hourly, daily, weekly)
   * 
   * @param readings - Sensor readings array
   * @param periodType - 'hour' | 'day' | 'week'
   * @returns Aggregated metrics by period
   */
  calculateAggregatedMetrics(
    readings: SensorReading[],
    periodType: 'hour' | 'day' | 'week' = 'day'
  ): AggregatedMetrics[] {
    if (readings.length === 0) return [];

    // Group readings by period
    const periodMap = new Map<string, SensorReading[]>();

    readings.forEach(reading => {
      const date = new Date(reading.timestamp);
      let periodKey: string;

      switch (periodType) {
        case 'hour':
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, []);
      }
      periodMap.get(periodKey)!.push(reading);
    });

    // Calculate metrics for each period
    const metrics: AggregatedMetrics[] = [];

    periodMap.forEach((periodReadings, period) => {
      const phValues = periodReadings.map(r => r.ph).filter(v => v > 0);
      const tdsValues = periodReadings.map(r => r.tds).filter(v => v > 0);
      const turbidityValues = periodReadings.map(r => r.turbidity).filter(v => v >= 0);

      const deviceIds = new Set(periodReadings.map(r => r.deviceId));

      metrics.push({
        period,
        avgPh: phValues.length > 0 ? phValues.reduce((sum, v) => sum + v, 0) / phValues.length : 0,
        avgTds: tdsValues.length > 0 ? tdsValues.reduce((sum, v) => sum + v, 0) / tdsValues.length : 0,
        avgTurbidity: turbidityValues.length > 0 ? turbidityValues.reduce((sum, v) => sum + v, 0) / turbidityValues.length : 0,
        minPh: phValues.length > 0 ? Math.min(...phValues) : 0,
        maxPh: phValues.length > 0 ? Math.max(...phValues) : 0,
        minTds: tdsValues.length > 0 ? Math.min(...tdsValues) : 0,
        maxTds: tdsValues.length > 0 ? Math.max(...tdsValues) : 0,
        minTurbidity: turbidityValues.length > 0 ? Math.min(...turbidityValues) : 0,
        maxTurbidity: turbidityValues.length > 0 ? Math.max(...turbidityValues) : 0,
        readingCount: periodReadings.length,
        devicesCount: deviceIds.size,
      });
    });

    return metrics.sort((a, b) => a.period.localeCompare(b.period));
  }

  // ==========================================================================
  // ALERT ANALYTICS
  // ==========================================================================

  /**
   * Fetch historical alerts within a date range
   * 
   * @param dateRange - Date range filter
   * @returns Historical alerts
   */
  async getHistoricalAlerts(dateRange: DateRangeFilter): Promise<WaterQualityAlert[]> {
    try {
      const alertsRef = collection(this.firestore, 'waterQualityAlerts');
      
      const startTimestamp = Timestamp.fromDate(dateRange.startDate);
      const endTimestamp = Timestamp.fromDate(dateRange.endDate);

      const q = firestoreQuery(
        alertsRef,
        where('createdAt', '>=', startTimestamp),
        where('createdAt', '<=', endTimestamp),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), alertId: doc.id } as WaterQualityAlert));
    } catch (error) {
      console.error('Error fetching historical alerts:', error);
      throw new Error('Failed to fetch historical alerts');
    }
  }

  /**
   * Calculate alert statistics for time periods
   * 
   * @param alerts - Alert array
   * @param periodType - 'hour' | 'day' | 'week'
   * @returns Alert statistics by period
   */
  calculateAlertStatistics(
    alerts: WaterQualityAlert[],
    periodType: 'hour' | 'day' | 'week' = 'day'
  ): AlertStatistics[] {
    if (alerts.length === 0) return [];

    const periodMap = new Map<string, WaterQualityAlert[]>();

    alerts.forEach(alert => {
      const date = alert.createdAt.toDate();
      let periodKey: string;

      switch (periodType) {
        case 'hour':
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'day':
          periodKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getTime() - new Date(weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!periodMap.has(periodKey)) {
        periodMap.set(periodKey, []);
      }
      periodMap.get(periodKey)!.push(alert);
    });

    const statistics: AlertStatistics[] = [];

    periodMap.forEach((periodAlerts, period) => {
      const criticalAlerts = periodAlerts.filter(a => a.severity === 'Critical');
      const warningAlerts = periodAlerts.filter(a => a.severity === 'Warning');
      const advisoryAlerts = periodAlerts.filter(a => a.severity === 'Advisory');
      const resolvedAlerts = periodAlerts.filter(a => a.status === 'Resolved');

      // Calculate average resolution time
      const resolutionTimes = resolvedAlerts
        .filter(a => a.resolvedAt && a.createdAt)
        .map(a => {
          const created = a.createdAt.toMillis();
          const resolved = a.resolvedAt!.toMillis();
          return (resolved - created) / (1000 * 60); // minutes
        });

      const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
        : 0;

      statistics.push({
        period,
        totalAlerts: periodAlerts.length,
        criticalAlerts: criticalAlerts.length,
        warningAlerts: warningAlerts.length,
        advisoryAlerts: advisoryAlerts.length,
        resolvedAlerts: resolvedAlerts.length,
        avgResolutionTime,
      });
    });

    return statistics.sort((a, b) => a.period.localeCompare(b.period));
  }

  // ==========================================================================
  // DEVICE PERFORMANCE ANALYTICS
  // ==========================================================================

  /**
   * Calculate device performance metrics
   * 
   * @param devices - Device array with sensor data
   * @param historicalData - Historical sensor readings
   * @param alerts - Alerts associated with devices
   * @param dateRange - Time period for analysis
   * @returns Device performance metrics
   */
  calculateDevicePerformance(
    devices: Device[],
    historicalData: Map<string, SensorReading[]>,
    alerts: WaterQualityAlert[],
    dateRange: DateRangeFilter
  ): DevicePerformanceMetrics[] {
    const alertsByDevice = new Map<string, WaterQualityAlert[]>();
    alerts.forEach(alert => {
      if (!alertsByDevice.has(alert.deviceId)) {
        alertsByDevice.set(alert.deviceId, []);
      }
      alertsByDevice.get(alert.deviceId)!.push(alert);
    });

    return devices.map(device => {
      const readings = historicalData.get(device.deviceId) || [];
      const deviceAlerts = alertsByDevice.get(device.deviceId) || [];

      // Calculate averages
      const phValues = readings.map(r => r.ph).filter(v => v > 0);
      const tdsValues = readings.map(r => r.tds).filter(v => v > 0);
      const turbidityValues = readings.map(r => r.turbidity).filter(v => v >= 0);

      const avgPh = phValues.length > 0 ? phValues.reduce((sum, v) => sum + v, 0) / phValues.length : 0;
      const avgTds = tdsValues.length > 0 ? tdsValues.reduce((sum, v) => sum + v, 0) / tdsValues.length : 0;
      const avgTurbidity = turbidityValues.length > 0 ? turbidityValues.reduce((sum, v) => sum + v, 0) / turbidityValues.length : 0;

      // Calculate uptime
      const totalPeriodMs = dateRange.endDate.getTime() - dateRange.startDate.getTime();
      const expectedReadings = totalPeriodMs / (5 * 60 * 1000); // Assuming 5-min intervals
      const uptimePercentage = (readings.length / expectedReadings) * 100;

      // Calculate water quality score (0-100)
      const qualityScore = this.calculateWaterQualityScore(avgPh, avgTds, avgTurbidity);

      return {
        deviceId: device.deviceId,
        deviceName: device.name || device.deviceId,
        location: device.metadata?.location
          ? `${device.metadata.location.building}, ${device.metadata.location.floor}`
          : undefined,
        uptimePercentage: Math.min(uptimePercentage, 100),
        totalReadings: readings.length,
        avgPh,
        avgTds,
        avgTurbidity,
        alertCount: deviceAlerts.length,
        lastSeen: device.lastSeen?.toMillis?.() || Date.now(),
        qualityScore,
      };
    });
  }

  /**
   * Calculate water quality score based on WHO guidelines
   * 
   * @param ph - pH value
   * @param tds - TDS value (ppm)
   * @param turbidity - Turbidity value (NTU)
   * @returns Quality score (0-100, higher is better)
   */
  calculateWaterQualityScore(ph: number, tds: number, turbidity: number): number {
    let score = 100;

    // pH compliance (30% weight)
    if (ph < AnalyticsService.THRESHOLDS.ph.min || ph > AnalyticsService.THRESHOLDS.ph.max) {
      const phDeviation = Math.max(
        Math.abs(ph - AnalyticsService.THRESHOLDS.ph.min),
        Math.abs(ph - AnalyticsService.THRESHOLDS.ph.max)
      );
      score -= Math.min(30, phDeviation * 10);
    }

    // TDS compliance (30% weight)
    if (tds > AnalyticsService.THRESHOLDS.tds.max) {
      const tdsExcess = ((tds - AnalyticsService.THRESHOLDS.tds.max) / AnalyticsService.THRESHOLDS.tds.max) * 100;
      score -= Math.min(30, tdsExcess * 0.3);
    }

    // Turbidity compliance (40% weight)
    if (turbidity > AnalyticsService.THRESHOLDS.turbidity.max) {
      const turbidityExcess = ((turbidity - AnalyticsService.THRESHOLDS.turbidity.max) / AnalyticsService.THRESHOLDS.turbidity.max) * 100;
      score -= Math.min(40, turbidityExcess * 0.4);
    }

    return Math.max(0, Math.round(score));
  }

  // ==========================================================================
  // COMPLIANCE ANALYTICS
  // ==========================================================================

  /**
   * Calculate compliance status for water quality parameters
   * 
   * @param readings - Sensor readings array
   * @returns Compliance status for each parameter
   */
  calculateComplianceStatus(readings: SensorReading[]): AnalyticsComplianceStatus[] {
    if (readings.length === 0) return [];

    const phReadings = readings.map(r => r.ph).filter(v => v > 0);
    const tdsReadings = readings.map(r => r.tds).filter(v => v > 0);
    const turbidityReadings = readings.map(r => r.turbidity).filter(v => v >= 0);

    // pH compliance
    const phCompliant = phReadings.filter(
      v => v >= AnalyticsService.THRESHOLDS.ph.min && v <= AnalyticsService.THRESHOLDS.ph.max
    );

    // TDS compliance
    const tdsCompliant = tdsReadings.filter(
      v => v <= AnalyticsService.THRESHOLDS.tds.max
    );

    // Turbidity compliance
    const turbidityCompliant = turbidityReadings.filter(
      v => v <= AnalyticsService.THRESHOLDS.turbidity.max
    );

    return [
      {
        parameter: 'ph',
        compliant: phCompliant.length === phReadings.length,
        compliancePercentage: (phCompliant.length / phReadings.length) * 100,
        violationCount: phReadings.length - phCompliant.length,
        threshold: AnalyticsService.THRESHOLDS.ph,
      },
      {
        parameter: 'tds',
        compliant: tdsCompliant.length === tdsReadings.length,
        compliancePercentage: (tdsCompliant.length / tdsReadings.length) * 100,
        violationCount: tdsReadings.length - tdsCompliant.length,
        threshold: { max: AnalyticsService.THRESHOLDS.tds.max },
      },
      {
        parameter: 'turbidity',
        compliant: turbidityCompliant.length === turbidityReadings.length,
        compliancePercentage: (turbidityCompliant.length / turbidityReadings.length) * 100,
        violationCount: turbidityReadings.length - turbidityCompliant.length,
        threshold: { max: AnalyticsService.THRESHOLDS.turbidity.max },
      },
    ];
  }

  // ==========================================================================
  // LOCATION-BASED ANALYTICS
  // ==========================================================================

  /**
   * Calculate location-based analytics (building/floor insights)
   * 
   * @param devices - Device array with metadata
   * @param historicalData - Historical sensor readings map
   * @param alerts - Active alerts
   * @returns Location analytics
   */
  calculateLocationAnalytics(
    devices: Device[],
    historicalData: Map<string, SensorReading[]>,
    alerts: WaterQualityAlert[]
  ): LocationAnalytics[] {
    const locationMap = new Map<string, {
      building: string;
      floor: string;
      devices: Device[];
      readings: SensorReading[];
      alerts: WaterQualityAlert[];
    }>();

    // Group devices by location
    devices.forEach(device => {
      const location = device.metadata?.location;
      if (!location || !location.building || !location.floor) return;

      const key = `${location.building}-${location.floor}`;
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          building: location.building,
          floor: location.floor,
          devices: [],
          readings: [],
          alerts: [],
        });
      }

      const locationData = locationMap.get(key)!;
      locationData.devices.push(device);
      
      const deviceReadings = historicalData.get(device.deviceId) || [];
      locationData.readings.push(...deviceReadings);
      
      const deviceAlerts = alerts.filter(a => a.deviceId === device.deviceId && a.status === 'Active');
      locationData.alerts.push(...deviceAlerts);
    });

    // Calculate metrics for each location
    const analytics: LocationAnalytics[] = [];

    locationMap.forEach((locationData) => {
      const phValues = locationData.readings.map(r => r.ph).filter(v => v > 0);
      const tdsValues = locationData.readings.map(r => r.tds).filter(v => v > 0);
      const turbidityValues = locationData.readings.map(r => r.turbidity).filter(v => v >= 0);

      const avgPh = phValues.length > 0 ? phValues.reduce((sum, v) => sum + v, 0) / phValues.length : 0;
      const avgTds = tdsValues.length > 0 ? tdsValues.reduce((sum, v) => sum + v, 0) / tdsValues.length : 0;
      const avgTurbidity = turbidityValues.length > 0 ? turbidityValues.reduce((sum, v) => sum + v, 0) / turbidityValues.length : 0;

      const avgWaterQualityScore = this.calculateWaterQualityScore(avgPh, avgTds, avgTurbidity);

      analytics.push({
        building: locationData.building,
        floor: locationData.floor,
        deviceCount: locationData.devices.length,
        avgWaterQualityScore,
        activeAlertCount: locationData.alerts.length,
        readings: {
          avgPh,
          avgTds,
          avgTurbidity,
        },
      });
    });

    return analytics.sort((a, b) => 
      a.building.localeCompare(b.building) || a.floor.localeCompare(b.floor)
    );
  }
}

// Singleton export
export const analyticsService = new AnalyticsService();

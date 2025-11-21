/**
 * useAnalyticsProcessing - Local Hook (UI Logic Only)
 * 
 * Processes real-time device data into chart-ready formats.
 * NO service layer calls - pure data transformation.
 * 
 * @module pages/admin/AdminAnalytics/hooks
 */
import { useMemo } from 'react';
import type { DeviceWithSensorData } from '../../../../hooks_old';

interface TimeSeriesDataPoint {
  time: string;
  pH: number;
  TDS: number;
  Turbidity: number;
  deviceId: string;
}

interface ParameterDistributionPoint {
  name: string;
  value: number;
  max: number;
}

interface ParameterComparisonPoint {
  parameter: string;
  Average: number;
  Maximum: number;
  Minimum: number;
}

/**
 * Process real-time device data into chart formats
 * 
 * @param devices - Array of devices with real-time sensor data
 * @returns Processed data for charts and visualizations
 * 
 * @example
 * ```tsx
 * const { timeSeriesData, parameterDistribution, parameterComparisonData } = 
 *   useAnalyticsProcessing(devices);
 * ```
 */
export const useAnalyticsProcessing = (
  devices: DeviceWithSensorData[]
) => {
  // Transform current readings into time series format for visualization
  const timeSeriesData = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!devices || devices.length === 0) return [];
    
    // Get latest readings from all devices
    return devices
      .filter(device => device.latestReading !== null)
      .map(device => ({
        time: device.deviceName || device.deviceId,
        pH: device.latestReading?.ph || 0,
        TDS: device.latestReading?.tds || 0,
        Turbidity: device.latestReading?.turbidity || 0,
        deviceId: device.deviceId,
      }));
  }, [devices]);

  // Calculate parameter distributions for radar charts (using current readings)
  const parameterDistribution = useMemo<ParameterDistributionPoint[]>(() => {
    if (!devices || devices.length === 0) return [];
    
    const phValues: number[] = [];
    const tdsValues: number[] = [];
    const turbidityValues: number[] = [];
    
    devices.forEach(device => {
      if (device.latestReading) {
        if (device.latestReading.ph) phValues.push(device.latestReading.ph);
        if (device.latestReading.tds) tdsValues.push(device.latestReading.tds);
        if (device.latestReading.turbidity !== undefined) turbidityValues.push(device.latestReading.turbidity);
      }
    });
    
    const avgPh = phValues.length > 0 
      ? phValues.reduce((sum, val) => sum + val, 0) / phValues.length 
      : 0;
    const avgTds = tdsValues.length > 0 
      ? tdsValues.reduce((sum, val) => sum + val, 0) / tdsValues.length 
      : 0;
    const avgTurbidity = turbidityValues.length > 0 
      ? turbidityValues.reduce((sum, val) => sum + val, 0) / turbidityValues.length 
      : 0;
    
    return [
      { name: 'pH', value: parseFloat(avgPh.toFixed(2)), max: 14 },
      { name: 'TDS', value: parseFloat(avgTds.toFixed(2)), max: 1000 },
      { name: 'Turbidity', value: parseFloat(avgTurbidity.toFixed(2)), max: 100 },
    ];
  }, [devices]);

  // Calculate parameter comparisons (avg, max, min) for bar charts
  const parameterComparisonData = useMemo<ParameterComparisonPoint[]>(() => {
    if (!devices || devices.length === 0) return [];
    
    const phValues: number[] = [];
    const tdsValues: number[] = [];
    const turbidityValues: number[] = [];
    
    devices.forEach(device => {
      if (device.latestReading) {
        if (device.latestReading.ph) phValues.push(device.latestReading.ph);
        if (device.latestReading.tds) tdsValues.push(device.latestReading.tds);
        if (device.latestReading.turbidity !== undefined) turbidityValues.push(device.latestReading.turbidity);
      }
    });
    
    const calcStats = (values: number[]) => {
      if (values.length === 0) return { avg: 0, max: 0, min: 0 };
      return {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values),
      };
    };
    
    const phStats = calcStats(phValues);
    const tdsStats = calcStats(tdsValues);
    const turbidityStats = calcStats(turbidityValues);
    
    return [
      {
        parameter: 'pH',
        Average: parseFloat(phStats.avg.toFixed(2)),
        Maximum: parseFloat(phStats.max.toFixed(2)),
        Minimum: parseFloat(phStats.min.toFixed(2)),
      },
      {
        parameter: 'TDS (÷10)',
        Average: parseFloat((tdsStats.avg / 10).toFixed(2)),
        Maximum: parseFloat((tdsStats.max / 10).toFixed(2)),
        Minimum: parseFloat((tdsStats.min / 10).toFixed(2)),
      },
      {
        parameter: 'Turbidity',
        Average: parseFloat(turbidityStats.avg.toFixed(2)),
        Maximum: parseFloat(turbidityStats.max.toFixed(2)),
        Minimum: parseFloat(turbidityStats.min.toFixed(2)),
      },
    ];
  }, [devices]);

  return {
    timeSeriesData,
    parameterDistribution,
    parameterComparisonData,
  };
};

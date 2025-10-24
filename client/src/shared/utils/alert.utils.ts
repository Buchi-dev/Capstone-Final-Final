/**
 * Alert Utilities
 * Helper functions for working with alerts
 */

import type { WaterParameter, AlertSeverity, AlertStatus } from '../types';
import { WATER_QUALITY_THRESHOLDS } from '../constants';

/**
 * Get the unit for a water parameter
 */
export const getParameterUnit = (parameter: WaterParameter): string => {
  switch (parameter) {
    case 'tds':
      return WATER_QUALITY_THRESHOLDS.TDS.UNIT;
    case 'ph':
      return WATER_QUALITY_THRESHOLDS.PH.UNIT;
    case 'turbidity':
      return WATER_QUALITY_THRESHOLDS.TURBIDITY.UNIT;
    default:
      return '';
  }
};

/**
 * Get the display name for a water parameter
 */
export const getParameterName = (parameter: WaterParameter): string => {
  switch (parameter) {
    case 'tds':
      return 'TDS (Total Dissolved Solids)';
    case 'ph':
      return 'pH Level';
    case 'turbidity':
      return 'Turbidity';
    default:
      return parameter;
  }
};

/**
 * Get the theme color for alert severity
 */
export const getSeverityColor = (severity: AlertSeverity): string => {
  switch (severity) {
    case 'Critical':
      return 'error';
    case 'Warning':
      return 'warning';
    case 'Advisory':
      return 'processing';
    default:
      return 'default';
  }
};

/**
 * Get the theme color for alert status
 */
export const getStatusColor = (status: AlertStatus): string => {
  switch (status) {
    case 'Active':
      return 'error';
    case 'Acknowledged':
      return 'warning';
    case 'Resolved':
      return 'success';
    default:
      return 'default';
  }
};

/**
 * Get default threshold values for a parameter
 */
export const getDefaultThresholds = (parameter: WaterParameter) => {
  switch (parameter) {
    case 'tds':
      return {
        warningMin: WATER_QUALITY_THRESHOLDS.TDS.WARNING_MIN,
        warningMax: WATER_QUALITY_THRESHOLDS.TDS.WARNING_MAX,
        criticalMin: WATER_QUALITY_THRESHOLDS.TDS.CRITICAL_MIN,
        criticalMax: WATER_QUALITY_THRESHOLDS.TDS.CRITICAL_MAX,
        unit: WATER_QUALITY_THRESHOLDS.TDS.UNIT,
      };
    case 'ph':
      return {
        warningMin: WATER_QUALITY_THRESHOLDS.PH.WARNING_MIN,
        warningMax: WATER_QUALITY_THRESHOLDS.PH.WARNING_MAX,
        criticalMin: WATER_QUALITY_THRESHOLDS.PH.CRITICAL_MIN,
        criticalMax: WATER_QUALITY_THRESHOLDS.PH.CRITICAL_MAX,
        unit: WATER_QUALITY_THRESHOLDS.PH.UNIT,
      };
    case 'turbidity':
      return {
        warningMin: WATER_QUALITY_THRESHOLDS.TURBIDITY.WARNING_MIN,
        warningMax: WATER_QUALITY_THRESHOLDS.TURBIDITY.WARNING_MAX,
        criticalMin: WATER_QUALITY_THRESHOLDS.TURBIDITY.CRITICAL_MIN,
        criticalMax: WATER_QUALITY_THRESHOLDS.TURBIDITY.CRITICAL_MAX,
        unit: WATER_QUALITY_THRESHOLDS.TURBIDITY.UNIT,
      };
    default:
      throw new Error(`Unknown parameter: ${parameter}`);
  }
};

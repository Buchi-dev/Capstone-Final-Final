import { useMemo } from 'react';
import type { WaterQualityAlert } from '../../../../schemas';

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  critical: number;
  warning: number;
  advisory: number;
}

/**
 * Custom hook to calculate alert statistics
 * @param alerts - Array of water quality alerts
 * @returns Statistics object with counts for different alert states
 */
export const useAlertStats = (alerts: WaterQualityAlert[]): AlertStats => {
  return useMemo(() => ({
    total: alerts.length,
    active: alerts.filter((a) => a.status === 'Active').length,
    acknowledged: alerts.filter((a) => a.status === 'Acknowledged').length,
    resolved: alerts.filter((a) => a.status === 'Resolved').length,
    critical: alerts.filter((a) => a.severity === 'Critical').length,
    warning: alerts.filter((a) => a.severity === 'Warning').length,
    advisory: alerts.filter((a) => a.severity === 'Advisory').length,
  }), [alerts]);
};

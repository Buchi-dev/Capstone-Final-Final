import { useState, useEffect } from 'react';
import { alertsService } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';

/**
 * Custom hook to fetch and manage alerts with real-time updates
 * Uses alertsService.subscribeToAlerts for instant updates
 * 
 * @param maxAlerts - Maximum number of alerts to fetch (default: 20)
 * @returns Object containing alerts array, loading state, error state, and action functions
 */
export const useAlerts = (maxAlerts: number = 20) => {
  const [alerts, setAlerts] = useState<WaterQualityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Set up real-time listener via service layer
    const unsubscribe = alertsService.subscribeToAlerts(
      (alertsData) => {
        setAlerts(alertsData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to alerts:', err);
        setError(err);
        setLoading(false);
      },
      maxAlerts
    );

    return () => unsubscribe();
  }, [maxAlerts]);

  // Action functions for managing alerts
  const acknowledgeAlert = async (alertId: string): Promise<void> => {
    await alertsService.acknowledgeAlert(alertId);
  };

  const resolveAlert = async (alertId: string, notes?: string): Promise<void> => {
    await alertsService.resolveAlert(alertId, notes);
  };

  return { 
    alerts, 
    loading, 
    error,
    acknowledgeAlert,
    resolveAlert,
  };
};

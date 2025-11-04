import { useState, useEffect } from 'react';
import { alertsService } from '../services/alerts.Service';
import type { WaterQualityAlert } from '../schemas';

/**
 * Custom hook to fetch and manage alerts with real-time updates
 * Uses alertsService.subscribeToAlerts for instant updates
 */
export const useAlerts = () => {
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
      20 // Get 20 most recent alerts
    );


    return () => unsubscribe();
  }, []);

  return { alerts, loading, error };
};

import { useState, useEffect, useCallback } from 'react';
import { MQTTBridgeService, type MQTTBridgeHealth } from '../../../../services/mqttBridge.Service';

// ============================================================================
// HOOK
// ============================================================================

export const useMQTTBridgeHealth = (refreshInterval: number = 30000) => {
  const [health, setHealth] = useState<MQTTBridgeHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await MQTTBridgeService.getHealth();
      setHealth(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch MQTT Bridge health';
      setError(errorMessage);
      console.error('Error fetching MQTT Bridge health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchHealth();

    // Set up polling
    const interval = setInterval(fetchHealth, refreshInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [fetchHealth, refreshInterval]);

  return {
    health,
    loading,
    error,
    lastUpdated,
    refetch: fetchHealth,
  };
};

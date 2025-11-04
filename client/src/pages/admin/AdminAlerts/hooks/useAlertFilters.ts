import { useState, useEffect } from 'react';
import type { WaterQualityAlert, AlertFiltersExtended } from '../../../../schemas';

/**
 * Custom hook to manage alert filtering
 * @param alerts - Array of all alerts
 * @returns Filtered alerts, filters state, and filter management functions
 */
export const useAlertFilters = (alerts: WaterQualityAlert[]) => {
  const [filters, setFilters] = useState<AlertFiltersExtended>({});
  const [filteredAlerts, setFilteredAlerts] = useState<WaterQualityAlert[]>(alerts);

  // Auto-apply filters when alerts or filters change
  useEffect(() => {
    let filtered = [...alerts];

    if (filters.severity?.length) {
      filtered = filtered.filter((a) => filters.severity!.includes(a.severity));
    }

    if (filters.status?.length) {
      filtered = filtered.filter((a) => filters.status!.includes(a.status));
    }

    if (filters.parameter?.length) {
      filtered = filtered.filter((a) => filters.parameter!.includes(a.parameter));
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.message.toLowerCase().includes(term) ||
          a.deviceName?.toLowerCase().includes(term) ||
          a.deviceId.toLowerCase().includes(term)
      );
    }

    setFilteredAlerts(filtered);
  }, [alerts, filters]);

  const clearFilters = () => {
    setFilters({});
  };

  return {
    filteredAlerts,
    filters,
    setFilters,
    clearFilters,
  };
};

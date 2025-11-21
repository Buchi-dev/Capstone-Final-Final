import { useState, useMemo } from 'react';
import type { WaterQualityAlert, AlertFiltersExtended } from '../../../../schemas';

/**
 * ✅ UI-SPECIFIC LOCAL HOOK - Alert Filtering Logic
 * 
 * This hook is ACCEPTABLE as a local hook because it only handles
 * UI-specific filtering logic and does NOT wrap service layer calls.
 * 
 * Purpose: Manage filter state and apply client-side filtering to alerts
 * 
 * @param alerts - Array of all alerts (from global hook: useAlerts)
 * @returns Filtered alerts, filters state, and filter management functions
 */
export const useAlertFilters = (alerts: WaterQualityAlert[]) => {
  const [filters, setFilters] = useState<AlertFiltersExtended>({});

  // Use useMemo to compute filtered alerts instead of useEffect to prevent infinite loops
  const filteredAlerts = useMemo(() => {
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
          (a.message?.toLowerCase().includes(term) ?? false) ||
          (a.deviceName?.toLowerCase().includes(term) ?? false) ||
          a.deviceId.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [alerts, filters.severity, filters.status, filters.parameter, filters.searchTerm]);

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

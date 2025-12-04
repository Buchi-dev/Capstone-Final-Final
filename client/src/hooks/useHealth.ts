import useSWR from 'swr';
import { useVisibilityPolling } from './useVisibilityPolling';
import healthService, { type HealthStatus } from '../services/health.Service';

interface UseHealthOptions {
  enabled?: boolean;
  refreshInterval?: number;
}

export function useHealth(options: UseHealthOptions = {}) {
  const { enabled = true, refreshInterval = 30000 } = options;
  const adjustedInterval = useVisibilityPolling(refreshInterval);
  const shouldPoll = enabled && adjustedInterval > 0;
  const cacheKey = enabled ? ['health', 'system'] : null;
  const { data, isLoading } = useSWR(cacheKey, async () => await healthService.getSystemHealth(), {
    refreshInterval: shouldPoll ? adjustedInterval : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });
  return { health: data || null, isLoading };
}

export function useHealthStatusBadge(status: HealthStatus) {
  switch (status) {
    case 'ok': return { color: 'success', text: 'OK', icon: 'check' };
    case 'warning': return { color: 'warning', text: 'Warning', icon: 'warning' };
    case 'critical': return { color: 'error', text: 'Critical', icon: 'error' };
    case 'error': return { color: 'error', text: 'Error', icon: 'error' };
    default: return { color: 'default', text: 'Unknown', icon: 'question' };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

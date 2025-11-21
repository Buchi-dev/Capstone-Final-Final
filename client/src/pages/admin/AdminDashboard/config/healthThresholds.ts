/**
 * Health Thresholds and Configuration
 * Defines colors and server health calculation for Admin Dashboard
 * 
 * Last Updated: 2025-11-21
 */

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================

export const HEALTH_COLORS = {
  EXCELLENT: '#52c41a',  // Green - Everything is optimal
  GOOD: '#95de64',       // Light Green - Good health
  WARNING: '#faad14',    // Orange - Warning state
  CRITICAL: '#fa8c16',   // Dark Orange - Critical warning
  ERROR: '#ff4d4f',      // Red - Error/Failure state
} as const;

// ============================================================================
// EXPRESS SERVER HEALTH CALCULATION
// ============================================================================

/**
 * Calculate Express server health score based on RSS memory and CPU usage
 * Uses RSS (Resident Set Size) instead of heap as it reflects actual RAM usage
 * 
 * @param rss - Resident Set Size in bytes (actual RAM used)
 * @param cpuPercent - Current CPU usage percentage
 * @param connected - Whether database is connected
 * @param status - Server health status from health endpoint
 * @returns Health score (0-100) where higher is better
 */
export const calculateServerHealthScore = (
  rss: number,
  cpuPercent: number,
  connected: boolean,
  status: 'healthy' | 'unhealthy' | 'degraded'
): number => {
  // If database not connected, health is 0
  if (!connected) return 0;

  const RAM_LIMIT_BYTES = 256 * 1024 * 1024; // 256MB Cloud Run limit
  
  // Calculate RSS percentage (actual memory usage)
  const rssPercent = Math.min(Math.round((rss / RAM_LIMIT_BYTES) * 100), 100);
  
  // Normalize CPU to 0-100 scale (already a percentage)
  const normalizedCpu = Math.min(Math.round(cpuPercent), 100);
  
  // Calculate composite resource usage (60% weight on memory, 40% on CPU)
  const avgResourceUsage = (rssPercent * 0.6) + (normalizedCpu * 0.4);
  
  // Invert to get health score (lower usage = better health)
  let resourceHealth = Math.max(0, 100 - avgResourceUsage);
  
  // If status is unhealthy, reduce score by 50%
  // If status is degraded, reduce score by 30%
  if (status === 'unhealthy') {
    resourceHealth = Math.round(resourceHealth * 0.5);
  } else if (status === 'degraded') {
    resourceHealth = Math.round(resourceHealth * 0.7);
  }
  
  return Math.round(resourceHealth);
};


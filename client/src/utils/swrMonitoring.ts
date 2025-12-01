/**
 * SWR Monitoring and Adaptive Configuration
 * 
 * Monitors SWR request patterns and automatically adjusts
 * deduplication intervals based on data freshness needs
 */

interface RequestMetrics {
  url: string;
  timestamp: number;
  duration: number;
  cacheHit: boolean;
  dataChanged: boolean;
}

interface EndpointMetrics {
  requestCount: number;
  cacheHitRate: number;
  averageDataChangeRate: number;
  lastDataChange: number;
  recommendedDedupInterval: number;
}

class SWRMonitor {
  private metrics: RequestMetrics[] = [];
  private endpointMetrics = new Map<string, EndpointMetrics>();
  private readonly maxMetricsSize = 1000;
  private readonly analysisInterval = 60000; // Analyze every minute
  private analysisTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  /**
   * Record a request for monitoring
   */
  recordRequest(url: string, duration: number, cacheHit: boolean, dataChanged: boolean) {
    this.metrics.push({
      url,
      timestamp: Date.now(),
      duration,
      cacheHit,
      dataChanged,
    });

    // Trim old metrics
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(url: string): EndpointMetrics | null {
    return this.endpointMetrics.get(url) || null;
  }

  /**
   * Get recommended dedup interval for an endpoint
   * Based on how frequently the data actually changes
   */
  getRecommendedDedupInterval(url: string): number {
    const metrics = this.endpointMetrics.get(url);
    if (!metrics) return 60000; // Default 60s

    return metrics.recommendedDedupInterval;
  }

  /**
   * Start monitoring and analysis
   */
  private startMonitoring() {
    this.analysisTimer = setInterval(() => {
      this.analyzeMetrics();
    }, this.analysisInterval);
  }

  /**
   * Analyze metrics and update recommendations
   */
  private analyzeMetrics() {
    const now = Date.now();
    const recentWindow = 5 * 60 * 1000; // Last 5 minutes
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < recentWindow);

    // Group by endpoint
    const byEndpoint = new Map<string, RequestMetrics[]>();
    for (const metric of recentMetrics) {
      const existing = byEndpoint.get(metric.url) || [];
      existing.push(metric);
      byEndpoint.set(metric.url, existing);
    }

    // Analyze each endpoint
    for (const [url, metrics] of byEndpoint.entries()) {
      const requestCount = metrics.length;
      const cacheHits = metrics.filter(m => m.cacheHit).length;
      const dataChanges = metrics.filter(m => m.dataChanged).length;
      const cacheHitRate = requestCount > 0 ? cacheHits / requestCount : 0;
      const dataChangeRate = requestCount > 0 ? dataChanges / requestCount : 0;

      // Find last data change
      const lastChange = metrics
        .filter(m => m.dataChanged)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      const lastDataChange = lastChange ? lastChange.timestamp : 0;

      // Calculate recommended dedup interval
      let recommendedInterval = 60000; // Default 60s

      if (dataChangeRate > 0.5) {
        // Data changes frequently (>50% of requests) - shorter interval
        recommendedInterval = 30000; // 30s
      } else if (dataChangeRate > 0.2) {
        // Data changes moderately (20-50%) - medium interval
        recommendedInterval = 60000; // 60s
      } else if (dataChangeRate > 0.05) {
        // Data changes rarely (5-20%) - longer interval
        recommendedInterval = 120000; // 2 minutes
      } else {
        // Data almost never changes (<5%) - longest interval
        recommendedInterval = 300000; // 5 minutes
      }

      // Store endpoint metrics
      this.endpointMetrics.set(url, {
        requestCount,
        cacheHitRate,
        averageDataChangeRate: dataChangeRate,
        lastDataChange,
        recommendedDedupInterval: recommendedInterval,
      });
    }

    // Log recommendations in development
    if (import.meta.env.DEV) {
      console.group('[SWR Monitor] Analysis');
      for (const [url, metrics] of this.endpointMetrics.entries()) {
        console.log(`${url}:`, {
          requests: metrics.requestCount,
          cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
          dataChangeRate: `${(metrics.averageDataChangeRate * 100).toFixed(1)}%`,
          recommendedDedup: `${metrics.recommendedDedupInterval / 1000}s`,
        });
      }
      console.groupEnd();
    }
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
  }

  /**
   * Get all endpoint metrics for debugging
   */
  getAllMetrics(): Map<string, EndpointMetrics> {
    return new Map(this.endpointMetrics);
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics = [];
    this.endpointMetrics.clear();
  }
}

// Singleton instance
export const swrMonitor = new SWRMonitor();

/**
 * Hook to integrate monitoring with SWR
 */
export function useMonitoredSWR<T>(
  key: string | null,
  fetcher: (() => Promise<T>) | null
) {
  const startTime = Date.now();
  let previousData: T | undefined;

  const wrappedFetcher = async () => {
    if (!fetcher) return undefined;

    const data = await fetcher();
    const duration = Date.now() - startTime;
    const dataChanged = previousData !== undefined && data !== previousData;
    const cacheHit = duration < 10; // Heuristic: very fast = cache hit

    if (key) {
      swrMonitor.recordRequest(key, duration, cacheHit, dataChanged);
    }

    previousData = data;
    return data;
  };

  return { wrappedFetcher };
}

/**
 * Get current monitoring statistics
 */
export function getSWRStats() {
  return {
    endpoints: Array.from(swrMonitor.getAllMetrics().entries()).map(([url, metrics]) => ({
      url,
      ...metrics,
    })),
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    swrMonitor.stop();
  });
}

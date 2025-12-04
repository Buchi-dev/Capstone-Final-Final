/**
 * Health Monitoring Service
 * 
 * Manages system health metrics through Express REST API.
 * 
 * Features:
 * - Fetch complete system health metrics
 * - Fetch individual component metrics (CPU, Memory, Storage, Database)
 * - Centralized error handling with user-friendly messages
 * 
 * @module services/health
 */

import { apiClient, getErrorMessage } from '../config/api.config';
import { HEALTH_ENDPOINTS } from '../config/endpoints';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type HealthStatus = 'ok' | 'warning' | 'critical' | 'error' | 'unknown';

export interface CpuMetrics {
  usagePercent: number;
  cores: number;
  status: HealthStatus;
}

export interface MemoryMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

export interface StorageMetrics {
  usedGB: number;
  totalGB: number;
  usagePercent: number;
  status: HealthStatus;
}

export interface DatabaseMetrics {
  connectionStatus: 'connected' | 'disconnected';
  storageSize: number;
  indexSize: number;
  totalSize: number;
  responseTime: number;
  status: HealthStatus;
}

export interface SystemHealthMetrics {
  timestamp: string;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  storage: StorageMetrics;
  database: DatabaseMetrics;
  overallStatus: HealthStatus;
}

export interface HealthMetricResponse<T> {
  timestamp: string;
  metric: T;
  status: HealthStatus;
}

export interface HealthResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class HealthService {

  /**
   * Get all system health metrics
   * 
   * @throws {Error} If fetching fails
   * @example
   * const health = await healthService.getSystemHealth();
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    try {
      const response = await apiClient.get<HealthResponse<SystemHealthMetrics>>(
        HEALTH_ENDPOINTS.SYSTEM
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch system health:', message);
      throw new Error(message);
    }
  }

  /**
   * Get CPU metrics only
   * 
   * @throws {Error} If fetching fails
   * @example
   * const cpuMetrics = await healthService.getCpuMetrics();
   */
  async getCpuMetrics(): Promise<HealthMetricResponse<CpuMetrics>> {
    try {
      const response = await apiClient.get<HealthResponse<HealthMetricResponse<CpuMetrics>>>(
        HEALTH_ENDPOINTS.CPU
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch CPU metrics:', message);
      throw new Error(message);
    }
  }

  /**
   * Get memory metrics only
   * 
   * @throws {Error} If fetching fails
   * @example
   * const memoryMetrics = await healthService.getMemoryMetrics();
   */
  async getMemoryMetrics(): Promise<HealthMetricResponse<MemoryMetrics>> {
    try {
      const response = await apiClient.get<HealthResponse<HealthMetricResponse<MemoryMetrics>>>(
        HEALTH_ENDPOINTS.MEMORY
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch memory metrics:', message);
      throw new Error(message);
    }
  }

  /**
   * Get storage metrics only
   * 
   * @throws {Error} If fetching fails
   * @example
   * const storageMetrics = await healthService.getStorageMetrics();
   */
  async getStorageMetrics(): Promise<HealthMetricResponse<StorageMetrics>> {
    try {
      const response = await apiClient.get<HealthResponse<HealthMetricResponse<StorageMetrics>>>(
        HEALTH_ENDPOINTS.STORAGE
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch storage metrics:', message);
      throw new Error(message);
    }
  }

  /**
   * Get database metrics only
   * 
   * @throws {Error} If fetching fails
   * @example
   * const dbMetrics = await healthService.getDatabaseMetrics();
   */
  async getDatabaseMetrics(): Promise<HealthMetricResponse<DatabaseMetrics>> {
    try {
      const response = await apiClient.get<HealthResponse<HealthMetricResponse<DatabaseMetrics>>>(
        HEALTH_ENDPOINTS.DATABASE
      );
      return response.data.data;
    } catch (error: any) {
      const message = getErrorMessage(error);
      console.error('Failed to fetch database metrics:', message);
      throw new Error(message);
    }
  }
}

// Export singleton instance
export const healthService = new HealthService();
export default healthService;

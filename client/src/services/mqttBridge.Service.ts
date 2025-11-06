import axios from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface MQTTBridgeHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    mqtt: {
      connected: boolean;
      clientId: string;
    };
    memory: {
      heapUsed: string;
      heapTotal: string;
      rss: string;
      percent: number;
    };
    buffers: {
      [key: string]: {
        messages: number;
        utilization: number;
      };
    };
  };
  metrics: {
    received: number;
    published: number;
    failed: number;
    commands: number;
    flushes: number;
    messagesInDLQ: number;
    circuitBreakerOpen: boolean;
  };
}

export interface MQTTBridgeStatus {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  metrics: {
    received: number;
    published: number;
    failed: number;
    commands: number;
    flushes: number;
    messagesInDLQ: number;
    circuitBreakerOpen: boolean;
  };
  buffers: {
    [key: string]: number;
  };
  mqtt: {
    connected: boolean;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MQTT_BRIDGE_BASE_URL = 'https://mqtt-bridge-8158575421.us-central1.run.app';

// ============================================================================
// SERVICE
// ============================================================================

export class MQTTBridgeService {
  /**
   * Fetch MQTT Bridge health status
   */
  static async getHealth(): Promise<MQTTBridgeHealth> {
    try {
      const response = await axios.get<MQTTBridgeHealth>(
        `${MQTT_BRIDGE_BASE_URL}/health`,
        {
          timeout: 10000, // 10 seconds timeout
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching MQTT Bridge health:', error);
      throw error;
    }
  }

  /**
   * Fetch MQTT Bridge status
   */
  static async getStatus(): Promise<MQTTBridgeStatus> {
    try {
      const response = await axios.get<MQTTBridgeStatus>(
        `${MQTT_BRIDGE_BASE_URL}/status`,
        {
          timeout: 10000, // 10 seconds timeout
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching MQTT Bridge status:', error);
      throw error;
    }
  }

  /**
   * Format uptime to human-readable string
   */
  static formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? parts.join(' ') : '< 1m';
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }
}

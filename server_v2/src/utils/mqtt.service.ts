/**
 * MQTT Service
 * 
 * Handles bidirectional communication with IoT devices via HiveMQ Cloud
 * - Subscribes to sensor data, device registration, and presence topics
 * - Publishes commands to devices
 * - Automatic reconnection with exponential backoff
 * 
 * @module utils/mqtt.service
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { mqttConfig } from '@core/configs';
import { deviceService } from '@feature/devices';
import { sensorReadingService } from '@feature/sensorReadings';
import { alertService } from '@feature/alerts';

/**
 * MQTT Topics
 */
const TOPICS = {
  SENSOR_DATA: 'water-quality/sensors/+/data',
  DEVICE_REGISTRATION: 'water-quality/devices/+/registration',
  DEVICE_PRESENCE: 'water-quality/devices/+/presence',
  DEVICE_COMMANDS: (deviceId: string) => `water-quality/devices/${deviceId}/commands`,
} as const;

/**
 * Reconnection configuration
 */
const RECONNECT_CONFIG = {
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 60000, // 60 seconds
  MULTIPLIER: 2,
};

/**
 * MQTT Service Class
 * Singleton for managing MQTT broker connection
 */
class MQTTService {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectDelay = RECONNECT_CONFIG.INITIAL_DELAY;

  /**
   * Initialize MQTT connection
   */
  public async connect(): Promise<void> {
    if (this.client && this.isConnected) {
      console.log('🔄 MQTT: Already connected');
      return;
    }

    console.log('🔌 MQTT: Connecting to HiveMQ Cloud...');

    const options: IClientOptions = {
      clientId: mqttConfig.clientId,
      username: mqttConfig.username,
      password: mqttConfig.password,
      protocol: 'mqtts',
      port: 8883,
      reconnectPeriod: 0, // Disable auto-reconnect (we handle manually)
      connectTimeout: 30000,
      clean: true,
      rejectUnauthorized: true,
    };

    this.client = mqtt.connect(mqttConfig.brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = RECONNECT_CONFIG.INITIAL_DELAY;
      console.log('✅ MQTT: Connected to HiveMQ Cloud');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      console.error('❌ MQTT Error:', error.message);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('🔌 MQTT: Connection closed');
      this.isConnected = false;
      this.handleReconnection();
    });

    this.client.on('offline', () => {
      console.log('⚠️ MQTT: Client offline');
      this.isConnected = false;
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  /**
   * Subscribe to all required topics
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const topics = [
      TOPICS.SENSOR_DATA,
      TOPICS.DEVICE_REGISTRATION,
      TOPICS.DEVICE_PRESENCE,
    ];

    topics.forEach((topic) => {
      this.client!.subscribe(topic, { qos: mqttConfig.qos }, (error) => {
        if (error) {
          console.error(`❌ MQTT: Failed to subscribe to ${topic}:`, error.message);
        } else {
          console.log(`✅ MQTT: Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const message = JSON.parse(payload.toString());
      const deviceId = this.extractDeviceId(topic);

      if (!deviceId) {
        console.error('❌ MQTT: Invalid topic format:', topic);
        return;
      }

      // Route message to appropriate handler
      if (topic.includes('/data')) {
        await this.handleSensorData(deviceId, message);
      } else if (topic.includes('/registration')) {
        await this.handleDeviceRegistration(deviceId, message);
      } else if (topic.includes('/presence')) {
        await this.handleDevicePresence(deviceId, message);
      }
    } catch (error) {
      console.error('❌ MQTT: Message handling error:', error);
    }
  }

  /**
   * Handle sensor data messages
   */
  private async handleSensorData(deviceId: string, data: any): Promise<void> {
    try {
      // Validate required fields
      if (typeof data.pH !== 'number' || typeof data.turbidity !== 'number' || typeof data.tds !== 'number') {
        console.error('❌ MQTT: Invalid sensor data format from', deviceId);
        return;
      }

      // Update device heartbeat
      await deviceService.updateHeartbeat(deviceId);

      // Store sensor reading
      const reading = await sensorReadingService.processSensorData(deviceId, {
        pH: data.pH,
        turbidity: data.turbidity,
        tds: data.tds,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      });

      // Check for threshold violations and create alerts
      await alertService.checkThresholdsAndCreateAlerts(reading);

      console.log(`📊 MQTT: Processed sensor data from ${deviceId}`);
    } catch (error) {
      console.error(`❌ MQTT: Error processing sensor data from ${deviceId}:`, error);
    }
  }

  /**
   * Handle device registration messages
   */
  private async handleDeviceRegistration(deviceId: string, data: any): Promise<void> {
    try {
      await deviceService.processDeviceRegistration(deviceId, data);
      console.log(`📝 MQTT: Processed registration for ${deviceId}`);
    } catch (error) {
      console.error(`❌ MQTT: Error processing registration for ${deviceId}:`, error);
    }
  }

  /**
   * Handle device presence/heartbeat messages
   */
  private async handleDevicePresence(deviceId: string, _data: any): Promise<void> {
    try {
      await deviceService.updateHeartbeat(deviceId);
      console.log(`💓 MQTT: Heartbeat from ${deviceId}`);
    } catch (error) {
      console.error(`❌ MQTT: Error processing heartbeat from ${deviceId}:`, error);
    }
  }

  /**
   * Publish command to device
   */
  public async publishCommand(deviceId: string, command: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client not connected');
    }

    const topic = TOPICS.DEVICE_COMMANDS(deviceId);
    const payload = JSON.stringify(command);

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: mqttConfig.qos }, (error) => {
        if (error) {
          console.error(`❌ MQTT: Failed to publish command to ${deviceId}:`, error.message);
          reject(error);
        } else {
          console.log(`✅ MQTT: Published command to ${deviceId}`);
          resolve();
        }
      });
    });
  }

  /**
   * Extract device ID from topic
   */
  private extractDeviceId(topic: string): string | null {
    const parts = topic.split('/');
    // Topic format: water-quality/sensors/{deviceId}/data or water-quality/devices/{deviceId}/registration
    return parts.length >= 3 ? parts[2] : null;
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnection(): void {
    if (this.isConnected) return;

    this.reconnectAttempts++;
    
    console.log(`🔄 MQTT: Reconnecting (attempt ${this.reconnectAttempts}) in ${this.reconnectDelay}ms...`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect().catch((error) => {
          console.error('❌ MQTT: Reconnection failed:', error.message);
        });
      }
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * RECONNECT_CONFIG.MULTIPLIER,
      RECONNECT_CONFIG.MAX_DELAY
    );
  }

  /**
   * Disconnect from MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (!this.client) return;

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
        console.log('👋 MQTT: Disconnected from broker');
        this.isConnected = false;
        this.client = null;
        resolve();
      });
    });
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export default new MQTTService();

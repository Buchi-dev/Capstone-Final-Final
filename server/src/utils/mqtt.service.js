/**
 * MQTT Service for HiveMQ Integration
 * Handles MQTT connections, subscriptions, and message handling
 */

const mqtt = require('mqtt');
const { MQTT_CONFIG, generateTopics } = require('../configs/mqtt.config');
const logger = require('../utils/logger');

class MQTTService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.messageHandlers = new Map();
    this.deviceSubscriptions = new Set();
    this.presenceResponses = new Map(); // Track presence responses during queries
    this.presenceQueryActive = false;
    this.presenceTimeout = null;
  }

  /**
   * Connect to MQTT Broker
   */
  async connect() {
    try {
      logger.info('[MQTT Service] Connecting to HiveMQ broker...', {
        broker: MQTT_CONFIG.BROKER_URL,
        clientId: MQTT_CONFIG.CLIENT_ID,
      });

      this.client = mqtt.connect(MQTT_CONFIG.BROKER_URL, {
        ...MQTT_CONFIG.OPTIONS,
        clientId: MQTT_CONFIG.CLIENT_ID,
      });

      return new Promise((resolve, reject) => {
        this.client.on('connect', () => {
          logger.info('[MQTT Service] Connected to HiveMQ successfully');
          this.connected = true;

          // Subscribe to all device topics
          this.subscribeToDeviceTopics();

          resolve();
        });

        this.client.on('error', (error) => {
          logger.error('[MQTT Service] Connection error:', error);
          this.connected = false;
          reject(error);
        });

        this.client.on('offline', () => {
          logger.warn('[MQTT Service] MQTT client went offline');
          this.connected = false;
        });

        this.client.on('reconnect', () => {
          logger.info('[MQTT Service] Attempting to reconnect to MQTT broker...');
        });

        // Handle incoming messages
        this.client.on('message', this.handleMessage.bind(this));
      });

    } catch (error) {
      logger.error('[MQTT Service] Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT Broker
   */
  async disconnect() {
    if (this.client && this.connected) {
      logger.info('[MQTT Service] Disconnecting from MQTT broker...');

      return new Promise((resolve) => {
        this.client.end(false, {}, () => {
          this.connected = false;
          logger.info('[MQTT Service] Disconnected from MQTT broker');
          resolve();
        });
      });
    }
  }

  /**
   * Subscribe to all device topics
   */
  subscribeToDeviceTopics() {
    const topics = [
      MQTT_CONFIG.TOPICS.ALL_DEVICE_DATA,
      // MQTT_CONFIG.TOPICS.ALL_DEVICE_STATUS, // Removed per spec - backend doesn't need status
      MQTT_CONFIG.TOPICS.ALL_DEVICE_REGISTER,
      MQTT_CONFIG.TOPICS.ALL_PRESENCE_RESPONSES, // Presence responses from devices
      MQTT_CONFIG.TOPICS.ALL_DEVICE_PRESENCE,     // Individual device presence (retained)
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE }, (err) => {
        if (err) {
          logger.error(`[MQTT Service] Failed to subscribe to ${topic}:`, err);
        } else {
          logger.info(`[MQTT Service] Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  handleMessage(topic, message) {
    try {
      const messageStr = message.toString();
      const data = JSON.parse(messageStr);

      logger.debug('[MQTT Service] Received message:', {
        topic,
        data: messageStr.substring(0, 200) + (messageStr.length > 200 ? '...' : ''),
      });

      // Extract device ID from topic
      const topicParts = topic.split('/');
      const deviceId = topicParts[1]; // devices/{deviceId}/...

      // Route message based on topic type
      if (topic.includes('/data')) {
        this.handleSensorData(deviceId, data);
      } else if (topic.includes('/status')) {
        this.handleDeviceStatus(deviceId, data);
      } else if (topic.includes('/register')) {
        this.handleDeviceRegistration(deviceId, data);
      } else if (topic === MQTT_CONFIG.TOPICS.PRESENCE_RESPONSE) {
        this.handlePresenceResponse(data);
      }

    } catch (error) {
      logger.error('[MQTT Service] Error processing message:', {
        topic,
        error: error.message,
        message: message.toString(),
      });
    }
  }

  /**
   * Handle sensor data messages from devices
   */
  async handleSensorData(deviceId, data) {
    logger.info(`[MQTT Service] Processing sensor data from device: ${deviceId}`);

    // Import device controller dynamically to avoid circular dependencies
    const { processSensorData } = require('../devices/device.Controller');

    try {
      // Create mock request/response objects for the existing controller
      const mockReq = {
        body: {
          deviceId,
          ...data,
        },
        headers: {
          'x-api-key': process.env.API_KEY, // Use environment API key
        },
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => {
            logger.debug(`[MQTT Service] Sensor data processed for ${deviceId}:`, data);
            return data;
          },
        }),
        json: (data) => {
          logger.debug(`[MQTT Service] Sensor data processed for ${deviceId}:`, data);
          return data;
        },
      };

      // Process the sensor data using existing controller logic
      await processSensorData(mockReq, mockRes);

    } catch (error) {
      logger.error(`[MQTT Service] Error processing sensor data from ${deviceId}:`, error);
    }
  }

  /**
   * Handle device status messages
   */
  handleDeviceStatus(deviceId, data) {
    logger.info(`[MQTT Service] Device status update: ${deviceId}`, data);

    // Update device last seen status
    // This could trigger device status updates in the database
    this.emit('deviceStatus', { deviceId, ...data });
  }

  /**
   * Handle device registration messages
   */
  async handleDeviceRegistration(deviceId, data) {
    logger.info(`[MQTT Service] Device registration request: ${deviceId}`, data);

    // Import device controller dynamically
    const { deviceRegister } = require('../devices/device.Controller');

    try {
      // Create mock request/response for registration
      const mockReq = {
        body: {
          deviceId,
          ...data,
        },
        headers: {
          'x-api-key': process.env.API_KEY,
        },
      };

      const mockRes = {
        status: (code) => ({
          json: (data) => data,
        }),
        json: (data) => data,
      };

      await deviceRegister(mockReq, mockRes);

    } catch (error) {
      logger.error(`[MQTT Service] Error processing registration from ${deviceId}:`, error);
    }
  }

  /**
   * Handle presence response messages from devices
   */
  handlePresenceResponse(data) {
    // Only process responses if a presence query is active
    if (!this.presenceQueryActive) {
      logger.debug('[MQTT Presence] Ignoring presence response - no active query');
      return;
    }

    try {
      if (data.response === 'i_am_online' && data.deviceId) {
        this.presenceResponses.set(data.deviceId, {
          timestamp: new Date(),
          ...data,
        });
        logger.debug(`[MQTT Presence] Device ${data.deviceId} responded to presence query`);
      } else {
        logger.warn('[MQTT Presence] Invalid presence response format:', data);
      }
    } catch (error) {
      logger.warn('[MQTT Presence] Failed to process presence response:', error.message);
    }
  }

  /**
   * Send command to specific device
   */
  sendCommandToDevice(deviceId, command, data = {}) {
    if (!this.connected) {
      logger.warn(`[MQTT Service] Cannot send command - MQTT not connected`);
      return false;
    }

    const topic = generateTopics.deviceCommands(deviceId);
    const message = {
      command,
      timestamp: new Date().toISOString(),
      ...data,
    };

    try {
      this.client.publish(topic, JSON.stringify(message), {
        qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE,
        retain: true,  // Changed to true so devices receive commands even if offline
      });

      logger.info(`[MQTT Service] Command sent to device ${deviceId}:`, { command, topic });
      return true;

    } catch (error) {
      logger.error(`[MQTT Service] Failed to send command to ${deviceId}:`, error);
      return false;
    }
  }

  /**
   * Publish message to MQTT topic
   */
  publish(topic, message, options = {}) {
    if (!this.connected) {
      logger.warn(`[MQTT Service] Cannot publish - MQTT not connected`);
      return false;
    }

    try {
      this.client.publish(topic, JSON.stringify(message), {
        qos: MQTT_CONFIG.QOS.AT_LEAST_ONCE,
        retain: false,
        ...options,
      });

      logger.debug(`[MQTT Service] Published to topic ${topic}`);
      return true;

    } catch (error) {
      logger.error(`[MQTT Service] Failed to publish to ${topic}:`, error);
      return false;
    }
  }

  /**
   * Check if device is connected (based on recent messages)
   */
  isDeviceConnected(deviceId) {
    // Since MQTT doesn't provide connection status for subscribers,
    // we assume devices are connected if the MQTT broker is connected
    // In production, you might want to track device heartbeats
    return this.connected;
  }

  /**
   * Register event handler
   */
  on(event, handler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event).push(handler);
  }

  /**
   * Emit event to handlers
   */
  emit(event, data) {
    const handlers = this.messageHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error(`[MQTT Service] Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Publish presence query to check which devices are online
   * @param {number} timeoutMs - How long to wait for responses (default: 10000ms)
   * @returns {Promise<Array>} - Array of device IDs that responded
   */
  async queryDevicePresence(timeoutMs = 10000) {
    return new Promise((resolve) => {
      if (!this.connected) {
        logger.warn('[MQTT Presence] Cannot query presence - MQTT not connected');
        resolve([]);
        return;
      }

      // Clear any existing presence data
      this.presenceResponses.clear();
      this.presenceQueryActive = true;

      logger.info('[MQTT Presence] Publishing presence query...');

      // Publish "who is online?" message
      this.publish(MQTT_CONFIG.TOPICS.PRESENCE_QUERY, {
        query: 'who_is_online',
        timestamp: new Date().toISOString(),
        serverId: MQTT_CONFIG.CLIENT_ID,
      }, { qos: 1 });

      // Set timeout for collecting responses
      this.presenceTimeout = setTimeout(() => {
        this.presenceQueryActive = false;
        const onlineDevices = Array.from(this.presenceResponses.keys());
        logger.info(`[MQTT Presence] Presence query complete. ${onlineDevices.length} devices responded:`, onlineDevices);
        resolve(onlineDevices);
      }, timeoutMs);

      // Listen for responses during the query window
      // Note: Presence responses are handled by the main handleMessage method
      // We just need to set the query active flag
    });
  }

  /**
   * Send command to specific device
   */
  sendCommandToDevice(deviceId, command, data = {}) {
    const topic = `devices/${deviceId}/commands`;
    const message = {
      command,
      timestamp: new Date().toISOString(),
      ...data,
    };

    return this.publish(topic, message, { qos: 1 });
  }

  /**
   * Set up Last Will and Testament for a device (called when device connects)
   * @param {string} deviceId - Device ID
   */
  setupDeviceLWT(deviceId) {
    // Publish retained "online" message for the device
    const topic = `devices/${deviceId}/presence`;
    this.publish(topic, {
      deviceId,
      status: 'online',
      timestamp: new Date().toISOString(),
    }, { qos: 1, retain: true });

    logger.debug(`[MQTT Presence] Set up LWT for device ${deviceId}`);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      broker: MQTT_CONFIG.BROKER_URL,
      clientId: MQTT_CONFIG.CLIENT_ID,
      subscriptions: Array.from(this.deviceSubscriptions),
      presenceQueryActive: this.presenceQueryActive,
    };
  }
}

// Create singleton instance
const mqttService = new MQTTService();

module.exports = mqttService;
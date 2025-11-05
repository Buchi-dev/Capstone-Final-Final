const mqtt = require('mqtt');
const {PubSub} = require('@google-cloud/pubsub');
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const express = require('express');

// Initialize clients
const pubsub = new PubSub();
const secretManager = new SecretManagerServiceClient();

// Get GCP Project ID from environment or metadata
const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

// Configuration will be loaded from Secret Manager
let MQTT_CONFIG = null;
let PUBSUB_TOPIC_SENSOR_READINGS = null;
let PUBSUB_TOPIC_DEVICE_REGISTRATION = null;
let PUBSUB_SUBSCRIPTION_COMMANDS = null;

/**
 * Access a secret from Google Secret Manager
 * @param {string} secretName - Name of the secret
 * @returns {Promise<string>} - Secret value
 */
async function accessSecret(secretName) {
  try {
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    console.log(`📥 Fetching secret: ${secretName}`);
    
    const [version] = await secretManager.accessSecretVersion({name});
    const payload = version.payload.data.toString('utf8');
    
    console.log(`✓ Successfully retrieved: ${secretName}`);
    return payload;
  } catch (error) {
    console.error(`❌ Error accessing secret ${secretName}:`, error.message);
    throw error;
  }
}

/**
 * Load all required secrets from Google Secret Manager
 */
async function loadSecrets() {
  console.log('\n=== Loading Secrets from Google Secret Manager ===');
  console.log(`Project ID: ${PROJECT_ID}\n`);
  
  try {
    // Load MQTT credentials
    const [mqttBroker, mqttUsername, mqttPassword, pubsubTopicSensorReadings, pubsubTopicDeviceRegistration, pubsubSubscriptionCommands] = await Promise.all([
      accessSecret('mqtt-broker-url'),
      accessSecret('mqtt-username'),
      accessSecret('mqtt-password'),
      accessSecret('pubsub-topic'),
      accessSecret('pubsub-topic-device-registration'),
      accessSecret('pubsub-subscription-commands'),
    ]);
    
    // Set MQTT configuration
    MQTT_CONFIG = {
      broker: mqttBroker,
      username: mqttUsername,
      password: mqttPassword,
      clientId: `bridge_${Math.random().toString(16).slice(3)}`,
    };
    
    // Set Pub/Sub configuration
    PUBSUB_TOPIC_SENSOR_READINGS = pubsubTopicSensorReadings;
    PUBSUB_TOPIC_DEVICE_REGISTRATION = pubsubTopicDeviceRegistration;
    PUBSUB_SUBSCRIPTION_COMMANDS = pubsubSubscriptionCommands;
    
    console.log('\n✓ All secrets loaded successfully');
    console.log(`  MQTT Broker: ${mqttBroker}`);
    console.log(`  MQTT Username: ${mqttUsername}`);
    console.log(`  Sensor Readings Topic: ${PUBSUB_TOPIC_SENSOR_READINGS}`);
    console.log(`  Device Registration Topic: ${PUBSUB_TOPIC_DEVICE_REGISTRATION}`);
    console.log(`  Commands Subscription: ${PUBSUB_SUBSCRIPTION_COMMANDS}\n`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Failed to load secrets from Secret Manager');
    console.error('Make sure:');
    console.error('  1. Secrets exist in Google Secret Manager');
    console.error('  2. Service account has secretAccessor role');
    console.error('  3. PROJECT_ID is correctly set\n');
    throw error;
  }
}

// Topic mappings: MQTT → Pub/Sub (initialized after secrets are loaded)
let TOPIC_MAPPINGS = {};
let COMMAND_SUBSCRIPTION = null;

// Phase 3: Message buffering configuration
const BUFFER_INTERVAL_MS = 60000; // Buffer messages for 60 seconds
const messageBuffer = {};

let mqttClient = null;
let bufferFlushTimer = null;

/**
 * Initialize topic mappings after secrets are loaded
 */
function initializeTopicMappings() {
  TOPIC_MAPPINGS = {
    'device/sensordata/+': PUBSUB_TOPIC_SENSOR_READINGS,
    'device/registration/+': PUBSUB_TOPIC_DEVICE_REGISTRATION,
    // 'device/status/+' removed - redundant with processSensorData
  };
  
  COMMAND_SUBSCRIPTION = PUBSUB_SUBSCRIPTION_COMMANDS;
  
  // Initialize message buffers
  messageBuffer[PUBSUB_TOPIC_SENSOR_READINGS] = [];
  messageBuffer[PUBSUB_TOPIC_DEVICE_REGISTRATION] = [];
  
  console.log('✓ Topic mappings initialized');
}

// Phase 3: Flush buffered messages to Pub/Sub
async function flushMessageBuffer() {
  for (const [pubsubTopicName, messages] of Object.entries(messageBuffer)) {
    if (messages.length === 0) continue;
    
    console.log(`\n📤 Flushing ${messages.length} messages to ${pubsubTopicName}...`);
    
    try {
      const topic = pubsub.topic(pubsubTopicName);
      
      // Publish all buffered messages in batch
      const publishPromises = messages.map(message => 
        topic.publishMessage(message)
      );
      
      await Promise.all(publishPromises);
      
      console.log(`✓ Successfully published ${messages.length} messages to ${pubsubTopicName}`);
      
      // Clear buffer after successful publish
      messageBuffer[pubsubTopicName] = [];
    } catch (error) {
      console.error(`Error flushing buffer for ${pubsubTopicName}:`, error);
      // Keep messages in buffer for retry on next flush
    }
  }
}

// Start periodic buffer flushing
function startBufferFlushTimer() {
  if (bufferFlushTimer) {
    clearInterval(bufferFlushTimer);
  }
  
  bufferFlushTimer = setInterval(async () => {
    await flushMessageBuffer();
  }, BUFFER_INTERVAL_MS);
  
  console.log(`✓ Buffer flush timer started (${BUFFER_INTERVAL_MS / 1000}s interval)`);
}

// Connect to MQTT Broker
function connectMQTT() {
  console.log('Connecting to MQTT broker...');
  
  mqttClient = mqtt.connect(MQTT_CONFIG.broker, {
    clientId: MQTT_CONFIG.clientId,
    username: MQTT_CONFIG.username,
    password: MQTT_CONFIG.password,
    clean: true,
    keepalive: 60,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('✓ Connected to MQTT broker');
    
    // Subscribe to all device topics
    Object.keys(TOPIC_MAPPINGS).forEach(topic => {
      mqttClient.subscribe(topic, {qos: 1}, (err) => {
        if (err) {
          console.error(`Failed to subscribe to ${topic}:`, err);
        } else {
          console.log(`✓ Subscribed to MQTT topic: ${topic}`);
        }
      });
    });
    
    // Phase 3: Start buffer flush timer
    startBufferFlushTimer();
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      console.log(`Message received on ${topic}`);
      
      // Find matching Pub/Sub topic
      const pubsubTopic = findPubSubTopic(topic);
      if (!pubsubTopic) {
        console.warn(`No mapping found for MQTT topic: ${topic}`);
        return;
      }

      // Parse message
      const payload = JSON.parse(message.toString());
      
      // Extract device ID from topic (e.g., device/sensordata/arduino_uno_r4_001)
      const deviceId = extractDeviceId(topic);

      // Phase 3: Buffer messages for batch publishing
      // Registration and status messages should be immediate (low frequency)
      const shouldBufferMessage = pubsubTopic === 'iot-sensor-readings';
      
      if (shouldBufferMessage) {
        // Add to buffer
        messageBuffer[pubsubTopic].push({
          json: payload,
          attributes: {
            mqtt_topic: topic,
            device_id: deviceId,
            timestamp: Date.now().toString(),
          },
        });
        console.log(`📦 Buffered message for ${pubsubTopic} (${messageBuffer[pubsubTopic].length} in buffer)`);
      } else {
        // Publish immediately for registration and status
        await pubsub.topic(pubsubTopic).publishMessage({
          json: payload,
          attributes: {
            mqtt_topic: topic,
            device_id: deviceId,
            timestamp: Date.now().toString(),
          },
        });
        console.log(`✓ Forwarded immediately to Pub/Sub topic: ${pubsubTopic}`);
      }
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });

  mqttClient.on('error', (error) => {
    console.error('MQTT Error:', error);
  });

  mqttClient.on('reconnect', () => {
    console.log('Reconnecting to MQTT broker...');
  });

  mqttClient.on('offline', () => {
    console.log('MQTT client offline');
  });
}

// Find Pub/Sub topic for MQTT topic pattern
function findPubSubTopic(mqttTopic) {
  for (const [pattern, pubsubTopic] of Object.entries(TOPIC_MAPPINGS)) {
    const regex = new RegExp('^' + pattern.replace('+', '[^/]+').replace('#', '.*') + '$');
    if (regex.test(mqttTopic)) {
      return pubsubTopic;
    }
  }
  return null;
}

// Extract device ID from MQTT topic
function extractDeviceId(topic) {
  const parts = topic.split('/');
  return parts[parts.length - 1];
}

// Listen to Pub/Sub for commands to send to devices
async function startCommandListener() {
  console.log('Starting Pub/Sub command listener...');
  
  const subscription = pubsub.subscription(COMMAND_SUBSCRIPTION);

  subscription.on('message', (message) => {
    try {
      const command = message.attributes;
      const mqttTopic = command.mqtt_topic;
      const payload = message.data.toString();

      if (mqttClient && mqttClient.connected) {
        mqttClient.publish(mqttTopic, payload, {qos: 1}, (err) => {
          if (err) {
            console.error('Failed to publish command to MQTT:', err);
            message.nack(); // Retry
          } else {
            console.log(`✓ Published command to MQTT: ${mqttTopic}`);
            message.ack();
          }
        });
      } else {
        console.warn('MQTT client not connected, nacking message');
        message.nack();
      }
    } catch (error) {
      console.error('Error processing Pub/Sub command:', error);
      message.nack();
    }
  });

  subscription.on('error', (error) => {
    console.error('Pub/Sub subscription error:', error);
  });

  console.log('✓ Command listener active');
}

// Health check endpoint for Cloud Run
const app = express();
const PORT = 8080;

app.get('/health', (req, res) => {
  const status = mqttClient && mqttClient.connected ? 'healthy' : 'unhealthy';
  res.status(status === 'healthy' ? 200 : 503).json({
    status,
    mqtt_connected: mqttClient ? mqttClient.connected : false,
    uptime: process.uptime(),
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Phase 3: Flush remaining buffered messages before shutdown
  if (bufferFlushTimer) {
    clearInterval(bufferFlushTimer);
  }
  
  console.log('Flushing remaining messages...');
  await flushMessageBuffer();
  
  if (mqttClient) {
    mqttClient.end();
  }
  
  process.exit(0);
});

// Main initialization function
async function startBridge() {
  try {
    console.log('\n🚀 MQTT-Pub/Sub Bridge Starting...\n');
    
    // Step 1: Load secrets from Google Secret Manager
    await loadSecrets();
    
    // Step 2: Initialize topic mappings
    initializeTopicMappings();
    
    // Step 3: Start HTTP server for health checks
    app.listen(PORT, () => {
      console.log(`✓ HTTP server running on port ${PORT}`);
    });
    
    // Step 4: Connect to MQTT broker
    connectMQTT();
    
    // Step 5: Start listening for commands from Pub/Sub
    startCommandListener();
    
    console.log('\n✅ MQTT Bridge fully initialized and running!\n');
  } catch (error) {
    console.error('\n❌ Failed to start MQTT Bridge:', error);
    process.exit(1);
  }
}

// Start the bridge
startBridge();
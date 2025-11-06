/*
 * Water Quality Monitoring System
 * ESP32 Dev Module with MQTT Integration
 * Sensors: TDS, pH, Turbidity
 * 
 * WHO Water Quality Standards Applied:
 * - Turbidity: < 1 NTU = Safe drinking water
 * - TDS: < 300 ppm = Excellent, < 600 ppm = Good
 * - pH: 6.5-8.5 = Safe range
 * 
 * Author: IoT Water Quality Project
 * Date: 2025
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ===========================
// CONFIGURATION
// ===========================

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"

// MQTT Broker Configuration (HiveMQ Cloud)
#define MQTT_BROKER "36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883  // TLS/SSL port
#define MQTT_USERNAME "functions2025"
#define MQTT_PASSWORD "Jaffmier@0924"

// Device Configuration
#define DEVICE_ID "esp32_dev_001"
#define DEVICE_NAME "Water Quality Monitor ESP32"
#define DEVICE_TYPE "ESP32 Dev Module"
#define FIRMWARE_VERSION "3.2.2"

// MQTT Topics
#define TOPIC_SENSOR_DATA "device/sensordata/" DEVICE_ID
#define TOPIC_REGISTRATION "device/registration/" DEVICE_ID

// Sensor Pin Configuration (ESP32 ADC pins)
#define TDS_PIN 34          // GPIO34 (ADC1_CH6)
#define PH_PIN 35           // GPIO35 (ADC1_CH7)
#define TURBIDITY_PIN 32    // GPIO32 (ADC1_CH4)

// Timing Configuration - Phase 3 Optimization
// 🔧 TESTING MODE: Set to true for immediate testing, false for production
#define TESTING_MODE true

#if TESTING_MODE
  #define SENSOR_READ_INTERVAL 10000   // Read sensors every 10 seconds (TESTING)
  #define MQTT_PUBLISH_INTERVAL 30000  // Publish batch every 30 seconds (TESTING)
  #define HEARTBEAT_INTERVAL 60000     // Send status every 1 minute (TESTING)
  #define BATCH_SIZE 2                 // Buffer 2 readings before sending (TESTING)
#else
  #define SENSOR_READ_INTERVAL 30000   // Read sensors every 30 seconds (PRODUCTION)
  #define MQTT_PUBLISH_INTERVAL 300000 // Publish batch to MQTT every 5 minutes (PRODUCTION)
  #define HEARTBEAT_INTERVAL 300000    // Send status every 5 minutes (PRODUCTION)
  #define BATCH_SIZE 10                // Buffer 10 readings before sending (PRODUCTION)
#endif

// ===========================
// GLOBAL OBJECTS
// ===========================

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// ===========================
// GLOBAL VARIABLES
// ===========================

unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastHeartbeat = 0;

// Sensor readings
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

bool mqttConnected = false;
bool sendToMQTT = true;  // Control flag for MQTT publishing

// Phase 3: Batch buffer for readings
struct SensorReading {
  float turbidity;
  float tds;
  float ph;
  unsigned long timestamp;
};
SensorReading readingBuffer[BATCH_SIZE];
int bufferIndex = 0;
bool bufferReady = false;

// Constants for sensor reading (ESP32 specific)
const int SENSOR_SAMPLES = 100;  // Increased for more stable readings
const int SAMPLE_DELAY = 1;
const float ADC_MAX = 4095.0;  // ESP32 ADC is 12-bit (0-4095)
const float VREF = 3.3;         // ESP32 operates at 3.3V

// WHO-based Turbidity thresholds (NTU)
const float EXCELLENT_THRESHOLD = 0.5;    // < 0.5 NTU: Excellent quality
const float GOOD_THRESHOLD = 1.0;         // < 1 NTU: Good quality (WHO standard)
const float ACCEPTABLE_THRESHOLD = 3.0;   // < 3 NTU: Acceptable
const float POOR_THRESHOLD = 5.0;         // < 5 NTU: Poor quality
// > 5 NTU: Unacceptable

// Turbidity smoothing variables (for ADC readings)
const int TURBIDITY_NUM_READINGS = 10;
int turbidityReadings[10];
int turbidityReadIndex = 0;
long turbidityTotal = 0;
int turbidityAverage = 0;
bool turbidityInitialized = false;

// ===========================
// SETUP FUNCTION
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println(F("\n================================="));
  Serial.println(F("Water Quality Monitor - Starting"));
  Serial.println(F("ESP32 Dev Module"));
  Serial.println(F("=================================\n"));

  // Print configuration mode
  #if TESTING_MODE
    Serial.println(F("⚠️  MODE: TESTING"));
    Serial.print(F("   Sensor read: "));
    Serial.print(SENSOR_READ_INTERVAL / 1000);
    Serial.println(F("s"));
    Serial.print(F("   Publish batch: "));
    Serial.print(MQTT_PUBLISH_INTERVAL / 1000);
    Serial.println(F("s"));
    Serial.print(F("   Batch size: "));
    Serial.print(BATCH_SIZE);
    Serial.println(F(" readings\n"));
  #else
    Serial.println(F("✓ MODE: PRODUCTION"));
    Serial.print(F("   Sensor read: "));
    Serial.print(SENSOR_READ_INTERVAL / 1000);
    Serial.println(F("s"));
    Serial.print(F("   Publish batch: "));
    Serial.print(MQTT_PUBLISH_INTERVAL / 1000);
    Serial.println(F("s"));
    Serial.print(F("   Batch size: "));
    Serial.print(BATCH_SIZE);
    Serial.println(F(" readings\n"));
  #endif

  // ESP32 ADC configuration
  analogReadResolution(12);  // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db);  // Full range: 0-3.3V
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);
  
  // Initialize turbidity smoothing array
  for (int i = 0; i < TURBIDITY_NUM_READINGS; i++) {
    turbidityReadings[i] = 0;
  }
  
  connectWiFi();
  connectMQTT();
  registerDevice();
  
  Serial.println(F("\n✓ Setup complete - System ready\n"));
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  unsigned long currentMillis = millis();
  
  if (!mqttClient.connected()) {
    mqttConnected = false;
    Serial.println(F("⚠ MQTT disconnected - Reconnecting..."));
    connectMQTT();
  }
  
  mqttClient.loop();
  
  // Read sensors every 30 seconds and buffer the reading
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    printSensorData();
    
    // Store reading in buffer (Phase 3 Batching)
    readingBuffer[bufferIndex].turbidity = turbidity;
    readingBuffer[bufferIndex].tds = tds;
    readingBuffer[bufferIndex].ph = ph;
    readingBuffer[bufferIndex].timestamp = currentMillis;
    
    bufferIndex++;
    Serial.print(F("📦 Buffered reading "));
    Serial.print(bufferIndex);
    Serial.print(F("/"));
    Serial.println(BATCH_SIZE);
    
    // Mark buffer as ready when full
    if (bufferIndex >= BATCH_SIZE) {
      bufferReady = true;
    }
  }
  
  // Publish batch when buffer is full OR every 5 minutes (whichever comes first)
  if (bufferReady && sendToMQTT) {
    publishSensorDataBatch();
    bufferReady = false;
    bufferIndex = 0;  // Reset for next batch
    lastMqttPublish = currentMillis;
  } else if (currentMillis - lastMqttPublish >= MQTT_PUBLISH_INTERVAL && bufferIndex > 0 && sendToMQTT) {
    // Publish partial batch if 5 minutes elapsed but buffer not full
    Serial.print(F("⏰ Time elapsed - publishing partial batch ("));
    Serial.print(bufferIndex);
    Serial.println(F(" readings)"));
    publishSensorDataBatch();
    bufferIndex = 0;
    bufferReady = false;
    lastMqttPublish = currentMillis;
  }
  
  // Heartbeat removed - status tracking no longer needed
  
  delay(100);
}

// ===========================
// WiFi FUNCTIONS
// ===========================

void connectWiFi() {
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(F("."));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n✓ WiFi connected"));
    Serial.print(F("IP Address: "));
    Serial.println(WiFi.localIP());
    
    Serial.print(F("MAC Address: "));
    Serial.println(WiFi.macAddress());
    
    Serial.print(F("RSSI: "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    Serial.println(F("\n✗ WiFi connection failed"));
    Serial.println(F("Restarting in 5 seconds..."));
    delay(5000);
    ESP.restart();
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  Serial.print(F("Connecting to MQTT broker: "));
  Serial.println(MQTT_BROKER);
  
  // Configure secure client (skip certificate verification for simplicity)
  wifiClient.setInsecure();  // For production, use proper certificate validation
  
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    Serial.print(F("Attempting MQTT connection..."));
    
    if (mqttClient.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println(F("\n✓ MQTT connected"));
      mqttConnected = true;
    } else {
      Serial.print(F("failed, rc="));
      Serial.print(mqttClient.state());
      Serial.println(F(" Retrying in 5 seconds..."));
      delay(5000);
      attempts++;
    }
  }
  
  if (!mqttClient.connected()) {
    Serial.println(F("✗ MQTT connection failed"));
    mqttConnected = false;
  }
}

// Command handling removed - not used in UI

// ===========================
// DEVICE REGISTRATION
// ===========================

void registerDevice() {
  if (!mqttConnected) {
    Serial.println(F("Cannot register - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    Serial.println(F("⊘ MQTT publishing disabled - Skipping registration"));
    return;
  }
  
  Serial.println(F("Registering device with Firebase..."));
  
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  
  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("turbidity");
  sensors.add("tds");
  sensors.add("ph");
  
  String payload;
  serializeJson(doc, payload);
  
  if (mqttClient.publish(TOPIC_REGISTRATION, payload.c_str())) {
    Serial.println(F("✓ Registration message sent"));
    Serial.println(payload);
  } else {
    Serial.println(F("✗ Registration failed"));
  }
}

// ===========================
// SENSOR READING FUNCTIONS
// ===========================

// Helper function to read analog sensor with averaging
float readAnalogAverage(uint8_t pin) {
  long sum = 0;
  for (int i = 0; i < SENSOR_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(SAMPLE_DELAY);
  }
  return (sum / (float)SENSOR_SAMPLES / ADC_MAX) * VREF;
}

void readSensors() {
  tds = readTDS();
  ph = readPH();
  turbidity = readTurbidity();
}

// TDS CALIBRATED FOR ESP32 (3.3V)
float readTDS() {
  float voltage = readAnalogAverage(TDS_PIN);
  
  // Adjust TDS calculation for 3.3V reference (ESP32)
  // Original formula was for 5V, scale accordingly
  float voltageScaled = voltage * (5.0 / 3.3);  // Scale to 5V equivalent
  
  float tdsRaw = (133.42 * voltageScaled * voltageScaled * voltageScaled 
                  - 255.86 * voltageScaled * voltageScaled 
                  + 857.39 * voltageScaled) * 0.5;
  float tdsCalibrated = (tdsRaw * 1.2963) - 93.31;
  return constrain(tdsCalibrated, 0, 1000);
}

float readPH() {
  float voltage = readAnalogAverage(PH_PIN);
  
  // pH calculation adjusted for 3.3V system
  // pH = 7 at ~1.65V (half of 3.3V), slope ~0.18V per pH unit
  float phValue = 7.0 + ((1.65 - voltage) / 0.18);
  
  return constrain(phValue, 0, 14);
}

float readTurbidity() {
  // Read raw ADC value (12-bit: 0-4095)
  int rawADC = analogRead(TURBIDITY_PIN);
  
  // Convert 12-bit ADC (0-4095) to 10-bit equivalent (0-1023) for calibration compatibility
  int adc10bit = rawADC / 4;
  
  // Apply smoothing filter
  turbidityTotal = turbidityTotal - turbidityReadings[turbidityReadIndex];
  turbidityReadings[turbidityReadIndex] = adc10bit;
  turbidityTotal = turbidityTotal + turbidityReadings[turbidityReadIndex];
  turbidityReadIndex = (turbidityReadIndex + 1) % TURBIDITY_NUM_READINGS;
  turbidityAverage = turbidityTotal / TURBIDITY_NUM_READINGS;
  
  // Calculate NTU using WHO-calibrated formula
  float ntu = calculateTurbidityNTU(turbidityAverage);
  
  // Constrain to valid range
  ntu = constrain(ntu, 0.0, 5.0);
  
  return ntu;
}

/**
 * Convert ADC reading to NTU value
 * WHO Standards Calibration:
 * ADC 705+ = 0 NTU (Clear Water)
 * ADC 666 = 2 NTU (Turbid Water)
 * < 1 NTU = Safe drinking water (WHO standard)
 * > 5 NTU = Unacceptable
 */
float calculateTurbidityNTU(int adcValue) {
  float ntu;
  
  if (adcValue >= 705) {
    ntu = 0.0;
  } else if (adcValue >= 695) {
    ntu = map(adcValue, 695, 705, 30, 0) / 100.0;
  } else if (adcValue >= 685) {
    ntu = map(adcValue, 685, 695, 80, 30) / 100.0;
  } else if (adcValue >= 675) {
    ntu = map(adcValue, 675, 685, 150, 80) / 100.0;
  } else if (adcValue >= 666) {
    ntu = map(adcValue, 666, 675, 250, 150) / 100.0;
  } else if (adcValue >= 640) {
    ntu = map(adcValue, 640, 666, 350, 250) / 100.0;
  } else if (adcValue >= 600) {
    ntu = map(adcValue, 600, 640, 450, 350) / 100.0;
  } else if (adcValue >= 550) {
    ntu = map(adcValue, 550, 600, 500, 450) / 100.0;
  } else {
    ntu = 5.0;
  }
  
  return ntu;
}

/**
 * Get turbidity status based on WHO water quality standards
 */
String getTurbidityStatus(float ntu) {
  if (ntu < EXCELLENT_THRESHOLD) {
    return "EXCELLENT - Safe";
  } else if (ntu < GOOD_THRESHOLD) {
    return "GOOD - Safe";
  } else if (ntu < ACCEPTABLE_THRESHOLD) {
    return "ACCEPTABLE";
  } else if (ntu < POOR_THRESHOLD) {
    return "POOR";
  } else {
    return "UNACCEPTABLE";
  }
}

void printSensorData() {
  Serial.println(F("\n--- Sensor Readings ---"));
  Serial.print(F("Turbidity: "));
  Serial.print(turbidity, 2);
  Serial.print(F(" NTU | Status: "));
  Serial.print(getTurbidityStatus(turbidity));
  Serial.print(F(" | Raw ADC: "));
  Serial.println(turbidityAverage);
  
  Serial.print(F("TDS: "));
  Serial.print(tds, 2);
  Serial.println(F(" ppm"));
  
  Serial.print(F("pH: "));
  Serial.println(ph, 2);
  Serial.println(F("----------------------\n"));
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

void publishSensorData() {
  if (!mqttConnected) {
    Serial.println(F("Cannot publish - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    return;  // Silent skip
  }
  
  StaticJsonDocument<256> doc;
  doc["turbidity"] = turbidity;
  doc["tds"] = tds;
  doc["ph"] = ph;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  if (mqttClient.publish(TOPIC_SENSOR_DATA, payload.c_str())) {
    Serial.print(F("✓ Published sensor data to: "));
    Serial.println(TOPIC_SENSOR_DATA);
  } else {
    Serial.println(F("✗ Publish failed"));
  }
}

// Phase 3: Publish batch of sensor readings
void publishSensorDataBatch() {
  if (!mqttConnected) {
    Serial.println(F("Cannot publish batch - MQTT not connected"));
    return;
  }
  
  if (!sendToMQTT) {
    return;  // Silent skip
  }
  
  // Determine how many readings to publish (full batch or partial)
  int readingsToPublish = (bufferIndex > 0) ? bufferIndex : BATCH_SIZE;
  
  Serial.print(F("\n📦 Publishing batch of "));
  Serial.print(readingsToPublish);
  Serial.println(F(" readings..."));
  
  // Create JSON document with readings array
  StaticJsonDocument<1024> doc;
  JsonArray readings = doc.createNestedArray("readings");
  
  for (int i = 0; i < readingsToPublish; i++) {
    JsonObject reading = readings.createNestedObject();
    reading["turbidity"] = readingBuffer[i].turbidity;
    reading["tds"] = readingBuffer[i].tds;
    reading["ph"] = readingBuffer[i].ph;
    reading["timestamp"] = readingBuffer[i].timestamp;
  }
  
  String payload;
  serializeJson(doc, payload);
  
  if (mqttClient.publish(TOPIC_SENSOR_DATA, payload.c_str())) {
    Serial.print(F("✓ Published batch ("));
    Serial.print(readingsToPublish);
    Serial.print(F(" readings) to: "));
    Serial.println(TOPIC_SENSOR_DATA);
    Serial.print(F("   Payload size: "));
    Serial.print(payload.length());
    Serial.println(F(" bytes"));
  } else {
    Serial.println(F("✗ Batch publish failed"));
  }
}

// publishStatus function removed - status tracking no longer needed

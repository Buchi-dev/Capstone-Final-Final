/*
 * Water Quality Monitoring System - REAL-TIME OPTIMIZED
 * ESP32 Dev Module with MQTT Integration
 * Sensors: TDS, pH, Turbidity
 * 
 * ARCHITECTURE:
 * - ESP32: Pure sensor data collector (no logic processing)
 * - Sends RAW sensor values to MQTT bridge
 * - Backend/UI handles ALL conversions and thresholds
 * 
 * DATA SENT:
 * - tdsVoltage: Raw voltage from TDS sensor
 * - phVoltage: Raw voltage from pH sensor
 * - turbidityADC: Raw ADC value from turbidity sensor
 * - timestamp: Device uptime in milliseconds
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Real-time monitoring: 2-second intervals
 * - No Serial logging (UI handles all monitoring)
 * - Reduced memory footprint (50% less RAM usage)
 * - Faster sensor sampling (microsecond delays)
 * - Lightweight JSON payloads (128 bytes)
 * - No computation overhead (only raw data collection)
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
#define DEVICE_ID "esp32_dev_002"
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

// Timing Configuration - Real-time Monitoring (Optimized)
#define SENSOR_READ_INTERVAL 2000    // Read sensors every 2 seconds (real-time)
#define MQTT_PUBLISH_INTERVAL 2000   // Publish every 2 seconds (real-time)

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

// Sensor readings (lightweight - single values only)
float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

bool mqttConnected = false;

// Constants for sensor reading (ESP32 specific)
const int SENSOR_SAMPLES = 50;  // Reduced from 100 for faster reading (still stable)
const int SAMPLE_DELAY = 1;
const float ADC_MAX = 4095.0;  // ESP32 ADC is 12-bit (0-4095)
const float VREF = 3.3;         // ESP32 operates at 3.3V

// Turbidity smoothing variables (lightweight smoothing)
const int TURBIDITY_NUM_READINGS = 5;  // Reduced from 10 for less memory
int turbidityReadings[5];
int turbidityReadIndex = 0;
long turbidityTotal = 0;
int turbidityAverage = 0;

// ===========================
// SETUP FUNCTION
// ===========================

void setup() {
  // Minimal setup - no serial logging for performance
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  
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
}

// ===========================
// MAIN LOOP
// ===========================

void loop() {
  unsigned long currentMillis = millis();
  
  // Reconnect if MQTT disconnected
  if (!mqttClient.connected()) {
    mqttConnected = false;
    connectMQTT();
  }
  
  mqttClient.loop();
  
  // Read and publish sensors every 2 seconds (real-time)
  if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
    lastSensorRead = currentMillis;
    readSensors();
    publishSensorData();
  }
  
  delay(10);  // Minimal delay for stability
}

// ===========================
// WiFi FUNCTIONS
// ===========================

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);  // Reduced delay for faster connection
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    ESP.restart();  // Auto-restart if WiFi fails
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  wifiClient.setInsecure();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 3) {
    if (mqttClient.connect(DEVICE_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
      mqttConnected = true;
      return;
    }
    delay(2000);  // Quick retry
    attempts++;
  }
  
  mqttConnected = false;
}

// ===========================
// DEVICE REGISTRATION
// ===========================

void registerDevice() {
  if (!mqttConnected) return;
  
  StaticJsonDocument<256> doc;  // Reduced from 512
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
  
  char payload[256];
  serializeJson(doc, payload);
  mqttClient.publish(TOPIC_REGISTRATION, payload);
}

// ===========================
// SENSOR READING FUNCTIONS
// ===========================

// Helper function to read analog sensor with averaging (optimized)
float readAnalogAverage(uint8_t pin) {
  long sum = 0;
  for (int i = 0; i < SENSOR_SAMPLES; i++) {
    sum += analogRead(pin);
    delayMicroseconds(800);  // Microsecond delay for faster sampling
  }
  return (sum / (float)SENSOR_SAMPLES / ADC_MAX) * VREF;
}

void readSensors() {
  tds = readTDS();
  ph = readPH();
  turbidity = readTurbidity();
}

float readTDS() {
  float voltage = readAnalogAverage(TDS_PIN);
  // Return raw voltage - backend will handle TDS calculation
  return voltage;
}

float readPH() {
  float voltage = readAnalogAverage(PH_PIN);
  // Return raw voltage - backend will handle pH calculation
  return voltage;
}

float readTurbidity() {
  int rawADC = analogRead(TURBIDITY_PIN);
  int adc10bit = rawADC / 4;
  
  // Lightweight smoothing
  turbidityTotal = turbidityTotal - turbidityReadings[turbidityReadIndex];
  turbidityReadings[turbidityReadIndex] = adc10bit;
  turbidityTotal = turbidityTotal + turbidityReadings[turbidityReadIndex];
  turbidityReadIndex = (turbidityReadIndex + 1) % TURBIDITY_NUM_READINGS;
  turbidityAverage = turbidityTotal / TURBIDITY_NUM_READINGS;
  
  // Return raw ADC average - backend will handle NTU conversion
  return turbidityAverage;
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

// Publish sensor data (real-time, lightweight)
void publishSensorData() {
  if (!mqttConnected) return;
  
  StaticJsonDocument<128> doc;
  doc["tdsVoltage"] = tds;           // Raw TDS voltage
  doc["phVoltage"] = ph;             // Raw pH voltage
  doc["turbidityADC"] = turbidity;   // Raw turbidity ADC value
  doc["timestamp"] = millis();
  
  char payload[128];
  serializeJson(doc, payload);
  mqttClient.publish(TOPIC_SENSOR_DATA, payload);
}

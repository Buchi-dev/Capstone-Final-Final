/*
 * Water Quality Monitoring System - 24/7 PRODUCTION VERSION
 * Arduino UNO R4 WiFi with MQTT + Stability Enhancements
 * Optimized for continuous operation with error recovery
 * 
 * Firmware: v6.1.0 - Production Stable
 */

#include <WiFiS3.h>
#include <WiFiSSLClient.h>  // ADDED: For secure MQTT
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "Arduino_LED_Matrix.h"

// ===========================
// CONFIGURATION
// ===========================

// USER MODES
bool sendToServer = true;
bool isCalibrationMode = false;

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"

// MQTT Broker Configuration - HiveMQ Cloud
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883  // TLS port
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"

// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "6.1.0"

// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// Timing Configuration - Optimized for stability
#define SENSOR_READ_INTERVAL 5000      // CHANGED: 5s for stability
#define MQTT_PUBLISH_INTERVAL 5000
#define REGISTRATION_INTERVAL 10000    // CHANGED: 10s intervals
#define MQTT_RECONNECT_INTERVAL 10000  // CHANGED: 10s retry
#define STATUS_UPDATE_INTERVAL 60000   // CHANGED: Every 60s
#define WATCHDOG_RESET_INTERVAL 30000  // ADDED: Reset watchdog every 30s
#define MEMORY_CHECK_INTERVAL 300000   // ADDED: Check memory every 5 min

// 24/7 Operation Settings
#define MAX_MQTT_FAILURES 5            // ADDED: Max consecutive failures
#define MAX_WIFI_FAILURES 3            // ADDED: Max WiFi failures before reboot
#define REBOOT_AFTER_HOURS 168         // ADDED: Auto-reboot after 7 days
#define MIN_FREE_MEMORY 1024           // ADDED: Minimum free RAM threshold

// ===========================
// CALIBRATION DATA
// ===========================

const int CALIB_COUNT = 4;
const int calibADC[CALIB_COUNT] = {105, 116, 224, 250};
const float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};

const int PH_CALIB_COUNT = 3;
const int phCalibADC[PH_CALIB_COUNT] = {482, 503, 532};
const float phCalibPH[PH_CALIB_COUNT] = {9.81, 6.81, 4.16};

const float TDS_CALIBRATION_FACTOR = 0.589;
const float TDS_OFFSET = 0.0;

// ===========================
// SMA SMOOTHING BUFFERS
// ===========================

const int SMA_SIZE = 8;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;

const int TURB_SMA_SIZE = 5;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

const int PH_SMA_SIZE = 5;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

float fitSlope = 0.0;
float fitIntercept = 0.0;

// ===========================
// GLOBAL OBJECTS - WITH SSL SUPPORT
// ===========================
WiFiSSLClient wifiSSLClient;  // CHANGED: Use SSL client for port 8883
PubSubClient mqttClient(wifiSSLClient);
ArduinoLEDMatrix matrix;

// ===========================
// GLOBAL VARIABLES
// ===========================
unsigned long lastSensorRead = 0;
unsigned long lastMqttPublish = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastMqttReconnect = 0;
unsigned long lastStatusUpdate = 0;
unsigned long lastWatchdogReset = 0;     // ADDED
unsigned long lastMemoryCheck = 0;       // ADDED
unsigned long bootTime = 0;              // ADDED

bool isRegistered = false;
bool isApproved = false;
bool mqttConnected = false;
bool connectionActive = false;  // FIXED: Added missing variable

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

int consecutiveFailures = 0;
int consecutiveMqttFailures = 0;  // ADDED
int consecutiveWifiFailures = 0;  // ADDED
const int MAX_FAILURES = 3;

// MQTT Topics
String topicData = "devices/" + String(DEVICE_ID) + "/data";
String topicStatus = "devices/" + String(DEVICE_ID) + "/status";
String topicRegister = "devices/" + String(DEVICE_ID) + "/register";
String topicCommands = "devices/" + String(DEVICE_ID) + "/commands";

enum MatrixState {
  CONNECTING,
  IDLE,
  HEARTBEAT,
  MQTT_CONNECTING,
  ERROR_STATE  // ADDED
};

MatrixState matrixState = CONNECTING;
MatrixState previousState = CONNECTING;

// ===========================
// SETUP FUNCTION - ENHANCED
// ===========================
void setup() {
  Serial.begin(115200);
  delay(2000);  // ADDED: Wait for serial
  
  bootTime = millis();

  Serial.println("\n\n=== Arduino UNO R4 - 24/7 PRODUCTION ===");
  Serial.println("Firmware: v6.1.0 - Stability Optimized");
  Serial.print("Boot Time: ");
  Serial.println(bootTime);
  
  // Initialize LED Matrix
  matrix.begin();
  matrix.loadSequence(LEDMATRIX_ANIMATION_STARTUP);
  matrix.play(false);
  
  while (!matrix.sequenceDone()) {
    delay(50);
  }

  // Initialize sensor pins
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  // Initialize buffers to zero
  for (int i = 0; i < SMA_SIZE; i++) smaBuffer[i] = 0;
  for (int i = 0; i < PH_SMA_SIZE; i++) phBuffer[i] = 0;
  for (int i = 0; i < TURB_SMA_SIZE; i++) turbBuffer[i] = 0;

  computeCalibrationParams();
  printCalibrationInfo();

  // MQTT Client Configuration - ENHANCED
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);           // Keep-alive packets
  mqttClient.setSocketTimeout(30);       // Socket timeout
  mqttClient.setBufferSize(512);         // ADDED: Increase buffer for JSON

  Serial.println("\n=== MQTT Configuration ===");
  Serial.print("Broker: ");
  Serial.println(MQTT_BROKER);
  Serial.print("Port: ");
  Serial.print(MQTT_PORT);
  Serial.println(" (TLS)");
  Serial.print("Client ID: ");
  Serial.println(MQTT_CLIENT_ID);

  // WiFi and MQTT connection
  matrixState = CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);

  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED) {
    connectMQTT();
    
    if (mqttConnected) {
      matrixState = IDLE;
      matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
    }
  }

  Serial.println("\n=== DEVICE MODES ===");
  Serial.print("Send to Server: ");
  Serial.println(sendToServer ? "ENABLED" : "DISABLED");
  Serial.print("Calibration Mode: ");
  Serial.println(isCalibrationMode ? "ENABLED" : "DISABLED");
  Serial.print("Auto-reboot after: ");
  Serial.print(REBOOT_AFTER_HOURS);
  Serial.println(" hours");
  
  if (!isCalibrationMode && sendToServer) {
    delay(2000);
    sendRegistration();
  }

  Serial.println("\n=== System Ready for 24/7 Operation ===\n");
}

// ===========================
// MAIN LOOP - OPTIMIZED
// ===========================
void loop() {
  unsigned long currentMillis = millis();

  // Check for uptime-based reboot (prevent long-term drift)
  checkAutoReboot(currentMillis);

  // Periodic memory check
  if (currentMillis - lastMemoryCheck >= MEMORY_CHECK_INTERVAL) {
    lastMemoryCheck = currentMillis;
    checkMemoryHealth();
  }

  // Software watchdog (reset periodically)
  if (currentMillis - lastWatchdogReset >= WATCHDOG_RESET_INTERVAL) {
    lastWatchdogReset = currentMillis;
    resetWatchdog();
  }

  // Dynamic timing
  unsigned long readInterval = isCalibrationMode ? 250 : SENSOR_READ_INTERVAL;

  updateMatrixState();

  // WiFi connection management - ENHANCED
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
    return;  // Skip rest of loop
  } else {
    consecutiveWifiFailures = 0;  // Reset on success
    connectionActive = true;
  }

  // MQTT connection management - ENHANCED
  if (!mqttClient.connected()) {
    mqttConnected = false;
    connectionActive = false;
    
    if (currentMillis - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL) {
      lastMqttReconnect = currentMillis;
      connectMQTT();
    }
  } else {
    mqttClient.loop();  // Process incoming messages
    consecutiveMqttFailures = 0;  // Reset on success
  }

  // Registration vs Active mode
  if (!isApproved && sendToServer && !isCalibrationMode) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      sendRegistration();
    }
  } else {
    // Sensor reading logic
    if (currentMillis - lastSensorRead >= readInterval) {
      lastSensorRead = currentMillis;

      if (!isCalibrationMode) {
        Serial.println("--- Reading Sensors ---");
        if (matrixState == IDLE) {
          matrixState = HEARTBEAT;
          matrix.loadSequence(LEDMATRIX_ANIMATION_HEARTBEAT_LINE);
          matrix.play(false);
        }
      }

      readSensors();

      // Publish data
      if (sendToServer && !isCalibrationMode && mqttConnected) {
        publishSensorDataMQTT();
      }
    }

    // Periodic status updates
    if (sendToServer && !isCalibrationMode && mqttConnected) {
      if (currentMillis - lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
        lastStatusUpdate = currentMillis;
        sendStatusUpdate();
      }
    }
  }

  delay(10);  // Small delay for stability
}

// ===========================
// 24/7 OPERATION FUNCTIONS
// ===========================

void checkAutoReboot(unsigned long currentMillis) {
  unsigned long uptimeHours = (currentMillis - bootTime) / 3600000UL;
  
  if (uptimeHours >= REBOOT_AFTER_HOURS) {
    Serial.println("\n!!! AUTO-REBOOT TRIGGERED !!!");
    Serial.print("Uptime: ");
    Serial.print(uptimeHours);
    Serial.println(" hours");
    Serial.println("Rebooting in 5 seconds...");
    
    delay(5000);
    
    // Arduino UNO R4 software reset
    NVIC_SystemReset();  // ARM Cortex reset
  }
}

void checkMemoryHealth() {
  // Note: Arduino UNO R4 doesn't have freeMemory() built-in
  // This is a placeholder for monitoring
  Serial.println("--- Memory Health Check ---");
  Serial.print("Uptime: ");
  Serial.print((millis() - bootTime) / 1000);
  Serial.println(" seconds");
  Serial.print("WiFi Failures: ");
  Serial.println(consecutiveWifiFailures);
  Serial.print("MQTT Failures: ");
  Serial.println(consecutiveMqttFailures);
  
  // If too many failures, force reconnection
  if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
    Serial.println("!!! Too many MQTT failures - forcing reconnect !!!");
    mqttClient.disconnect();
    delay(1000);
    connectMQTT();
    consecutiveMqttFailures = 0;
  }
}

void resetWatchdog() {
  // Software watchdog - monitor system health
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Watchdog: WiFi disconnected");
  }
  
  if (!mqttClient.connected() && sendToServer) {
    Serial.println("⚠️ Watchdog: MQTT disconnected");
  }
  
  // Print periodic heartbeat
  Serial.print("♥ Watchdog OK | Uptime: ");
  Serial.print((millis() - bootTime) / 1000);
  Serial.println("s");
}

// ===========================
// WIFI FUNCTIONS - ENHANCED
// ===========================

void connectWiFi() {
  Serial.println("\n--- Connecting to WiFi ---");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect();
  delay(500);  // Increased delay
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {  // CHANGED: 40 attempts = 20s
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n✗ WiFi connection failed!");
    consecutiveWifiFailures++;
    
    // Force reboot after max failures
    if (consecutiveWifiFailures >= MAX_WIFI_FAILURES) {
      Serial.println("!!! MAX WIFI FAILURES - REBOOTING !!!");
      delay(5000);
      NVIC_SystemReset();
    }
    
    delay(5000);
    return;
  }

  Serial.println("\n✓ WiFi connected!");
  consecutiveWifiFailures = 0;
  
  // Wait for valid IP
  attempts = 0;
  while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
    delay(500);
    attempts++;
  }
  
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  
  connectionActive = true;
}

void handleWiFiDisconnection() {
  consecutiveWifiFailures++;
  connectionActive = false;
  mqttConnected = false;
  
  if (matrixState != CONNECTING) {
    Serial.println("\n⚠️ WiFi connection lost!");
    Serial.print("Consecutive failures: ");
    Serial.println(consecutiveWifiFailures);
    
    matrixState = CONNECTING;
    matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
    matrix.play(true);
  }
  
  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED) {
    consecutiveWifiFailures = 0;
    delay(2000);  // ADDED: Wait before MQTT connection
    connectMQTT();
  }
}

// ===========================
// MQTT FUNCTIONS - ENHANCED
// ===========================

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ Cannot connect MQTT - WiFi down");
    return;
  }

  if (mqttClient.connected()) {
    mqttConnected = true;
    return;
  }

  Serial.println("\n--- Connecting to MQTT ---");
  Serial.print("Broker: ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  matrixState = MQTT_CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);

  // Attempt connection with credentials
  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    topicStatus.c_str(),  // Last Will topic
    0,                     // Last Will QoS
    true,                  // Last Will retain
    "{\"status\":\"offline\",\"reason\":\"disconnect\"}"  // Last Will message
  );

  if (connected) {
    Serial.println("✓ MQTT Connected!");
    mqttConnected = true;
    consecutiveMqttFailures = 0;
    consecutiveFailures = 0;

    // Subscribe to commands
    if (mqttClient.subscribe(topicCommands.c_str(), 0)) {  // QoS 0
      Serial.print("✓ Subscribed to: ");
      Serial.println(topicCommands);
    } else {
      Serial.println("✗ Failed to subscribe");
    }

    if (matrixState == MQTT_CONNECTING) {
      matrixState = IDLE;
      matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
    }
    
    // Send online status immediately
    sendStatusUpdate();
    
  } else {
    Serial.print("✗ MQTT Failed, rc=");
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    consecutiveFailures++;
  }
}

void printMqttError(int state) {
  switch (state) {
    case -4: Serial.println("  MQTT_CONNECTION_TIMEOUT"); break;
    case -3: Serial.println("  MQTT_CONNECTION_LOST"); break;
    case -2: Serial.println("  MQTT_CONNECT_FAILED"); break;
    case -1: Serial.println("  MQTT_DISCONNECTED"); break;
    case 1: Serial.println("  MQTT_CONNECT_BAD_PROTOCOL"); break;
    case 2: Serial.println("  MQTT_CONNECT_BAD_CLIENT_ID"); break;
    case 3: Serial.println("  MQTT_CONNECT_UNAVAILABLE"); break;
    case 4: Serial.println("  MQTT_CONNECT_BAD_CREDENTIALS"); break;
    case 5: Serial.println("  MQTT_CONNECT_UNAUTHORIZED"); break;
    default: Serial.println("  UNKNOWN_ERROR"); break;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.println("\n--- MQTT Message Received ---");
  Serial.print("Topic: ");
  Serial.println(topic);

  // Convert payload to string
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';

  Serial.print("Payload: ");
  Serial.println(message);

  // Parse JSON - OPTIMIZED with error handling
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("✗ JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }

  const char* command = doc["command"];
  
  if (command == nullptr) {
    Serial.println("✗ No command field in message");
    return;
  }

  Serial.print("Command: ");
  Serial.println(command);

  // Process commands
  if (strcmp(command, "go") == 0) {
    Serial.println("🎉 GO command received!");
    isRegistered = true;
    isApproved = true;
    
  } else if (strcmp(command, "deregister") == 0) {
    Serial.println("⚠️ DEREGISTER command!");
    isRegistered = false;
    isApproved = false;
    
  } else if (strcmp(command, "wait") == 0) {
    Serial.println("⏳ WAIT command");
    isRegistered = true;
    isApproved = false;
    
  } else if (strcmp(command, "restart") == 0) {
    Serial.println("🔄 RESTART command received!");
    delay(1000);
    NVIC_SystemReset();  // System reset
    
  } else if (strcmp(command, "calibrate") == 0) {
    Serial.println("🔧 CALIBRATE command");
    isCalibrationMode = true;
    
  } else if (strcmp(command, "stop_calibrate") == 0) {
    Serial.println("✓ Stop calibration");
    isCalibrationMode = false;
    
  } else {
    Serial.print("⚠️ Unknown command: ");
    Serial.println(command);
  }
}

// ===========================
// MQTT PUBLISH FUNCTIONS - ENHANCED
// ===========================

void publishSensorDataMQTT() {
  if (!mqttClient.connected()) {
    Serial.println("✗ MQTT not connected");
    consecutiveMqttFailures++;
    return;
  }

  // Create JSON payload - OPTIMIZED
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";

  String payload;
  serializeJson(doc, payload);

  Serial.println("--- Publishing Sensor Data ---");
  Serial.println(payload);

  // Publish with QoS 0 for speed
  bool published = mqttClient.publish(topicData.c_str(), payload.c_str(), false);

  if (published) {
    Serial.println("✓ Data published!");
    consecutiveFailures = 0;
    consecutiveMqttFailures = 0;
  } else {
    Serial.println("✗ Publish failed!");
    consecutiveFailures++;
    consecutiveMqttFailures++;
    
    // Try to reconnect after failures
    if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
      Serial.println("!!! Too many failures - reconnecting MQTT !!!");
      mqttClient.disconnect();
      delay(1000);
      connectMQTT();
    }
  }
}

void sendRegistration() {
  if (!mqttClient.connected()) {
    Serial.println("✗ MQTT not connected - cannot register");
    return;
  }

  Serial.println("\n--- Sending Registration ---");

  StaticJsonDocument<512> doc;  // INCREASED size for registration
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = millis();
  doc["messageType"] = "registration";
  doc["uptime"] = (millis() - bootTime) / 1000;

  // MAC Address
  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
           macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  JsonArray sensorsArray = doc.createNestedArray("sensors");
  sensorsArray.add("pH");
  sensorsArray.add("turbidity");
  sensorsArray.add("tds");

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  // Publish with QoS 1 and retain for registration
  if (mqttClient.publish(topicRegister.c_str(), payload.c_str(), true)) {
    Serial.println("✓ Registration sent!");
  } else {
    Serial.println("✗ Registration failed!");
  }
}

void sendStatusUpdate() {
  if (!mqttClient.connected()) {
    return;
  }

  Serial.println("--- Sending Status ---");

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["status"] = "online";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["messageType"] = "device_status";
  doc["isApproved"] = isApproved;
  doc["mqttFailures"] = consecutiveMqttFailures;

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  if (mqttClient.publish(topicStatus.c_str(), payload.c_str(), false)) {
    Serial.println("✓ Status sent!");
  } else {
    Serial.println("✗ Status failed!");
  }
}

// ===========================
// CALIBRATION FUNCTIONS (UNCHANGED)
// ===========================

void computeCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    meanX += (float)calibADC[i];
    meanY += calibPPM[i];
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;
  
  float num = 0.0, den = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    float dx = (float)calibADC[i] - meanX;
    float dy = calibPPM[i] - meanY;
    num += dx * dy;
    den += dx * dx;
  }
  
  if (den != 0.0) {
    fitSlope = num / den;
    fitIntercept = meanY - fitSlope * meanX;
  }
}

void printCalibrationInfo() {
  Serial.println("\n=== CALIBRATION INFO ===");
  Serial.print("TDS Slope: ");
  Serial.println(fitSlope, 4);
  Serial.print("TDS Intercept: ");
  Serial.println(fitIntercept, 2);
  Serial.print("TDS Factor: ");
  Serial.println(TDS_CALIBRATION_FACTOR, 3);
  Serial.println("========================\n");
}

float adcToPPM(int adc) {
  if (CALIB_COUNT <= 0) return 0.0;

  for (int i = 0; i < CALIB_COUNT; i++) {
    if (adc == calibADC[i]) return calibPPM[i];
  }

  for (int i = 0; i < CALIB_COUNT - 1; i++) {
    int x0 = calibADC[i];
    int x1 = calibADC[i + 1];
    if (adc > x0 && adc < x1) {
      float y0 = calibPPM[i];
      float y1 = calibPPM[i + 1];
      float slope = (y1 - y0) / (float)(x1 - x0);
      return y0 + slope * (adc - x0);
    }
  }

  if (adc < calibADC[0] && CALIB_COUNT >= 2) {
    float slope = (calibPPM[1] - calibPPM[0]) / (float)(calibADC[1] - calibADC[0]);
    return calibPPM[0] + slope * (adc - calibADC[0]);
  }

  if (adc > calibADC[CALIB_COUNT - 1] && CALIB_COUNT >= 2) {
    int last = CALIB_COUNT - 1;
    float slope = (calibPPM[last] - calibPPM[last - 1]) / (float)(calibADC[last] - calibADC[last - 1]);
    return calibPPM[last] + slope * (adc - calibADC[last]);
  }

  return fitSlope * (float)adc + fitIntercept;
}

float adcToPH(int adc) {
  if (PH_CALIB_COUNT <= 0) return 7.0;

  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    if (adc == phCalibADC[i]) return phCalibPH[i];
  }

  for (int i = 0; i < PH_CALIB_COUNT - 1; i++) {
    int x0 = phCalibADC[i];
    int x1 = phCalibADC[i + 1];
    if (adc >= x0 && adc <= x1) {
      float y0 = phCalibPH[i];
      float y1 = phCalibPH[i + 1];
      float slope = (y1 - y0) / (float)(x1 - x0);
      return y0 + slope * (adc - x0);
    }
  }

  if (adc < phCalibADC[0] && PH_CALIB_COUNT >= 2) {
    float slope = (phCalibPH[1] - phCalibPH[0]) / (float)(phCalibADC[1] - phCalibADC[0]);
    return phCalibPH[0] + slope * (adc - phCalibADC[0]);
  }

  if (adc > phCalibADC[PH_CALIB_COUNT - 1] && PH_CALIB_COUNT >= 2) {
    int last = PH_CALIB_COUNT - 1;
    float slope = (phCalibPH[last] - phCalibPH[last - 1]) / (float)(phCalibADC[last] - phCalibADC[last - 1]);
    return phCalibPH[last] + slope * (adc - phCalibADC[last]);
  }

  return 7.0;
}

float calculateTurbidityNTU(int adcValue) {
  float slope = -0.1613;
  float intercept = 27.74;
  float ntu = slope * (float)adcValue + intercept;
  return (ntu < 0) ? 0 : ntu;
}

String getTurbidityStatus(float ntu) {
  return (ntu < 35.0) ? "Very Clean" : "Very Cloudy";
}

void updateMatrixState() {
  if (matrixState == HEARTBEAT && matrix.sequenceDone()) {
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
  }
  
  if (matrixState != previousState) {
    previousState = matrixState;
  }
}

// ===========================
// SENSOR READING (UNCHANGED)
// ===========================

void readSensors() {
  int value0 = analogRead(TDS_PIN);
  int value1 = analogRead(PH_PIN);
  int value2 = analogRead(TURBIDITY_PIN);

  // Update smoothing buffers
  phSum -= phBuffer[phIndex];
  phBuffer[phIndex] = value1;
  phSum += phBuffer[phIndex];
  phIndex = (phIndex + 1) % PH_SMA_SIZE;
  if (phCount < PH_SMA_SIZE) phCount++;

  turbSum -= turbBuffer[turbIndex];
  turbBuffer[turbIndex] = value2;
  turbSum += turbBuffer[turbIndex];
  turbIndex = (turbIndex + 1) % TURB_SMA_SIZE;
  if (turbCount < TURB_SMA_SIZE) turbCount++;

  smaSum -= smaBuffer[smaIndex];
  smaBuffer[smaIndex] = value0;
  smaSum += smaBuffer[smaIndex];
  smaIndex = (smaIndex + 1) % SMA_SIZE;
  if (smaCount < SMA_SIZE) smaCount++;

  int averagedADC = smaSum / max(1, smaCount);
  int averagedTurbADC = turbSum / max(1, turbCount);
  int averagedPHADC = phSum / max(1, phCount);

  float voltage = (float)averagedADC * (5.0 / 16383.0);
  float ppm = adcToPPM(averagedADC);
  float calibratedPPM = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;
  float phValue = adcToPH(averagedPHADC);

  if (phValue < 0.0) phValue = 0.0;
  if (phValue > 14.0) phValue = 14.0;

  int turbADC10bit = averagedTurbADC / 16;
  float ntu = calculateTurbidityNTU(turbADC10bit);

  tds = calibratedPPM;
  ph = phValue;
  turbidity = ntu;

  if (!isCalibrationMode) {
    Serial.print("TDS: ");
    Serial.print(calibratedPPM, 1);
    Serial.print(" ppm | pH: ");
    Serial.print(phValue, 2);
    Serial.print(" | Turbidity: ");
    Serial.print(ntu, 2);
    Serial.println(" NTU");
  } else {
    Serial.print("TDS:");
    Serial.print(calibratedPPM, 1);
    Serial.print(" pH:");
    Serial.print(phValue, 2);
    Serial.print(" Turb:");
    Serial.println(ntu, 2);
  }
}

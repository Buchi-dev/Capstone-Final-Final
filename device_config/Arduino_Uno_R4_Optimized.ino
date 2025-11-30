/*
 * Water Quality Monitoring System - CALIBRATED & OPTIMIZED
 * Arduino UNO R4 WiFi with Advanced Sensor Calibration + Direct HTTPS Integration
 * EXPRESS.JS OPTIMIZED VERSION
 * Sensors: TDS (Calibrated), pH (Calibrated), Turbidity (Calibrated)
 * 
 * Author: IoT Water Quality Project - Calibrated Version
 * Date: 2025
 * Firmware: v5.3.0 - Express.js Optimized with Keep-Alive & Connection Pooling
 */

#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include "Arduino_LED_Matrix.h"

// ===========================
// CONFIGURATION
// ===========================

// USER MODES
bool sendToServer = false;          // If false, readings are *not* sent to server
bool isCalibrationMode = true;      // If true, sensor readings every 250ms

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"

// API Server Configuration - HTTPS with Keep-Alive
#define API_SERVER "puretrack-api.onrender.com"
#define API_PORT 443
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "6a8d48a00823c869ad23c27cc34a3d446493cf35d6924d8f9d54e17c4565737a"

// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4 Calibrated"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "5.3.0"

// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// Timing Configuration - Optimized for Express.js
#define SENSOR_READ_INTERVAL 2000
#define HTTP_PUBLISH_INTERVAL 2000
#define HTTP_TIMEOUT 10000              // Reduced to 10s for faster failover
#define REGISTRATION_INTERVAL 5000
#define SSE_RECONNECT_INTERVAL 10000
#define CONNECTION_REUSE_TIMEOUT 30000  // Reuse connection for 30 seconds

// ===========================
// ADVANCED CALIBRATION DATA
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
// GLOBAL OBJECTS - OPTIMIZED
// ===========================
WiFiSSLClient wifiClient;
HttpClient httpClient = HttpClient(wifiClient, API_SERVER, API_PORT);
WiFiSSLClient sseClient;
ArduinoLEDMatrix matrix;

// ===========================
// GLOBAL VARIABLES
// ===========================
unsigned long lastSensorRead = 0;
unsigned long lastHttpPublish = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastSSEReconnect = 0;
unsigned long lastConnectionTime = 0;
unsigned long sensorReadStartTime = 0;

bool isRegistered = false;
bool isApproved = false;
bool sseConnected = false;
String sseBuffer = "";

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

bool serverConnected = false;
int consecutiveFailures = 0;
const int MAX_FAILURES = 3;

// Connection pooling optimization
bool connectionActive = false;
unsigned long connectionStartTime = 0;

enum MatrixState {
  CONNECTING,
  IDLE,
  HEARTBEAT
};

MatrixState matrixState = CONNECTING;
MatrixState previousState = CONNECTING;

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000);

  Serial.println("=== Arduino UNO R4 Express.js Optimized ===");
  Serial.println("Firmware: v5.3.0 - Connection Pooling Enabled");
  
  // Initialize LED Matrix
  matrix.begin();
  matrix.loadSequence(LEDMATRIX_ANIMATION_STARTUP);
  matrix.play(false);
  
  while (!matrix.sequenceDone()) {
    delay(50);
  }

  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  // Initialize buffers
  for (int i = 0; i < SMA_SIZE; i++) smaBuffer[i] = 0;
  for (int i = 0; i < PH_SMA_SIZE; i++) phBuffer[i] = 0;
  for (int i = 0; i < TURB_SMA_SIZE; i++) turbBuffer[i] = 0;

  // Compute calibration parameters
  computeCalibrationParams();

  printCalibrationInfo();

  // Optimize HTTP client settings for Express.js
  httpClient.setTimeout(HTTP_TIMEOUT);
  httpClient.setHttpResponseTimeout(HTTP_TIMEOUT);
  
  Serial.println("HTTP Client optimized for Express.js:");
  Serial.println("  - Keep-Alive enabled");
  Serial.println("  - Connection pooling active");
  Serial.println("  - Timeout: 10 seconds");

  matrixState = CONNECTING;
  matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
  matrix.play(true);

  connectWiFi();
  testServerConnection();

  if (serverConnected) {
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
  }

  Serial.println("\n=== DEVICE MODES ===");
  Serial.print("Send to Server: ");
  Serial.println(sendToServer ? "ENABLED" : "DISABLED");
  Serial.print("Calibration Mode: ");
  Serial.println(isCalibrationMode ? "ENABLED (250ms)" : "DISABLED");
  
  if (!isCalibrationMode && sendToServer) {
    connectSSE();
  }
}

// ===========================
// MAIN LOOP - OPTIMIZED
// ===========================
void loop() {
  unsigned long currentMillis = millis();

  // Dynamic timing based on mode
  unsigned long readInterval = isCalibrationMode ? 250 : SENSOR_READ_INTERVAL;

  updateMatrixState();

  // WiFi connection management
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
    return;
  }

  // SSE processing (only if not in calibration mode)
  if (!isCalibrationMode && sendToServer) {
    if (sseConnected) {
      processSSEMessages();
    } else if (currentMillis - lastSSEReconnect >= SSE_RECONNECT_INTERVAL) {
      lastSSEReconnect = currentMillis;
      connectSSE();
    }
  }

  // Registration mode vs Active mode
  if (!isApproved && sendToServer && !isCalibrationMode) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      sendRegistrationRequest();
    }
  } else {
    // Sensor reading logic
    if (currentMillis - lastSensorRead >= readInterval) {
      lastSensorRead = currentMillis;

      if (!isCalibrationMode) {
        Serial.println("--- Reading Sensors (Calibrated) ---");
        if (matrixState == IDLE) {
          matrixState = HEARTBEAT;
          matrix.loadSequence(LEDMATRIX_ANIMATION_HEARTBEAT_LINE);
          matrix.play(false);
        }
      }

      readSensors();

      // Publish data with connection pooling optimization
      if (sendToServer && !isCalibrationMode) {
        publishSensorDataOptimized();
      } else if (!sendToServer) {
        if (!isCalibrationMode) {
          Serial.println("(!) sendToServer=false, local readings only.");
        }
      } else if (isCalibrationMode) {
        // Minimal output in calibration mode for speed
      }
    }
  }

  // Close idle connections to free resources
  manageConnectionPool(currentMillis);

  delay(10);
}

// ===========================
// OPTIMIZED FUNCTIONS
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
  Serial.println("=== CALIBRATION PARAMETERS ===");
  Serial.print("TDS Linear fit: slope=");
  Serial.print(fitSlope, 4);
  Serial.print(" intercept=");
  Serial.println(fitIntercept, 2);
  Serial.print("TDS Factor: ");
  Serial.println(TDS_CALIBRATION_FACTOR, 3);
  Serial.println("================================");
}

void handleWiFiDisconnection() {
  serverConnected = false;
  consecutiveFailures++;
  connectionActive = false;
  
  if (matrixState != CONNECTING) {
    Serial.println("WiFi lost! Reconnecting...");
    matrixState = CONNECTING;
    matrix.loadSequence(LEDMATRIX_ANIMATION_WIFI_SEARCH);
    matrix.play(true);
  }
  
  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED) {
    consecutiveFailures = 0;
    sseConnected = false;
  }
}

void manageConnectionPool(unsigned long currentMillis) {
  // Close connection if idle for too long (Express.js best practice)
  if (connectionActive && (currentMillis - lastConnectionTime > CONNECTION_REUSE_TIMEOUT)) {
    httpClient.stop();
    connectionActive = false;
    if (!isCalibrationMode) {
      Serial.println("Connection pool: Closed idle connection");
    }
  }
}

// ===========================
// OPTIMIZED PUBLISH FUNCTION
// ===========================

void publishSensorDataOptimized() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("✗ WiFi not connected");
    return;
  }

  // Reuse connection if still active (Express.js optimization)
  if (!connectionActive || !wifiClient.connected()) {
    httpClient.stop();
    delay(50);  // Minimal delay
    connectionActive = false;
  }

  // Prepare JSON payload (use stack allocation for efficiency)
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["tds"] = round(tds * 10) / 10.0;        // Round to 1 decimal
  doc["pH"] = round(ph * 100) / 100.0;        // Round to 2 decimals
  doc["turbidity"] = round(turbidity * 10) / 10.0;

  String payload;
  serializeJson(doc, payload);

  Serial.println("--- Sending to Express.js ---");
  Serial.println(payload);

  // Send request with Keep-Alive headers (Express.js friendly)
  httpClient.beginRequest();
  httpClient.post(API_ENDPOINT);
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("x-api-key", API_KEY);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.3.0");
  httpClient.sendHeader("Content-Length", payload.length());
  httpClient.sendHeader("Connection", "keep-alive");  // Enable keep-alive
  httpClient.sendHeader("Keep-Alive", "timeout=30");  // 30 second timeout
  httpClient.beginBody();
  httpClient.print(payload);
  httpClient.endRequest();

  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();

  lastConnectionTime = millis();
  connectionActive = true;

  if (statusCode == 200 || statusCode == 201) {
    serverConnected = true;
    consecutiveFailures = 0;
    Serial.println("✓ Data published!");
    Serial.print("Response: ");
    Serial.println(response.substring(0, min(100, (int)response.length())));
  } else if (statusCode > 0) {
    serverConnected = false;
    Serial.print("✗ HTTP Error: ");
    Serial.println(statusCode);
    consecutiveFailures++;
  } else {
    serverConnected = false;
    Serial.println("✗ Connection timeout");
    consecutiveFailures++;
    httpClient.stop();
    connectionActive = false;
  }

  // Retry logic
  if (consecutiveFailures >= MAX_FAILURES) {
    Serial.println("Multiple failures - retesting connection");
    httpClient.stop();
    connectionActive = false;
    testServerConnection();
    consecutiveFailures = 0;
  }
}

// ===========================
// LED MATRIX & HELPER FUNCTIONS
// ===========================

void updateMatrixState() {
  if (matrixState == HEARTBEAT && matrix.sequenceDone()) {
    matrixState = IDLE;
    matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
  }
  
  if (matrixState != previousState) {
    previousState = matrixState;
  }
}

void connectWiFi() {
  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect();
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n✗ WiFi failed!");
    delay(5000);
    connectWiFi();
  } else {
    Serial.println("\n✓ WiFi connected!");
    
    // Wait for valid IP
    attempts = 0;
    while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
      delay(500);
      attempts++;
    }
    
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
}

void testServerConnection() {
  Serial.println("Testing Express.js server...");
  
  httpClient.stop();
  delay(100);

  httpClient.beginRequest();
  httpClient.get("/health");
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.3.0");
  httpClient.sendHeader("Connection", "close");
  httpClient.endRequest();

  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();

  Serial.print("Health check: ");
  Serial.println(statusCode);

  if (statusCode == 200) {
    serverConnected = true;
    Serial.println("✓ Server connected!");
    
    if (matrixState == CONNECTING) {
      matrixState = IDLE;
      matrix.loadFrame(LEDMATRIX_CLOUD_WIFI);
    }
  } else {
    serverConnected = false;
    Serial.print("✗ Server error: ");
    Serial.println(statusCode);
  }

  httpClient.stop();
}

// ===========================
// CALIBRATION FUNCTIONS
// ===========================

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

// ===========================
// SENSOR READING
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

  // Only print detailed output if NOT in calibration mode
  if (!isCalibrationMode) {
    Serial.print("A0(raw): ");
    Serial.print(value0);
    Serial.print(" | A0(avg): ");
    Serial.print(averagedADC);
    Serial.print(" | V: ");
    Serial.print(voltage, 3);
    Serial.print(" | TDS: ");
    Serial.print(calibratedPPM, 1);
    Serial.println(" ppm");

    Serial.print("A1(raw): ");
    Serial.print(value1);
    Serial.print(" | A1(avg): ");
    Serial.print(averagedPHADC);
    Serial.print(" | pH: ");
    Serial.println(phValue, 2);

    Serial.print("A2(raw): ");
    Serial.print(value2);
    Serial.print(" | A2(avg): ");
    Serial.print(averagedTurbADC);
    Serial.print(" | Turbidity: ");
    Serial.print(ntu, 2);
    Serial.print(" NTU | ");
    Serial.println(getTurbidityStatus(ntu));
  } else {
    // Minimal output for calibration mode - fast readings
    Serial.print("TDS:");
    Serial.print(calibratedPPM, 1);
    Serial.print(" pH:");
    Serial.print(phValue, 2);
    Serial.print(" Turb:");
    Serial.println(ntu, 2);
  }
}

// ===========================
// REGISTRATION & SSE FUNCTIONS
// ===========================

void sendRegistrationRequest() {
  if (WiFi.status() != WL_CONNECTED) return;

  Serial.println("--- Registration Request ---");

  httpClient.stop();
  delay(100);

  StaticJsonDocument<384> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  
  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X", 
           macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();

  JsonArray sensorsArray = doc.createNestedArray("sensors");
  sensorsArray.add("pH");
  sensorsArray.add("turbidity");
  sensorsArray.add("tds");

  String payload;
  serializeJson(doc, payload);

  Serial.println(payload);

  httpClient.beginRequest();
  httpClient.post("/api/v1/devices/register");
  httpClient.sendHeader("Host", API_SERVER);
  httpClient.sendHeader("Content-Type", "application/json");
  httpClient.sendHeader("x-api-key", API_KEY);
  httpClient.sendHeader("User-Agent", "Arduino-UNO-R4/5.3.0");
  httpClient.sendHeader("Content-Length", payload.length());
  httpClient.sendHeader("Connection", "close");
  httpClient.beginBody();
  httpClient.print(payload);
  httpClient.endRequest();

  int statusCode = httpClient.responseStatusCode();
  String response = httpClient.responseBody();

  Serial.print("Status: ");
  Serial.println(statusCode);

  if (statusCode == 200 || statusCode == 201) {
    Serial.println("✓ Registration sent!");

    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);

    if (!error) {
      bool registered = responseDoc["data"]["isRegistered"] | false;
      String command = responseDoc["data"]["command"] | "";

      if (registered && command == "go") {
        Serial.println("🎉 Device APPROVED!");
        isRegistered = true;
        isApproved = true;
      } else {
        Serial.println("⏳ Awaiting approval...");
        isRegistered = true;
        isApproved = false;
      }
    }
  } else {
    Serial.print("✗ Registration failed: ");
    Serial.println(statusCode);
  }

  httpClient.stop();
}

void connectSSE() {
  if (WiFi.status() != WL_CONNECTED || sseConnected) return;

  Serial.println("--- Connecting SSE ---");

  sseClient.stop();
  delay(500);

  if (!sseClient.connect(API_SERVER, API_PORT)) {
    Serial.println("✗ SSE connection failed");
    sseConnected = false;
    return;
  }

  String sseEndpoint = "/sse/" + String(DEVICE_ID);

  sseClient.println("GET " + sseEndpoint + " HTTP/1.1");
  sseClient.println("Host: " + String(API_SERVER));
  sseClient.println("x-api-key: " + String(API_KEY));
  sseClient.println("Accept: text/event-stream");
  sseClient.println("Cache-Control: no-cache");
  sseClient.println("Connection: keep-alive");
  sseClient.println();

  unsigned long timeout = millis() + 10000;
  while (sseClient.available() == 0 && millis() < timeout) {
    delay(100);
  }

  if (sseClient.available() == 0) {
    Serial.println("✗ SSE timeout");
    sseClient.stop();
    sseConnected = false;
    return;
  }

  bool headersValid = false;
  while (sseClient.available()) {
    String line = sseClient.readStringUntil('\n');
    if (line.indexOf("text/event-stream") >= 0) {
      headersValid = true;
    }
    if (line == "\r" || line.length() == 0) break;
  }

  if (headersValid) {
    Serial.println("✓ SSE connected!");
    sseConnected = true;
    sseBuffer = "";
  } else {
    Serial.println("✗ Invalid SSE response");
    sseClient.stop();
    sseConnected = false;
  }
}

void processSSEMessages() {
  if (!sseConnected || !sseClient.connected()) {
    Serial.println("SSE disconnected");
    sseConnected = false;
    sseClient.stop();
    return;
  }

  while (sseClient.available()) {
    char c = sseClient.read();

    if (c == '\n') {
      if (sseBuffer.startsWith("event: ")) {
        String eventType = sseBuffer.substring(7);
        eventType.trim();
        Serial.println("SSE Event: " + eventType);
      } 
      else if (sseBuffer.startsWith("data: ")) {
        String eventData = sseBuffer.substring(6);
        eventData.trim();
        Serial.println("SSE Data: " + eventData);

        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, eventData);

        if (!error) {
          String command = doc["command"] | "";

          if (command == "go") {
            Serial.println("🎉 GO command received!");
            isRegistered = true;
            isApproved = true;
          } 
          else if (command == "deregister") {
            Serial.println("⚠️ DEREGISTER command!");
            isRegistered = false;
            isApproved = false;
          }
          else if (command == "wait") {
            Serial.println("⏳ WAIT command");
            isRegistered = true;
            isApproved = false;
          }
        }
      }

      sseBuffer = "";
    } else {
      sseBuffer += c;
    }
  }
}

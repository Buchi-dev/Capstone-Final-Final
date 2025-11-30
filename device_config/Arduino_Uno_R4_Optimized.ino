/*
 * Water Quality Monitoring System - 24/7 ULTRA-LEAN VERSION
 * Arduino UNO R4 WiFi - Clock-Synchronized 30 Minute Data Transmission
 * Daily restart at 12:00 AM Philippine Time (16:00 UTC)
 * SSL/TLS ENABLED for HiveMQ Cloud (Port 8883)
 * EEPROM: Persistent registration status
 * Data sends at :00 and :30 minutes every hour (synchronized with clock)
 * FIXED: Presence detection with enhanced logging and error handling
 * 
 * Firmware: v6.8.3 - Production SSL + EEPROM + Clock Sync + Enhanced MQTT Presence
 */

#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>

// ===========================
// CONFIGURATION
// ===========================

// WiFi Credentials
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"

// MQTT Broker Configuration - HiveMQ Cloud (SSL/TLS)
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"

// Device Configuration
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "6.8.3"

// Sensor Pin Configuration
#define TDS_PIN A0
#define PH_PIN A1
#define TURBIDITY_PIN A2

// Timing Configuration
#define SENSOR_READ_INTERVAL 60000      // 1 minute (local monitoring)
#define REGISTRATION_INTERVAL 60000
#define MQTT_RECONNECT_INTERVAL 30000
#define WATCHDOG_INTERVAL 300000
#define NTP_UPDATE_INTERVAL 3600000

// Time Settings - Philippine Time (UTC+8)
#define RESTART_HOUR_UTC 16
#define RESTART_MINUTE 0
#define TIMEZONE_OFFSET_SECONDS 28800
#define MAX_UPTIME_HOURS 25

// 24/7 Operation Settings
#define MAX_MQTT_FAILURES 10
#define MAX_WIFI_FAILURES 3

// EEPROM Settings
#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0xA5B7
#define EEPROM_ADDR_MAGIC 0
#define EEPROM_ADDR_APPROVED 2
#define EEPROM_ADDR_BOOT_COUNT 3

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

const int SMA_SIZE = 5;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;

const int TURB_SMA_SIZE = 3;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

const int PH_SMA_SIZE = 3;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

float fitSlope = 0.0;
float fitIntercept = 0.0;

// ===========================
// GLOBAL OBJECTS
// ===========================
WiFiSSLClient wifiSSLClient;
PubSubClient mqttClient(wifiSSLClient);
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, NTP_UPDATE_INTERVAL);

// ===========================
// GLOBAL VARIABLES
// ===========================
unsigned long lastSensorRead = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastMqttReconnect = 0;
unsigned long lastWatchdog = 0;
unsigned long lastNtpUpdate = 0;
unsigned long bootTime = 0;

bool isApproved = false;
bool mqttConnected = false;
bool timeInitialized = false;
bool restartScheduled = false;

float turbidity = 0.0;
float tds = 0.0;
float ph = 0.0;

int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;

unsigned long transmissionCount = 0;
unsigned long bootCount = 0;

// Clock-based transmission tracking
int lastTransmissionMinute = -1;

// MQTT Topics
String topicData = "devices/" + String(DEVICE_ID) + "/data";
String topicStatus = "devices/" + String(DEVICE_ID) + "/status";
String topicRegister = "devices/" + String(DEVICE_ID) + "/register";
String topicCommands = "devices/" + String(DEVICE_ID) + "/commands";

// MQTT Presence Topics
#define PRESENCE_QUERY_TOPIC "presence/query"
#define PRESENCE_RESPONSE_TOPIC "presence/response"
String topicPresence = "devices/" + String(DEVICE_ID) + "/presence";

// Presence detection variables
bool presenceQueryActive = false;
unsigned long lastPresenceQuery = 0;
const unsigned long PRESENCE_TIMEOUT = 30000; // 30 seconds

// ===========================
// FUNCTION DECLARATIONS
// ===========================
void handlePresenceQuery(String message);
void publishPresenceOnline();

// ===========================
// EEPROM FUNCTIONS
// ===========================

void initEEPROM() {
  Serial.println("\n=== EEPROM Initialization ===");
  
  uint16_t magic = (EEPROM.read(EEPROM_ADDR_MAGIC) << 8) | EEPROM.read(EEPROM_ADDR_MAGIC + 1);
  
  if (magic != EEPROM_MAGIC_NUMBER) {
    Serial.println("First boot - initializing EEPROM");
    
    EEPROM.write(EEPROM_ADDR_MAGIC, (EEPROM_MAGIC_NUMBER >> 8) & 0xFF);
    EEPROM.write(EEPROM_ADDR_MAGIC + 1, EEPROM_MAGIC_NUMBER & 0xFF);
    EEPROM.write(EEPROM_ADDR_APPROVED, 0);
    writeBootCount(0);
    
    isApproved = false;
    bootCount = 0;
    
    Serial.println("EEPROM initialized");
  } else {
    Serial.println("EEPROM valid - reading stored values");
    
    isApproved = EEPROM.read(EEPROM_ADDR_APPROVED) == 1;
    bootCount = readBootCount();
    bootCount++;
    writeBootCount(bootCount);
    
    Serial.print("Approved status: ");
    Serial.println(isApproved ? "YES" : "NO");
    Serial.print("Boot count: ");
    Serial.println(bootCount);
  }
  
  Serial.println("=============================\n");
}

void saveApprovedStatus(bool approved) {
  EEPROM.write(EEPROM_ADDR_APPROVED, approved ? 1 : 0);
  isApproved = approved;
  
  Serial.print("✓ Saved approved status to EEPROM: ");
  Serial.println(approved ? "YES" : "NO");
}

unsigned long readBootCount() {
  unsigned long count = 0;
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT) << 24);
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 1) << 16);
  count |= ((unsigned long)EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 2) << 8);
  count |= EEPROM.read(EEPROM_ADDR_BOOT_COUNT + 3);
  return count;
}

void writeBootCount(unsigned long count) {
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT, (count >> 24) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 1, (count >> 16) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 2, (count >> 8) & 0xFF);
  EEPROM.write(EEPROM_ADDR_BOOT_COUNT + 3, count & 0xFF);
}

void clearEEPROM() {
  Serial.println("Clearing EEPROM...");
  for (int i = 0; i < 50; i++) {
    EEPROM.write(i, 0);
  }
  Serial.println("EEPROM cleared - restart required");
}

// ===========================
// CLOCK-BASED TRANSMISSION
// ===========================

bool isTransmissionTime() {
  if (!timeInitialized) return false;
  
  timeClient.update();
  int currentMinute = timeClient.getMinutes();
  
  // Transmission at :00 and :30 minutes
  bool isScheduledTime = (currentMinute == 0 || currentMinute == 30);
  
  // Check if we haven't already transmitted this minute
  bool notYetTransmitted = (currentMinute != lastTransmissionMinute);
  
  return isScheduledTime && notYetTransmitted;
}

void getNextTransmissionTime(char* buffer) {
  if (!timeInitialized) {
    strcpy(buffer, "Unknown");
    return;
  }
  
  timeClient.update();
  int currentHour = timeClient.getHours();
  int currentMinute = timeClient.getMinutes();
  
  int nextMinute, nextHour;
  
  if (currentMinute < 30) {
    nextMinute = 30;
    nextHour = currentHour;
  } else {
    nextMinute = 0;
    nextHour = (currentHour + 1) % 24;
  }
  
  sprintf(buffer, "%02d:%02d UTC", nextHour, nextMinute);
}

String getNextTransmissionPHTime() {
  if (!timeInitialized) return "Unknown";
  
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int currentHour = (phTime % 86400L) / 3600;
  int currentMinute = (phTime % 3600) / 60;
  
  int nextMinute, nextHour;
  
  if (currentMinute < 30) {
    nextMinute = 30;
    nextHour = currentHour;
  } else {
    nextMinute = 0;
    nextHour = (currentHour + 1) % 24;
  }
  
  char buffer[9];
  sprintf(buffer, "%02d:%02d PH", nextHour, nextMinute);
  return String(buffer);
}

// ===========================
// TIME MANAGEMENT FUNCTIONS
// ===========================

void checkMidnightRestart() {
  if (restartScheduled) return;
  
  timeClient.update();
  
  int currentHourUTC = timeClient.getHours();
  int currentMinuteUTC = timeClient.getMinutes();
  
  if (currentHourUTC == RESTART_HOUR_UTC && currentMinuteUTC == RESTART_MINUTE) {
    
    if (!restartScheduled) {
      restartScheduled = true;
      
      Serial.println("\n=========================================");
      Serial.println("MIDNIGHT RESTART (Philippine Time)");
      Serial.print("UTC Time: ");
      Serial.println(timeClient.getFormattedTime());
      Serial.print("PH Time: ");
      printPhilippineTime();
      Serial.print("Uptime: ");
      Serial.print((millis() - bootTime) / 3600000);
      Serial.println(" hours");
      Serial.print("Boot count: ");
      Serial.println(bootCount);
      Serial.println("Restarting in 5 seconds...");
      Serial.println("Registration status will be preserved");
      Serial.println("=========================================\n");
      
      if (mqttConnected) {
        sendShutdownStatus();
      }
      
      delay(5000);
      NVIC_SystemReset();
    }
  } else {
    if (currentMinuteUTC > 1) {
      restartScheduled = false;
    }
  }
}

void printCurrentTime() {
  Serial.print("UTC Time: ");
  Serial.println(timeClient.getFormattedTime());
  
  Serial.print("PH Time:  ");
  printPhilippineTime();
  
  int currentHourUTC = timeClient.getHours();
  int hoursUntilRestart;
  
  if (currentHourUTC < RESTART_HOUR_UTC) {
    hoursUntilRestart = RESTART_HOUR_UTC - currentHourUTC;
  } else {
    hoursUntilRestart = 24 - currentHourUTC + RESTART_HOUR_UTC;
  }
  
  int minutesUntilRestart = (60 - timeClient.getMinutes()) % 60;
  
  Serial.print("Next restart: ");
  Serial.print(hoursUntilRestart);
  Serial.print("h ");
  Serial.print(minutesUntilRestart);
  Serial.println("m");
}

void printPhilippineTime() {
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int hours = (phTime % 86400L) / 3600;
  int minutes = (phTime % 3600) / 60;
  int seconds = phTime % 60;
  
  char timeStr[9];
  sprintf(timeStr, "%02d:%02d:%02d", hours, minutes, seconds);
  Serial.println(timeStr);
}

String getPhilippineTimeString() {
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int hours = (phTime % 86400L) / 3600;
  int minutes = (phTime % 3600) / 60;
  int seconds = phTime % 60;
  
  char timeStr[9];
  sprintf(timeStr, "%02d:%02d:%02d", hours, minutes, seconds);
  return String(timeStr);
}

// ===========================
// WIFI FUNCTIONS
// ===========================

void connectWiFi() {
  Serial.print("WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect();
  delay(500);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    Serial.print(".");
    delay(500);
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi FAILED");
    consecutiveWifiFailures++;
    
    if (consecutiveWifiFailures >= MAX_WIFI_FAILURES) {
      Serial.println("Max WiFi failures - rebooting");
      delay(3000);
      NVIC_SystemReset();
    }
    return;
  }

  Serial.println("\nWiFi OK");
  
  attempts = 0;
  while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
    Serial.print("Waiting for IP");
    delay(500);
    attempts++;
  }
  
  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println("\nNo IP assigned - reconnecting");
    consecutiveWifiFailures++;
    delay(2000);
    connectWiFi();
    return;
  }
  
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("RSSI: ");
  Serial.println(WiFi.RSSI());
  
  consecutiveWifiFailures = 0;
}

void handleWiFiDisconnection() {
  Serial.println("WiFi lost - reconnecting");
  consecutiveWifiFailures++;
  mqttConnected = false;
  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    delay(1000);
    
    if (!timeInitialized) {
      timeClient.update();
      timeInitialized = true;
    }
  }
}

// ===========================
// MQTT FUNCTIONS
// ===========================

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("MQTT: No WiFi");
    return;
  }

  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println("MQTT: No IP address");
    return;
  }

  if (mqttClient.connected()) {
    mqttConnected = true;
    return;
  }

  Serial.println("\n--- MQTT SSL Connection ---");
  Serial.print("Broker: ");
  Serial.println(MQTT_BROKER);
  Serial.print("Port: ");
  Serial.print(MQTT_PORT);
  Serial.println(" (SSL/TLS)");
  Serial.println("Establishing SSL handshake...");

  // Create LWT payload for presence detection
  StaticJsonDocument<256> lwtDoc;
  lwtDoc["deviceId"] = DEVICE_ID;
  lwtDoc["deviceName"] = DEVICE_NAME;
  lwtDoc["status"] = "offline";
  lwtDoc["timestamp"] = "disconnected";
  lwtDoc["reason"] = "unexpected_disconnect";

  String lwtPayload;
  serializeJson(lwtDoc, lwtPayload);

  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    topicPresence.c_str(),  // LWT topic
    1,                     // QoS 1
    true,                  // Retained
    lwtPayload.c_str()     // LWT payload
  );

  if (connected) {
    Serial.println("✓ MQTT SSL Connected!");
    mqttConnected = true;
    consecutiveMqttFailures = 0;

    if (mqttClient.subscribe(topicCommands.c_str(), 0)) {
      Serial.print("✓ Subscribed: ");
      Serial.println(topicCommands);
    }

    // Subscribe to presence query topic
    if (mqttClient.subscribe(PRESENCE_QUERY_TOPIC, 1)) {
      Serial.print("✓ Subscribed: ");
      Serial.println(PRESENCE_QUERY_TOPIC);
    }

    // Publish initial online presence status (retained)
    publishPresenceOnline();
    
  } else {
    Serial.print("✗ MQTT SSL Failed: ");
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    
    if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
      Serial.println("Max MQTT failures - resetting connection");
      mqttClient.disconnect();
      delay(5000);
      consecutiveMqttFailures = 0;
    }
  }
  
  Serial.println("--- End MQTT Connection ---\n");
}

void printMqttError(int state) {
  switch (state) {
    case -4: Serial.println("  SSL_CONNECTION_TIMEOUT"); break;
    case -3: Serial.println("  CONNECTION_LOST"); break;
    case -2: Serial.println("  CONNECT_FAILED"); break;
    case -1: Serial.println("  DISCONNECTED"); break;
    case 1: Serial.println("  BAD_PROTOCOL"); break;
    case 2: Serial.println("  BAD_CLIENT_ID"); break;
    case 3: Serial.println("  UNAVAILABLE"); break;
    case 4: Serial.println("  BAD_CREDENTIALS"); break;
    case 5: Serial.println("  UNAUTHORIZED"); break;
    default: Serial.println("  UNKNOWN"); break;
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("MQTT RX [");
  Serial.print(topic);
  Serial.print("]: ");
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);

  // Handle presence queries FIRST
  String topicStr = String(topic);
  if (topicStr == PRESENCE_QUERY_TOPIC) {
    handlePresenceQuery(message);
    return;  // Exit early after handling presence
  }

  // Handle regular commands
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println("JSON parse error");
    return;
  }

  const char* command = doc["command"];
  
  if (command == nullptr) return;

  if (strcmp(command, "go") == 0) {
    Serial.println("CMD: GO - Device approved!");
    saveApprovedStatus(true);
    lastTransmissionMinute = -1;
    
  } else if (strcmp(command, "deregister") == 0) {
    Serial.println("CMD: DEREGISTER - Approval revoked");
    saveApprovedStatus(false);
    
    Serial.println("Disconnecting MQTT for fresh registration...");
    mqttClient.disconnect();
    delay(2000);
    mqttConnected = false;
    consecutiveMqttFailures = 0;
    lastMqttReconnect = millis() - MQTT_RECONNECT_INTERVAL;
    
  } else if (strcmp(command, "restart") == 0) {
    Serial.println("CMD: RESTART");
    delay(1000);
    NVIC_SystemReset();
    
  } else if (strcmp(command, "send_now") == 0) {
    Serial.println("CMD: SEND NOW");
    lastTransmissionMinute = -1;
    
    if (mqttConnected && isApproved) {
      Serial.println("\n=== MANUAL TX (send_now) ===");
      publishSensorData();
      sendStatusUpdate();
      transmissionCount++;
      Serial.println("=== TX COMPLETE ===\n");
    }
    
  } else if (strcmp(command, "sync_time") == 0) {
    Serial.println("CMD: SYNC TIME");
    timeClient.forceUpdate();
    printCurrentTime();
    
  } else if (strcmp(command, "reset_eeprom") == 0) {
    Serial.println("CMD: RESET EEPROM");
    clearEEPROM();
    delay(2000);
    NVIC_SystemReset();
    
  } else {
    Serial.print("CMD: Unknown - ");
    Serial.println(command);
  }
}

// ===========================
// MQTT PUBLISH FUNCTIONS
// ===========================

void publishSensorData() {
  if (!mqttClient.connected()) {
    Serial.println("MQTT not connected");
    mqttConnected = false;
    return;
  }

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";
  doc["interval"] = "30min_clock_sync";
  doc["transmissionNumber"] = transmissionCount;

  String payload;
  serializeJson(doc, payload);

  Serial.print("Publishing (");
  Serial.print(payload.length());
  Serial.println(" bytes):");
  Serial.println(payload);

  if (mqttClient.publish(topicData.c_str(), payload.c_str(), false)) {
    Serial.println("✓ Published!");
  } else {
    Serial.println("✗ Publish failed!");
    Serial.print("State: ");
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println("State shows connected but publish failed - forcing reconnect");
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    }
    
    consecutiveMqttFailures++;
  }
}

void sendRegistration() {
  if (!mqttClient.connected()) {
    Serial.println("MQTT not connected - cannot register");
    mqttConnected = false;
    return;
  }

  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println("No IP - cannot register");
    return;
  }

  Serial.println("\n--- Device Registration ---");

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["name"] = DEVICE_NAME;
  doc["type"] = DEVICE_TYPE;
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["messageType"] = "registration";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["dataInterval"] = "30min_clock_sync";
  doc["restartSchedule"] = "daily_midnight_ph";
  doc["timezone"] = "Asia/Manila";
  doc["connectionType"] = "SSL/TLS";
  doc["bootCount"] = bootCount;

  uint8_t macRaw[6];
  WiFi.macAddress(macRaw);
  char mac[18];
  snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
           macRaw[0], macRaw[1], macRaw[2], macRaw[3], macRaw[4], macRaw[5]);
  doc["macAddress"] = mac;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  
  if (timeInitialized) {
    doc["utcTime"] = timeClient.getFormattedTime();
    doc["phTime"] = getPhilippineTimeString();
  }

  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("pH");
  sensors.add("turbidity");
  sensors.add("tds");

  String payload;
  serializeJson(doc, payload);

  Serial.print("Size: ");
  Serial.print(payload.length());
  Serial.println(" bytes");
  
  if (payload.length() > 768) {
    Serial.println("✗ Payload too large!");
    return;
  }
  
  Serial.println(payload);

  bool published = mqttClient.publish(topicRegister.c_str(), payload.c_str(), false);

  if (published) {
    Serial.println("✓ Registration sent!");
  } else {
    Serial.println("✗ Registration failed!");
    Serial.print("MQTT state: ");
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println("State shows connected but publish failed - forcing reconnect");
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    } else {
      printMqttError(mqttClient.state());
    }
    
    consecutiveMqttFailures++;
  }
  
  Serial.println("--- End Registration ---\n");
}

void sendStatusUpdate() {
  if (!mqttClient.connected()) {
    return;
  }

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["status"] = "online";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["wifiRSSI"] = WiFi.RSSI();
  doc["firmwareVersion"] = FIRMWARE_VERSION;
  doc["messageType"] = "device_status";
  doc["isApproved"] = isApproved;
  doc["transmissionCount"] = transmissionCount;
  doc["bootCount"] = bootCount;
  
  if (timeInitialized) {
    doc["utcTime"] = timeClient.getFormattedTime();
    doc["phTime"] = getPhilippineTimeString();
    doc["nextTransmission"] = getNextTransmissionPHTime();
  }

  String payload;
  serializeJson(doc, payload);

  mqttClient.publish(topicStatus.c_str(), payload.c_str(), false);
}

void sendShutdownStatus() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  doc["status"] = "restarting";
  doc["reason"] = "scheduled_midnight_ph_time";
  doc["uptime"] = (millis() - bootTime) / 1000;
  doc["messageType"] = "device_status";
  doc["bootCount"] = bootCount;
  
  String payload;
  serializeJson(doc, payload);

  mqttClient.publish(topicStatus.c_str(), payload.c_str(), true);
  delay(500);
}

// ===========================
// MQTT PRESENCE DETECTION FUNCTIONS
// ===========================

/**
 * Handle presence query from server
 */
void handlePresenceQuery(String message) {
  Serial.println("\n=== PRESENCE QUERY RECEIVED ===");
  
  // Parse the query message
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("Failed to parse presence query: ");
    Serial.println(error.c_str());
    return;
  }

  // Check if it's a "who is online?" query
  const char* queryType = doc["query"];
  if (queryType != nullptr && strcmp(queryType, "who_is_online") == 0) {
    presenceQueryActive = true;
    lastPresenceQuery = millis();

    Serial.println("Query type: who_is_online");
    Serial.println("Preparing response...");

    // Respond that we're online
    StaticJsonDocument<300> responseDoc;
    responseDoc["response"] = "i_am_online";
    responseDoc["deviceId"] = DEVICE_ID;
    responseDoc["deviceName"] = DEVICE_NAME;
    responseDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
    responseDoc["firmwareVersion"] = FIRMWARE_VERSION;
    responseDoc["uptime"] = (millis() - bootTime) / 1000;
    responseDoc["isApproved"] = isApproved;
    responseDoc["wifiRSSI"] = WiFi.RSSI();
    
    if (timeInitialized) {
      responseDoc["phTime"] = getPhilippineTimeString();
    }

    String responsePayload;
    serializeJson(responseDoc, responsePayload);

    Serial.print("Response payload: ");
    Serial.println(responsePayload);
    Serial.print("Response size: ");
    Serial.print(responsePayload.length());
    Serial.println(" bytes");

    // Ensure we're still connected
    if (!mqttClient.connected()) {
      Serial.println("✗ MQTT disconnected - cannot respond");
      mqttConnected = false;
      return;
    }

    // Publish response
    bool published = mqttClient.publish(PRESENCE_RESPONSE_TOPIC, responsePayload.c_str(), false);
    
    if (published) {
      Serial.println("✓ Presence response published successfully");
    } else {
      Serial.println("✗ Failed to publish presence response");
      Serial.print("MQTT state: ");
      Serial.println(mqttClient.state());
      printMqttError(mqttClient.state());
    }

    // Also update retained presence status
    publishPresenceOnline();
    
    Serial.println("=== PRESENCE RESPONSE COMPLETE ===\n");
  } else {
    Serial.print("Unknown query type: ");
    Serial.println(queryType != nullptr ? queryType : "null");
  }
}

/**
 * Publish retained online presence status
 */
void publishPresenceOnline() {
  if (!mqttClient.connected()) {
    Serial.println("MQTT not connected - cannot publish presence");
    mqttConnected = false;
    return;
  }

  StaticJsonDocument<256> presenceDoc;
  presenceDoc["deviceId"] = DEVICE_ID;
  presenceDoc["deviceName"] = DEVICE_NAME;
  presenceDoc["status"] = "online";
  presenceDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  presenceDoc["lastResponse"] = millis();
  presenceDoc["firmwareVersion"] = FIRMWARE_VERSION;
  presenceDoc["uptime"] = (millis() - bootTime) / 1000;
  presenceDoc["isApproved"] = isApproved;
  
  if (timeInitialized) {
    presenceDoc["phTime"] = getPhilippineTimeString();
  }

  String presencePayload;
  serializeJson(presenceDoc, presencePayload);

  // Publish with retained flag = true for persistence
  if (mqttClient.publish(topicPresence.c_str(), presencePayload.c_str(), true)) {
    Serial.println("✓ Presence status: online (retained)");
  } else {
    Serial.println("✗ Failed to publish presence status");
    Serial.print("MQTT state: ");
    Serial.println(mqttClient.state());
  }
}

// ===========================
// CALIBRATION FUNCTIONS
// ===========================

void computeCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    meanX += calibADC[i];
    meanY += calibPPM[i];
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;
  
  float num = 0.0, den = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    float dx = calibADC[i] - meanX;
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
  Serial.println("=== CALIBRATION ===");
  Serial.print("Slope: ");
  Serial.println(fitSlope, 3);
  Serial.print("Intercept: ");
  Serial.println(fitIntercept, 2);
  Serial.println("===================");
}

float adcToPPM(int adc) {
  for (int i = 0; i < CALIB_COUNT - 1; i++) {
    if (adc >= calibADC[i] && adc <= calibADC[i + 1]) {
      float slope = (calibPPM[i + 1] - calibPPM[i]) / (float)(calibADC[i + 1] - calibADC[i]);
      return calibPPM[i] + slope * (adc - calibADC[i]);
    }
  }
  return fitSlope * adc + fitIntercept;
}

float adcToPH(int adc) {
  for (int i = 0; i < PH_CALIB_COUNT - 1; i++) {
    if (adc >= phCalibADC[i] && adc <= phCalibADC[i + 1]) {
      float slope = (phCalibPH[i + 1] - phCalibPH[i]) / (float)(phCalibADC[i + 1] - phCalibADC[i]);
      return phCalibPH[i] + slope * (adc - phCalibADC[i]);
    }
  }
  return 7.0;
}

float calculateTurbidityNTU(int adcValue) {
  float ntu = -0.1613 * adcValue + 27.74;
  return (ntu < 0) ? 0 : ntu;
}

// ===========================
// SENSOR READING
// ===========================

void readSensors() {
  int rawTDS = analogRead(TDS_PIN);
  int rawPH = analogRead(PH_PIN);
  int rawTurb = analogRead(TURBIDITY_PIN);

  smaSum -= smaBuffer[smaIndex];
  smaBuffer[smaIndex] = rawTDS;
  smaSum += rawTDS;
  smaIndex = (smaIndex + 1) % SMA_SIZE;
  if (smaCount < SMA_SIZE) smaCount++;

  phSum -= phBuffer[phIndex];
  phBuffer[phIndex] = rawPH;
  phSum += rawPH;
  phIndex = (phIndex + 1) % PH_SMA_SIZE;
  if (phCount < PH_SMA_SIZE) phCount++;

  turbSum -= turbBuffer[turbIndex];
  turbBuffer[turbIndex] = rawTurb;
  turbSum += rawTurb;
  turbIndex = (turbIndex + 1) % TURB_SMA_SIZE;
  if (turbCount < TURB_SMA_SIZE) turbCount++;

  int avgTDS = smaSum / max(1, smaCount);
  int avgPH = phSum / max(1, phCount);
  int avgTurb = turbSum / max(1, turbCount);

  float ppm = adcToPPM(avgTDS);
  tds = (ppm * TDS_CALIBRATION_FACTOR) + TDS_OFFSET;
  
  ph = adcToPH(avgPH);
  if (ph < 0.0) ph = 0.0;
  if (ph > 14.0) ph = 14.0;

  int turb10bit = avgTurb / 16;
  turbidity = calculateTurbidityNTU(turb10bit);

  Serial.print("[");
  if (timeInitialized) {
    Serial.print(getPhilippineTimeString());
    Serial.print(" PH");
  } else {
    Serial.print((millis() - bootTime) / 1000);
    Serial.print("s");
  }
  Serial.print("] TDS:");
  Serial.print(tds, 1);
  Serial.print(" pH:");
  Serial.print(ph, 2);
  Serial.print(" Turb:");
  Serial.println(turbidity, 1);
}

// ===========================
// WATCHDOG
// ===========================

void printWatchdog() {
  Serial.println("\n=== WATCHDOG ===");
  Serial.print("Uptime: ");
  Serial.print((millis() - bootTime) / 3600000);
  Serial.println("h");
  
  Serial.print("Boot count: ");
  Serial.println(bootCount);
  
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  Serial.print("Approved: ");
  Serial.println(isApproved ? "YES" : "NO");
  
  if (timeInitialized) {
    Serial.print("UTC:  ");
    Serial.println(timeClient.getFormattedTime());
    Serial.print("PH:   ");
    Serial.println(getPhilippineTimeString());
    Serial.print("Next TX: ");
    Serial.println(getNextTransmissionPHTime());
    
    int currentHourUTC = timeClient.getHours();
    int hoursUntilRestart;
    
    if (currentHourUTC < RESTART_HOUR_UTC) {
      hoursUntilRestart = RESTART_HOUR_UTC - currentHourUTC;
    } else {
      hoursUntilRestart = 24 - currentHourUTC + RESTART_HOUR_UTC;
    }
    
    Serial.print("Restart in: ");
    Serial.print(hoursUntilRestart);
    Serial.println("h");
  } else {
    Serial.println("Time: Not synced");
  }
  
  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "OK" : "DOWN");
  Serial.print("MQTT SSL: ");
  Serial.println(mqttConnected ? "OK" : "DOWN");
  Serial.print("TX Count: ");
  Serial.println(transmissionCount);
  Serial.println("================\n");
}

// ===========================
// SETUP FUNCTION
// ===========================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  bootTime = millis();

  Serial.println("\n=== Arduino R4 - Clock-Synchronized TX ===");
  Serial.println("Firmware: v6.8.3");
  Serial.print("Boot: ");
  Serial.println(bootTime);
  Serial.println("MQTT: SSL/TLS (Port 8883)");
  Serial.println("Restart: 12:00 AM Philippine Time");
  Serial.println("Data TX: :00 and :30 minutes (clock-synced)");
  Serial.println("FEATURE: Enhanced MQTT Presence Detection");
  
  initEEPROM();
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);

  memset(smaBuffer, 0, sizeof(smaBuffer));
  memset(phBuffer, 0, sizeof(phBuffer));
  memset(turbBuffer, 0, sizeof(turbBuffer));

  computeCalibrationParams();
  printCalibrationInfo();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(90);
  mqttClient.setSocketTimeout(60);
  mqttClient.setBufferSize(768);

  Serial.println("\n=== Connecting... ===");
  
  connectWiFi();
  
  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    
    timeClient.begin();
    delay(1000);
    
    Serial.print("NTP sync");
    for (int i = 0; i < 5; i++) {
      Serial.print(".");
      if (timeClient.update()) {
        timeInitialized = true;
        Serial.println(" OK");
        printCurrentTime();
        break;
      }
      delay(1000);
    }
    
    if (!timeInitialized) {
      Serial.println(" Failed (will retry)");
    }
    
    delay(2000);
    
    connectMQTT();
    
    if (mqttConnected) {
      delay(3000);
      
      if (!isApproved) {
        Serial.println("Device NOT approved - sending registration");
        sendRegistration();
      } else {
        Serial.println("Device already approved - skipping registration");
        sendStatusUpdate();
      }
    }
  }

  Serial.println("\n=== System Ready ===");
  Serial.print("Mode: ");
  Serial.println(isApproved ? "ACTIVE MONITORING" : "WAITING FOR APPROVAL");
  
  if (timeInitialized) {
    Serial.print("Next TX: ");
    Serial.println(getNextTransmissionPHTime());
  }
  
  Serial.println();
}

// ===========================
// MAIN LOOP
// ===========================
void loop() {
  unsigned long currentMillis = millis();

  // Safety fallback
  if ((currentMillis - bootTime) / 3600000UL >= MAX_UPTIME_HOURS) {
    Serial.println("Max uptime - safety restart");
    delay(2000);
    NVIC_SystemReset();
  }

  // Check for midnight restart
  if (timeInitialized) {
    checkMidnightRestart();
  }

  // WiFi management
  if (WiFi.status() != WL_CONNECTED) {
    handleWiFiDisconnection();
    delay(5000);
    return;
  } else {
    consecutiveWifiFailures = 0;
  }

  // Update NTP time periodically
  if (timeInitialized && currentMillis - lastNtpUpdate >= NTP_UPDATE_INTERVAL) {
    lastNtpUpdate = currentMillis;
    timeClient.update();
  }

  // Initialize time if not yet done
  if (!timeInitialized && WiFi.status() == WL_CONNECTED) {
    if (timeClient.update()) {
      timeInitialized = true;
      Serial.println("NTP time synchronized");
      printCurrentTime();
    }
  }

  // MQTT management
  if (!mqttClient.connected()) {
    mqttConnected = false;
    
    // Connect if needed for registration or approaching transmission time
    bool needMqtt = !isApproved;
    
    if (timeInitialized && isApproved) {
      int currentMinute = timeClient.getMinutes();
      // Connect 2 minutes before transmission time
      needMqtt = (currentMinute == 28 || currentMinute == 29 || currentMinute == 58 || currentMinute == 59 || currentMinute == 0 || currentMinute == 30);
    }
    
    if (needMqtt && currentMillis - lastMqttReconnect >= MQTT_RECONNECT_INTERVAL) {
      lastMqttReconnect = currentMillis;
      connectMQTT();
    }
  } else {
    mqttClient.loop();
    consecutiveMqttFailures = 0;
  }

  // Check for presence query timeout
  if (presenceQueryActive && (currentMillis - lastPresenceQuery) > PRESENCE_TIMEOUT) {
    presenceQueryActive = false;
    Serial.println("Presence query timeout");
  }

  // Watchdog heartbeat
  if (currentMillis - lastWatchdog >= WATCHDOG_INTERVAL) {
    lastWatchdog = currentMillis;
    printWatchdog();
  }

  // Registration mode
  if (!isApproved) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      if (mqttConnected) {
        sendRegistration();
      }
    }
  } 
  // Active monitoring mode
  else {
    // Read sensors every 1 minute (local monitoring)
    if (currentMillis - lastSensorRead >= SENSOR_READ_INTERVAL) {
      lastSensorRead = currentMillis;
      readSensors();
      
      if (timeInitialized) {
        Serial.print("Next TX: ");
        Serial.println(getNextTransmissionPHTime());
      }
    }

    // Clock-synchronized data transmission
    if (isTransmissionTime()) {
      Serial.println("\n=== SCHEDULED 30-MIN TX ===");
      Serial.print("Current time: ");
      Serial.println(timeClient.getFormattedTime());
      
      // Ensure MQTT connection
      if (!mqttConnected) {
        connectMQTT();
        delay(3000);
      }
      
      if (mqttConnected) {
        publishSensorData();
        sendStatusUpdate();
        transmissionCount++;
        
        // Mark this minute as transmitted
        lastTransmissionMinute = timeClient.getMinutes();
        
        Serial.print("TX Count: ");
        Serial.println(transmissionCount);
        Serial.print("Next TX: ");
        Serial.println(getNextTransmissionPHTime());
      } else {
        Serial.println("MQTT unavailable - transmission skipped");
      }
      
      Serial.println("=== TX COMPLETE ===\n");
    }
  }

  delay(100);
}

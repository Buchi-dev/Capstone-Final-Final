/*
 * ═══════════════════════════════════════════════════════════════════════════
 *                    WATER QUALITY MONITORING SYSTEM
 *                      Arduino UNO R4 WiFi Edition
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROJECT: PureTrack
 * HARDWARE: Arduino UNO R4 WiFi
 * FIRMWARE VERSION: v7.0.0
 * RELEASE DATE: December 2025
 * AUTHOR: YUZON, Tristan Justine M.
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * DESCRIPTION
 * ───────────────────────────────────────────────────────────────────────────
 * This firmware enables real-time monitoring of water quality parameters using
 * pH, TDS, and Turbidity sensors. Data is transmitted to a remote server via
 * MQTT over SSL/TLS. The device features a web-based WiFi configuration portal,
 * automatic time synchronization, and persistent storage of credentials.
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * KEY FEATURES
 * ───────────────────────────────────────────────────────────────────────────
 * ✓ WiFi Manager - Zero-configuration web portal for WiFi setup
 * ✓ WiFi Persistence - Credentials saved to EEPROM (survives reboots)
 * ✓ Scheduled Data Transmission - Every 30 minutes (:00 and :30)
 * ✓ Server Polling Mode - Responds to "who_is_online" queries
 * ✓ Secure MQTT - SSL/TLS connection (HiveMQ Cloud - Port 8883)
 * ✓ Calibration Mode - Fast 255ms readings for sensor calibration
 * ✓ NTP Time Sync - Philippine Time Zone (UTC+8)
 * ✓ Auto Restart - Daily midnight maintenance restart
 * ✓ Approval System - EEPROM-based device registration
 * ✓ Multi-Sensor - pH, TDS (Total Dissolved Solids), Turbidity
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * HARDWARE CONNECTIONS
 * ───────────────────────────────────────────────────────────────────────────
 * SENSOR          PIN    DESCRIPTION
 * ─────────────────────────────────────────────────────────────────────────
 * pH Sensor       A0     Analog pH measurement (0-14 pH scale)
 * TDS Sensor      A1     Total Dissolved Solids (0-1000+ ppm)
 * Turbidity       A2     Water clarity (0-3000 NTU)
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * WIFI MANAGER SETUP
 * ───────────────────────────────────────────────────────────────────────────
 * FIRST TIME SETUP:
 *   1. Power on the device
 *   2. Device creates WiFi Access Point: "WaterQuality-Setup"
 *   3. Connect to AP with password: "12345678"
 *   4. Open browser and navigate to: http://192.168.4.1
 *   5. Select your WiFi network and enter password
 *   6. Device saves credentials and connects automatically
 * 
 * AFTER REBOOT:
 *   - Device automatically connects using saved credentials
 *   - If connection fails 3 times, WiFi Manager starts again
 *   - Access point times out after 5 minutes if no configuration
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * MQTT TOPICS
 * ───────────────────────────────────────────────────────────────────────────
 * PUBLISHES TO:
 *   • devices/{deviceId}/data        → Sensor readings every 30 min
 *   • devices/{deviceId}/register    → Registration request on boot
 *   • devices/{deviceId}/presence    → Online announcement
 *   • presence/response              → "i_am_online" server poll response
 * 
 * SUBSCRIBES TO:
 *   • devices/{deviceId}/commands    → Server commands (go, restart, etc.)
 *   • presence/query                 → Server "who_is_online" polling
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * MQTT COMMANDS
 * ───────────────────────────────────────────────────────────────────────────
 * COMMAND        DESCRIPTION
 * ─────────────────────────────────────────────────────────────────────────
 * go             Approve device for data transmission
 * deregister     Revoke device approval
 * restart        Restart the device immediately
 * send_now       Force immediate data transmission
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * OPERATING MODES
 * ───────────────────────────────────────────────────────────────────────────
 * CALIBRATION MODE (CALIBRATION_MODE = true):
 *   - Fast sensor readings every 255ms
 *   - No MQTT connection
 *   - Real-time Serial output for calibration
 *   - Use for sensor calibration and testing
 * 
 * NORMAL MODE (CALIBRATION_MODE = false):
 *   - Sensor readings every 60 seconds
 *   - Data transmission every 30 minutes
 *   - Full MQTT connectivity
 *   - Production monitoring mode
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * MEMORY OPTIMIZATIONS
 * ───────────────────────────────────────────────────────────────────────────
 * • F() macro for string constants (~500 bytes RAM saved)
 * • PROGMEM for calibration tables (~100 bytes RAM saved)
 * • Optimized JSON buffers (minimal overhead)
 * • Cached WiFi status checks (reduces API calls)
 * • Simple Moving Average (SMA) for sensor smoothing
 * • Lightweight web portal HTML (minimal processing)
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * EEPROM MEMORY MAP
 * ───────────────────────────────────────────────────────────────────────────
 * ADDRESS   SIZE    DESCRIPTION
 * ─────────────────────────────────────────────────────────────────────────
 * 0-1       2       Magic number validation (0xA5B7)
 * 2         1       Device approval status (0=no, 1=yes)
 * 3-6       4       Boot counter (unsigned long)
 * 7-38      32      WiFi SSID (null-terminated string)
 * 39-102    64      WiFi Password (null-terminated string)
 * 103       1       WiFi credentials saved flag (0=no, 1=yes)
 * 
 * ─────────────────────────────────────────────────────────────────────────── 
 * TROUBLESHOOTING
 * ───────────────────────────────────────────────────────────────────────────
 * ISSUE: Device won't connect to WiFi
 *   → Wait for WiFi Manager to start (3 failed attempts)
 *   → Reconfigure network via web portal
 * 
 * ISSUE: No data transmission
 *   → Check device approval status (wait for "go" command)
 *   → Verify MQTT broker credentials
 *   → Check Serial Monitor for error messages
 * 
 * ISSUE: Incorrect sensor readings
 *   → Enable CALIBRATION_MODE = true
 *   → Calibrate sensors using known reference solutions
 *   → Update calibration constants in code
 * 
 * ISSUE: Reset all settings
 *   → Call clearEEPROM() from Serial commands
 *   → Device will restart in factory state
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */


#include <WiFiS3.h>
#include <WiFiSSLClient.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <EEPROM.h>
#include <avr/pgmspace.h>  // For PROGMEM support


// ═══════════════════════════════════════════════════════════════════════════
// CALIBRATION MODE CONTROL
// ═══════════════════════════════════════════════════════════════════════════
// Set to 'true' for sensor calibration (255ms fast readings, no MQTT)
// Set to 'false' for normal water quality monitoring (60s readings + MQTT)
// ═══════════════════════════════════════════════════════════════════════════
#define CALIBRATION_MODE false    // ← CHANGE THIS TO true OR false


// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// WiFi Manager Settings
// ───────────────────────────────────────────────────────────────────────────
// Note: WiFi credentials must be configured via WiFi Manager web portal
#define ENABLE_WIFI_MANAGER true            // Enable WiFi provisioning portal
#define AP_SSID "PureTrack-Setup"        // Access Point name for configuration
#define AP_PASSWORD "12345678"              // Access Point password (min 8 chars)
#define WIFI_MANAGER_TIMEOUT 300000         // 5 minutes timeout for configuration
#define MAX_WIFI_CONNECTION_ATTEMPTS 3      // Attempts before starting AP mode

// ───────────────────────────────────────────────────────────────────────────
// MQTT Broker Configuration (HiveMQ Cloud - SSL/TLS Port 8883)
// ───────────────────────────────────────────────────────────────────────────
#define MQTT_BROKER "0331c5286d084675b9198021329c7573.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"

// ───────────────────────────────────────────────────────────────────────────
// Device Identity
// ───────────────────────────────────────────────────────────────────────────
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
#define FIRMWARE_VERSION "7.0.0"

// ───────────────────────────────────────────────────────────────────────────
// Sensor Pin Assignments
// ───────────────────────────────────────────────────────────────────────────
#define TDS_PIN A0              // TDS sensor (Total Dissolved Solids)
#define PH_PIN A0               // pH sensor
#define TURBIDITY_PIN A2        // Turbidity sensor

// ───────────────────────────────────────────────────────────────────────────
// Timing Intervals (milliseconds)
// ───────────────────────────────────────────────────────────────────────────
#define SENSOR_READ_INTERVAL 60000          // 60 seconds - Normal sensor reading
#define CALIBRATION_INTERVAL 255            // 255ms - Fast calibration readings
#define REGISTRATION_INTERVAL 60000         // 60 seconds - Registration retry
#define MQTT_RECONNECT_INTERVAL 30000       // 30 seconds - MQTT reconnect attempt
#define WATCHDOG_INTERVAL 300000            // 5 minutes - Heartbeat/status log
#define NTP_UPDATE_INTERVAL 3600000         // 1 hour - NTP time resync

// ───────────────────────────────────────────────────────────────────────────
// Time & Restart Settings (Philippine Time UTC+8)
// ───────────────────────────────────────────────────────────────────────────
#define RESTART_HOUR_UTC 16                 // 4:00 PM UTC = 12:00 AM PH Time
#define RESTART_MINUTE 0                    // Midnight restart minute
#define TIMEZONE_OFFSET_SECONDS 28800       // +8 hours for Philippine Time
#define MAX_UPTIME_HOURS 25                 // Safety fallback restart

// ───────────────────────────────────────────────────────────────────────────
// Reliability & Error Handling
// ───────────────────────────────────────────────────────────────────────────
#define MAX_MQTT_FAILURES 10                // Max consecutive MQTT failures
#define MAX_WIFI_FAILURES 3                 // Max consecutive WiFi failures

// ───────────────────────────────────────────────────────────────────────────
// EEPROM Memory Map
// ───────────────────────────────────────────────────────────────────────────
#define EEPROM_SIZE 512
#define EEPROM_MAGIC_NUMBER 0xA5B7          // Validation marker
#define EEPROM_ADDR_MAGIC 0                 // Address 0-1: Magic number
#define EEPROM_ADDR_APPROVED 2              // Address 2: Approval status
#define EEPROM_ADDR_BOOT_COUNT 3            // Address 3-6: Boot counter
#define EEPROM_ADDR_WIFI_SSID 7             // Address 7-38: WiFi SSID (32 bytes)
#define EEPROM_ADDR_WIFI_PASS 39            // Address 39-102: WiFi Password (64 bytes)
#define EEPROM_ADDR_WIFI_SAVED 103          // Address 103: WiFi saved flag


// ═══════════════════════════════════════════════════════════════════════════
// SENSOR CALIBRATION DATA (Stored in PROGMEM to save RAM)
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────── 
// TDS (Total Dissolved Solids) Calibration
// ───────────────────────────────────────────────────────────────────────────
const int CALIB_COUNT = 4;
const PROGMEM int calibADC[CALIB_COUNT] = {105, 116, 224, 250};      // ADC values
const PROGMEM float calibPPM[CALIB_COUNT] = {236.0, 278.0, 1220.0, 1506.0};  // PPM values

const float TDS_CALIBRATION_FACTOR = 0.589;  // Final adjustment factor
const float TDS_OFFSET = 0.0;                // Zero offset

// ─────────────────────────────────────────────────────────────────────────── 
// pH Sensor Calibration
// ───────────────────────────────────────────────────────────────────────────
const int PH_CALIB_COUNT = 4;
const PROGMEM int phCalibADC[PH_CALIB_COUNT] = {0, 100, 400, 450};   // ADC values
const PROGMEM float phCalibPH[PH_CALIB_COUNT] = {6.6, 7.0, 4.0, 9.0}; // pH values


// ═══════════════════════════════════════════════════════════════════════════
// MQTT TOPICS (Pre-allocated buffers for efficiency)
// ═══════════════════════════════════════════════════════════════════════════
char topicData[50];          // devices/{deviceId}/data - Sensor readings
char topicRegister[50];      // devices/{deviceId}/register - Device registration
char topicCommands[50];      // devices/{deviceId}/commands - Server commands
char topicPresence[50];      // devices/{deviceId}/presence - Presence announcements

// PROGMEM topics (shared across devices)
const char PRESENCE_QUERY_TOPIC[] PROGMEM = "presence/query";        // Server polls
const char PRESENCE_RESPONSE_TOPIC[] PROGMEM = "presence/response";  // Device responds

// ═══════════════════════════════════════════════════════════════════════════
// SENSOR SMOOTHING - Simple Moving Average (SMA) Buffers
// ═══════════════════════════════════════════════════════════════════════════
// TDS Smoothing
const int SMA_SIZE = 20;
int smaBuffer[SMA_SIZE];     // Circular buffer for TDS readings
int smaIndex = 0;            // Current position in buffer
long smaSum = 0;             // Running sum for fast average
int smaCount = 0;            // Number of samples collected

// Turbidity Smoothing
const int TURB_SMA_SIZE = 20;
int turbBuffer[TURB_SMA_SIZE];
int turbIndex = 0;
long turbSum = 0;
int turbCount = 0;

// pH Smoothing
const int PH_SMA_SIZE = 20;
int phBuffer[PH_SMA_SIZE];
int phIndex = 0;
long phSum = 0;
int phCount = 0;

// ─────────────────────────────────────────────────────────────────────────── 
// Computed Calibration Parameters (calculated at startup)
// ───────────────────────────────────────────────────────────────────────────
float fitSlope = 0.0;        // TDS linear regression slope
float fitIntercept = 0.0;    // TDS linear regression intercept
float phFitSlope = 0.0;      // pH linear regression slope
float phFitIntercept = 0.0;  // pH linear regression intercept


// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL OBJECTS (Network & Communication)
// ═══════════════════════════════════════════════════════════════════════════
WiFiSSLClient wifiSSLClient;                                          // SSL/TLS client
PubSubClient mqttClient(wifiSSLClient);                               // MQTT client
WiFiUDP ntpUDP;                                                       // NTP UDP socket
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, NTP_UPDATE_INTERVAL); // NTP time sync
WiFiServer webServer(80);                                             // Web server for WiFi manager

// ═══════════════════════════════════════════════════════════════════════════
// STATE TRACKING - Timing & Status
// ═══════════════════════════════════════════════════════════════════════════
// Timing trackers
unsigned long lastSensorRead = 0;
unsigned long lastRegistrationAttempt = 0;
unsigned long lastMqttReconnect = 0;
unsigned long lastWatchdog = 0;
unsigned long lastNtpUpdate = 0;
unsigned long bootTime = 0;

// System state flags
bool isApproved = false;                                   // Device approval status (EEPROM)
bool mqttConnected = false;                                // MQTT connection status
bool timeInitialized = false;                              // NTP time sync status
bool restartScheduled = false;                             // Midnight restart flag
bool isCalibrationMode = CALIBRATION_MODE;                 // Calibration mode (from #define)

// WiFi Manager State
bool wifiManagerActive = false;                            // WiFi config portal active
bool wifiCredentialsSaved = false;                         // Custom WiFi credentials stored
unsigned long wifiManagerStartTime = 0;                    // Portal start time
String savedSSID = "";                                     // User-configured SSID
String savedPassword = "";                                 // User-configured password
int wifiConnectionAttempts = 0;                            // Failed connection counter

// Sensor readings (current values)
float turbidity = 0.0;  // NTU (Nephelometric Turbidity Units)
float tds = 0.0;        // ppm (parts per million)
float ph = 0.0;         // pH scale (0-14)

// Error counters (for reliability)
int consecutiveMqttFailures = 0;
int consecutiveWifiFailures = 0;

// Transmission tracking
unsigned long transmissionCount = 0;                       // Total data transmissions
unsigned long bootCount = 0;                               // Total device reboots (EEPROM)
int lastTransmissionMinute = -1;                           // Prevent duplicate TX in same minute

// Dynamic sensor read interval (changes with calibration mode)
unsigned long sensorReadInterval = CALIBRATION_MODE ? CALIBRATION_INTERVAL : SENSOR_READ_INTERVAL;

// ─────────────────────────────────────────────────────────────────────────── 
// Presence Detection (Server Polling Mode)
// ───────────────────────────────────────────────────────────────────────────
bool presenceQueryActive = false;                          // Currently responding to query
unsigned long lastPresenceQuery = 0;                       // Last query timestamp
const unsigned long PRESENCE_TIMEOUT = 30000;              // 30 seconds timeout

// ─────────────────────────────────────────────────────────────────────────── 
// WiFi Status Caching (reduces API calls for performance)
// ───────────────────────────────────────────────────────────────────────────
uint8_t cachedWiFiStatus = WL_IDLE_STATUS;                 // Cached status
unsigned long lastWiFiCheck = 0;                           // Last check time
const unsigned long WIFI_CHECK_INTERVAL = 1000;            // Check every 1 second


// ═══════════════════════════════════════════════════════════════════════════
// FORWARD FUNCTION DECLARATIONS
// ═══════════════════════════════════════════════════════════════════════════
void handlePresenceQuery(const char* message);  // Process "who_is_online" queries
void publishPresenceOnline();                   // Announce device online status


// ═══════════════════════════════════════════════════════════════════════════
//                          HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Build MQTT Topics (Called once at startup)
// ───────────────────────────────────────────────────────────────────────────
void buildTopics() {
  snprintf(topicData, sizeof(topicData), "devices/%s/data", DEVICE_ID);
  snprintf(topicRegister, sizeof(topicRegister), "devices/%s/register", DEVICE_ID);
  snprintf(topicCommands, sizeof(topicCommands), "devices/%s/commands", DEVICE_ID);
  snprintf(topicPresence, sizeof(topicPresence), "devices/%s/presence", DEVICE_ID);
}


// Cached WiFi status check
uint8_t getWiFiStatus() {
  unsigned long now = millis();
  if (now - lastWiFiCheck >= WIFI_CHECK_INTERVAL) {
    cachedWiFiStatus = WiFi.status();
    lastWiFiCheck = now;
  }
  return cachedWiFiStatus;
}


// ═══════════════════════════════════════════════════════════════════════════
//                    CALIBRATION MODE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Set Calibration Mode (Enable/Disable)
// ───────────────────────────────────────────────────────────────────────────
void setCalibrationMode(bool enabled) {
  isCalibrationMode = enabled;
  
  if (enabled) {
    sensorReadInterval = CALIBRATION_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE ENABLED ==="));
    Serial.println(F("✓ MQTT transmission: DISABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(CALIBRATION_INTERVAL);
    Serial.println(F("ms"));
    Serial.println(F("✓ Data displayed locally only"));
    Serial.println(F("✓ Fast loop timing activated"));
    Serial.println(F("================================\n"));
  } else {
    sensorReadInterval = SENSOR_READ_INTERVAL;
    Serial.println(F("\n=== CALIBRATION MODE DISABLED ==="));
    Serial.println(F("✓ MQTT transmission: ENABLED"));
    Serial.print(F("✓ Sensor read interval: "));
    Serial.print(SENSOR_READ_INTERVAL);
    Serial.println(F("ms"));
    Serial.println(F("✓ Normal operation resumed"));
    Serial.println(F("=================================\n"));
  }
}


void toggleCalibrationMode() {
  setCalibrationMode(!isCalibrationMode);
}


// ═══════════════════════════════════════════════════════════════════════════
//                      EEPROM PERSISTENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
// 
// EEPROM is used to store configuration data that persists across reboots:
//   - Device approval status (approved by server or not)
//   - Boot counter (total number of device restarts)
//   - WiFi credentials (SSID and password)
//   - Magic number (validation that EEPROM has been initialized)
// 
// MEMORY MAP (104 bytes total):
//   Address 0-1:    Magic number (0xA5B7) - validates EEPROM is initialized
//   Address 2:      Approval status (0=not approved, 1=approved)
//   Address 3-6:    Boot counter (32-bit unsigned long)
//   Address 7-38:   WiFi SSID (32 bytes, null-terminated string)
//   Address 39-102: WiFi Password (64 bytes, null-terminated string)
//   Address 103:    WiFi saved flag (0=not saved, 1=credentials saved)
// 
// INITIALIZATION FLOW:
//   1. Check magic number at address 0-1
//   2. If not present (0xA5B7), initialize all values to defaults
//   3. If present, read stored values into RAM
//   4. Increment boot counter and save back to EEPROM
//   5. Load WiFi credentials if available
// 
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Initialize EEPROM (Check magic number and load stored data)
// ───────────────────────────────────────────────────────────────────────────
// Called during setup() to load persistent data from EEPROM
// 
// BEHAVIOR:
//   - First boot: Initializes EEPROM with defaults
//   - Subsequent boots: Loads saved data and increments boot counter
//   - Loads WiFi credentials if saved
// ───────────────────────────────────────────────────────────────────────────
void initEEPROM() {
  Serial.println(F("\n=== EEPROM Initialization ==="));
  
  uint16_t magic = (EEPROM.read(EEPROM_ADDR_MAGIC) << 8) | EEPROM.read(EEPROM_ADDR_MAGIC + 1);
  
  if (magic != EEPROM_MAGIC_NUMBER) {
    Serial.println(F("First boot - initializing EEPROM"));
    
    EEPROM.write(EEPROM_ADDR_MAGIC, (EEPROM_MAGIC_NUMBER >> 8) & 0xFF);
    EEPROM.write(EEPROM_ADDR_MAGIC + 1, EEPROM_MAGIC_NUMBER & 0xFF);
    EEPROM.write(EEPROM_ADDR_APPROVED, 0);
    EEPROM.write(EEPROM_ADDR_WIFI_SAVED, 0);
    writeBootCount(0);
    
    isApproved = false;
    bootCount = 0;
    
    Serial.println(F("EEPROM initialized"));
  } else {
    Serial.println(F("EEPROM valid - reading stored values"));
    
    isApproved = EEPROM.read(EEPROM_ADDR_APPROVED) == 1;
    bootCount = readBootCount();
    bootCount++;
    writeBootCount(bootCount);
    
    Serial.print(F("Approved status: "));
    Serial.println(isApproved ? F("YES") : F("NO"));
    Serial.print(F("Boot count: "));
    Serial.println(bootCount);
    
    // Load WiFi credentials
    if (loadWiFiCredentials(savedSSID, savedPassword)) {
      wifiCredentialsSaved = true;
    }
  }
  
  Serial.println(F("=============================\n"));
}


void saveApprovedStatus(bool approved) {
  EEPROM.write(EEPROM_ADDR_APPROVED, approved ? 1 : 0);
  isApproved = approved;
  
  Serial.print(F("✓ Saved approved status to EEPROM: "));
  Serial.println(approved ? F("YES") : F("NO"));
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


// ───────────────────────────────────────────────────────────────────────────
// Save WiFi Credentials to EEPROM
// ───────────────────────────────────────────────────────────────────────────
// Stores WiFi SSID and password to EEPROM for persistence across reboots
// 
// PARAMETERS:
//   ssid     - WiFi network name (max 32 characters)
//   password - WiFi network password (max 64 characters)
// 
// STORAGE:
//   - SSID saved at address 7-38 (32 bytes)
//   - Password saved at address 39-102 (64 bytes)
//   - Saved flag set at address 103 (1 byte)
//   - Strings are null-terminated
//   - Excess space filled with zeros
// 
// CALLED BY:
//   - handleWebPortal() when user submits WiFi configuration form
// ───────────────────────────────────────────────────────────────────────────
void saveWiFiCredentials(String ssid, String password) {
  // Write SSID (max 32 chars)
  for (int i = 0; i < 32; i++) {
    if (i < ssid.length()) {
      EEPROM.write(EEPROM_ADDR_WIFI_SSID + i, ssid[i]);
    } else {
      EEPROM.write(EEPROM_ADDR_WIFI_SSID + i, 0);
    }
  }
  
  // Write Password (max 64 chars)
  for (int i = 0; i < 64; i++) {
    if (i < password.length()) {
      EEPROM.write(EEPROM_ADDR_WIFI_PASS + i, password[i]);
    } else {
      EEPROM.write(EEPROM_ADDR_WIFI_PASS + i, 0);
    }
  }
  
  // Mark as saved
  EEPROM.write(EEPROM_ADDR_WIFI_SAVED, 1);
  
  Serial.println(F("✓ WiFi credentials saved to EEPROM"));
}


// ───────────────────────────────────────────────────────────────────────────
// Load WiFi Credentials from EEPROM
// ───────────────────────────────────────────────────────────────────────────
// Retrieves WiFi SSID and password from EEPROM if previously saved
// 
// PARAMETERS:
//   ssid     - Reference to String that will receive the SSID
//   password - Reference to String that will receive the password
// 
// RETURNS:
//   true  - Credentials found and loaded successfully
//   false - No credentials saved or SSID is empty
// 
// BEHAVIOR:
//   1. Check saved flag at address 103
//   2. If flag is 1, read SSID from addresses 7-38
//   3. Read password from addresses 39-102
//   4. Stop at first null character (0x00)
//   5. Return true if SSID length > 0
// 
// CALLED BY:
//   - initEEPROM() during boot to restore saved credentials
// ───────────────────────────────────────────────────────────────────────────
bool loadWiFiCredentials(String &ssid, String &password) {
  // Check if credentials are saved
  if (EEPROM.read(EEPROM_ADDR_WIFI_SAVED) != 1) {
    Serial.println(F("No WiFi credentials stored in EEPROM"));
    return false;
  }
  
  // Read SSID
  ssid = "";
  for (int i = 0; i < 32; i++) {
    char c = EEPROM.read(EEPROM_ADDR_WIFI_SSID + i);
    if (c == 0) break;
    ssid += c;
  }
  
  // Read Password
  password = "";
  for (int i = 0; i < 64; i++) {
    char c = EEPROM.read(EEPROM_ADDR_WIFI_PASS + i);
    if (c == 0) break;
    password += c;
  }
  
  if (ssid.length() > 0) {
    Serial.println(F("✓ WiFi credentials loaded from EEPROM"));
    Serial.print(F("SSID: "));
    Serial.println(ssid);
    return true;
  }
  
  return false;
}


// ───────────────────────────────────────────────────────────────────────────
// Clear EEPROM (Utility function - not exposed via MQTT)
// ───────────────────────────────────────────────────────────────────────────
void clearEEPROM() {
  Serial.println(F("Clearing EEPROM..."));
  for (int i = 0; i < 110; i++) {  // Clear up to WiFi data
    EEPROM.write(i, 0);
  }
  Serial.println(F("EEPROM cleared - restart required"));
}


// ═══════════════════════════════════════════════════════════════════════════
//                    CLOCK-SYNCHRONIZED TRANSMISSION
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Check if it's time for scheduled transmission (:00 or :30 minutes)
// ───────────────────────────────────────────────────────────────────────────
bool isTransmissionTime() {
  if (!timeInitialized) return false;
  
  timeClient.update();
  int currentMinute = timeClient.getMinutes();
  
  bool isScheduledTime = (currentMinute == 0 || currentMinute == 30);
  bool notYetTransmitted = (currentMinute != lastTransmissionMinute);
  
  return isScheduledTime && notYetTransmitted;
}


void getNextTransmissionTime(char* buffer, size_t bufSize) {
  if (!timeInitialized) {
    strncpy(buffer, "Unknown", bufSize);
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
  
  snprintf(buffer, bufSize, "%02d:%02d UTC", nextHour, nextMinute);
}


void getNextTransmissionPHTime(char* buffer, size_t bufSize) {
  if (!timeInitialized) {
    strncpy(buffer, "Unknown", bufSize);
    return;
  }
  
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
  
  snprintf(buffer, bufSize, "%02d:%02d PH", nextHour, nextMinute);
}


// ═══════════════════════════════════════════════════════════════════════════
//                      TIME MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Check for Midnight Restart (12:00 AM Philippine Time = 4:00 PM UTC)
// ───────────────────────────────────────────────────────────────────────────
void checkMidnightRestart() {
  if (restartScheduled) return;
  
  timeClient.update();
  
  int currentHourUTC = timeClient.getHours();
  int currentMinuteUTC = timeClient.getMinutes();
  
  if (currentHourUTC == RESTART_HOUR_UTC && currentMinuteUTC == RESTART_MINUTE) {
    if (!restartScheduled) {
      restartScheduled = true;
      
      Serial.println(F("\n========================================="));
      Serial.println(F("MIDNIGHT RESTART (Philippine Time)"));
      Serial.print(F("UTC Time: "));
      Serial.println(timeClient.getFormattedTime());
      Serial.print(F("PH Time: "));
      printPhilippineTime();
      Serial.print(F("Uptime: "));
      Serial.print((millis() - bootTime) / 3600000);
      Serial.println(F(" hours"));
      Serial.print(F("Boot count: "));
      Serial.println(bootCount);
      Serial.println(F("Restarting in 5 seconds..."));
      Serial.println(F("Registration status will be preserved"));
      Serial.println(F("=========================================\n"));
      
      // No shutdown status needed - server will detect offline via polling
      mqttClient.disconnect();
      
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
  Serial.print(F("UTC Time: "));
  Serial.println(timeClient.getFormattedTime());
  
  Serial.print(F("PH Time:  "));
  printPhilippineTime();
  
  int currentHourUTC = timeClient.getHours();
  int hoursUntilRestart = (currentHourUTC < RESTART_HOUR_UTC) 
    ? RESTART_HOUR_UTC - currentHourUTC 
    : 24 - currentHourUTC + RESTART_HOUR_UTC;
  
  int minutesUntilRestart = (60 - timeClient.getMinutes()) % 60;
  
  Serial.print(F("Next restart: "));
  Serial.print(hoursUntilRestart);
  Serial.print(F("h "));
  Serial.print(minutesUntilRestart);
  Serial.println(F("m"));
}


void printPhilippineTime() {
  char timeStr[9];
  getPhilippineTimeString(timeStr, sizeof(timeStr));
  Serial.println(timeStr);
}


void getPhilippineTimeString(char* buffer, size_t bufSize) {
  unsigned long epochTime = timeClient.getEpochTime();
  unsigned long phTime = epochTime + TIMEZONE_OFFSET_SECONDS;
  
  int hours = (phTime % 86400L) / 3600;
  int minutes = (phTime % 3600) / 60;
  int seconds = phTime % 60;
  
  snprintf(buffer, bufSize, "%02d:%02d:%02d", hours, minutes, seconds);
}


// ═══════════════════════════════════════════════════════════════════════════
//                    WiFi MANAGER - WEB PORTAL CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// 
// The WiFi Manager provides a zero-configuration web interface for WiFi setup.
// When no credentials are saved or connection fails, the device creates an
// Access Point (AP) that users can connect to and configure the WiFi network.
//
// PROCESS FLOW:
//   1. Device boots and checks EEPROM for saved WiFi credentials
//   2. If no credentials or connection fails 3 times:
//      - Creates AP: "WaterQuality-Setup" (password: "12345678")
//      - Starts web server on 192.168.4.1
//      - User connects to AP and opens browser to 192.168.4.1
//   3. Web portal scans and displays available networks
//   4. User selects network and enters password
//   5. Credentials are saved to EEPROM and device connects
//   6. On successful connection, AP shuts down and normal operation begins
//
// TECHNICAL DETAILS:
//   - Lightweight HTML (no CSS/JS) for fast microcontroller processing
//   - 2-second request timeout (reduced from 5s for performance)
//   - 5-minute portal timeout if no configuration submitted
//   - POST request parsing with validation and error handling
//   - URL decoding for special characters in passwords
//
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Scan Available WiFi Networks
// ───────────────────────────────────────────────────────────────────────────
// Scans for all visible WiFi networks and returns them as HTML list
// Returns: HTML string with network SSID and signal strength (RSSI)
// ───────────────────────────────────────────────────────────────────────────
String scanWiFiNetworks() {
  Serial.println(F("Scanning WiFi networks..."));
  int networksFound = WiFi.scanNetworks();
  
  String networkList = "";
  
  if (networksFound == 0) {
    networkList = "<p>No networks found</p>";
  } else {
    Serial.print(F("Found "));
    Serial.print(networksFound);
    Serial.println(F(" networks"));
    
    for (int i = 0; i < networksFound; i++) {
      String ssid = WiFi.SSID(i);
      int rssi = WiFi.RSSI(i);
      
      // Simple text list - no styling
      networkList += "- " + ssid + " (" + String(rssi) + "dBm)<br>";
      
      Serial.print(i + 1);
      Serial.print(F(": "));
      Serial.print(ssid);
      Serial.print(F(" ("));
      Serial.print(rssi);
      Serial.println(F(" dBm)"));
    }
  }
  
  return networkList;
}

// ───────────────────────────────────────────────────────────────────────────
// Generate Minimal Web Portal HTML (Optimized for Speed)
// ───────────────────────────────────────────────────────────────────────────
// Creates ultra-lightweight HTML page for WiFi configuration
// - No CSS styling (faster rendering)
// - No JavaScript (less processing overhead)
// - Basic HTML5 form with POST to /connect
// 
// Parameters:
//   networkList - HTML string of available networks from scanWiFiNetworks()
// Returns:
//   Complete HTML page as String
// ───────────────────────────────────────────────────────────────────────────
String generateWebPortalHTML(String networkList) {
  String html = "<html><head><title>WiFi Setup</title></head><body>";
  html += "<h1>WiFi Setup</h1>";
  html += "<p><b>Available Networks:</b></p>";
  html += networkList;
  html += "<hr>";
  html += "<form method='POST' action='/connect'>";
  html += "SSID:<br><input type='text' name='ssid'><br>";
  html += "Password:<br><input type='password' name='password'><br><br>";
  html += "<input type='submit' value='Connect'>";
  html += "</form>";
  html += "</body></html>";
  return html;
}

// ───────────────────────────────────────────────────────────────────────────
// Start WiFi Manager Access Point
// ───────────────────────────────────────────────────────────────────────────
// Creates WiFi Access Point and starts web server for configuration
// 
// BEHAVIOR:
//   - Disconnects from any existing WiFi connection
//   - Creates AP with SSID: "WaterQuality-Setup"
//   - Password: "12345678" (defined in AP_PASSWORD)
//   - IP Address: 192.168.4.1 (default Arduino AP IP)
//   - Starts web server on port 80
//   - Sets wifiManagerActive flag for loop handling
//   - Records start time for timeout management
// 
// AFTER CALLING:
//   - User must connect to AP and navigate to http://192.168.4.1
//   - Loop() will call handleWebPortal() to process requests
//   - Portal times out after 5 minutes (WIFI_MANAGER_TIMEOUT)
// ───────────────────────────────────────────────────────────────────────────
void startWiFiManager() {
  Serial.println(F("\n=== STARTING WiFi MANAGER ==="));
  
  // Stop any existing WiFi connection
  WiFi.disconnect();
  delay(500);
  
  // Start Access Point
  Serial.print(F("Creating Access Point: "));
  Serial.println(F(AP_SSID));
  
  bool apStarted = WiFi.beginAP(AP_SSID, AP_PASSWORD);
  
  if (!apStarted) {
    Serial.println(F("✗ Failed to start Access Point"));
    return;
  }
  
  delay(2000);
  
  IPAddress apIP = WiFi.localIP();
  Serial.println(F("✓ Access Point Started"));
  Serial.print(F("AP IP Address: "));
  Serial.println(apIP);
  Serial.print(F("AP Password: "));
  Serial.println(F(AP_PASSWORD));
  
  // Start web server
  webServer.begin();
  Serial.println(F("✓ Web Server Started on port 80"));
  
  wifiManagerActive = true;
  wifiManagerStartTime = millis();
  
  Serial.println(F("\n────────────────────────────────────"));
  Serial.println(F("HOW TO CONNECT:"));
  Serial.println(F("1. Connect to WiFi: " AP_SSID));
  Serial.println(F("2. Password: " AP_PASSWORD));
  Serial.print(F("3. Open browser: http://"));
  Serial.println(apIP);
  Serial.println(F("4. Select WiFi and enter password"));
  Serial.println(F("────────────────────────────────────\n"));
}

// ───────────────────────────────────────────────────────────────────────────
// Handle Web Portal Requests
// ───────────────────────────────────────────────────────────────────────────
// Processes HTTP requests from users connecting to the WiFi Manager portal
// 
// SUPPORTED ROUTES:
//   GET /       → Main page with network list and configuration form
//   GET /index  → Same as GET /
//   POST /connect → Process WiFi credentials submission
//   Other       → 404 Not Found
// 
// POST /connect PROCESSING:
//   1. Read entire HTTP request (headers + body)
//   2. Extract POST body after "\r\n\r\n"
//   3. Parse form data: "ssid=NetworkName&password=MyPassword"
//   4. URL decode special characters (spaces, symbols)
//   5. Trim whitespace from SSID and password
//   6. Validate SSID is not empty
//   7. Save credentials to RAM (savedSSID, savedPassword)
//   8. Save credentials to EEPROM for persistence
//   9. Send success response HTML
//   10. Close AP and attempt connection with new credentials
// 
// ERROR HANDLING:
//   - Returns HTTP 400 if 'ssid=' not found in POST body
//   - Returns HTTP 400 if 'password=' not found in POST body
//   - Returns HTTP 400 if SSID is empty after parsing
//   - Detailed Serial debug output for troubleshooting
// 
// PERFORMANCE:
//   - 2-second request timeout (optimized for microcontroller)
//   - Minimal HTML response (no styling or scripts)
//   - String-based parsing (simple and reliable)
// ───────────────────────────────────────────────────────────────────────────
void handleWebPortal() {
  WiFiClient client = webServer.available();
  
  if (!client) return;
  
  Serial.println(F("New web client connected"));
  
  String request = "";
  unsigned long timeout = millis();
  
  // Read the entire request (reduced timeout for faster response)
  while (client.connected() && millis() - timeout < 2000) {
    if (client.available()) {
      char c = client.read();
      request += c;
    } else {
      delay(1);
    }
  }
  
  Serial.println(F("Request received:"));
  Serial.println(request.substring(0, 100));
  
  // Parse request
  if (request.startsWith("GET / ") || request.startsWith("GET /index")) {
    // Main page - show WiFi networks
    Serial.println(F("Serving main page..."));
    
    String networkList = scanWiFiNetworks();
    String html = generateWebPortalHTML(networkList);
    
    client.println(F("HTTP/1.1 200 OK"));
    client.println(F("Content-Type: text/html"));
    client.println(F("Connection: close"));
    client.println();
    client.println(html);
    
  } else if (request.startsWith("POST /connect")) {
    // Handle WiFi connection request
    Serial.println(F("Processing connection request..."));
    
    // Extract form data
    int bodyStart = request.indexOf("\r\n\r\n") + 4;
    String body = request.substring(bodyStart);
    
    Serial.print(F("Body: "));
    Serial.println(body);
    
    // Parse SSID
    int ssidStart = body.indexOf("ssid=");
    if (ssidStart == -1) {
      Serial.println(F("✗ Error: 'ssid=' not found in request"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    ssidStart += 5;  // Skip "ssid="
    
    int ssidEnd = body.indexOf("&", ssidStart);
    if (ssidEnd == -1) ssidEnd = body.length();
    
    String ssid = body.substring(ssidStart, ssidEnd);
    ssid.replace("+", " ");
    urlDecode(ssid);
    ssid.trim();  // Remove any whitespace
    
    // Parse Password
    int passStart = body.indexOf("password=");
    if (passStart == -1) {
      Serial.println(F("✗ Error: 'password=' not found in request"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    passStart += 9;  // Skip "password="
    
    int passEnd = body.indexOf("&", passStart);
    if (passEnd == -1) passEnd = body.length();
    
    String password = body.substring(passStart, passEnd);
    password.replace("+", " ");
    urlDecode(password);
    password.trim();  // Remove any whitespace
    
    Serial.print(F("SSID: "));
    Serial.println(ssid);
    Serial.print(F("SSID Length: "));
    Serial.println(ssid.length());
    Serial.println(F("Password: ********"));
    Serial.print(F("Password Length: "));
    Serial.println(password.length());
    
    // Validate credentials
    if (ssid.length() == 0) {
      Serial.println(F("✗ Error: SSID is empty!"));
      client.println(F("HTTP/1.1 400 Bad Request"));
      client.println(F("Connection: close"));
      client.println();
      client.stop();
      return;
    }
    
    // Save credentials to RAM and EEPROM
    savedSSID = ssid;
    savedPassword = password;
    wifiCredentialsSaved = true;
    saveWiFiCredentials(ssid, password);  // Persist to EEPROM
    
    // Send simple success response
    client.println(F("HTTP/1.1 200 OK"));
    client.println(F("Content-Type: text/html"));
    client.println(F("Connection: close"));
    client.println();
    client.print(F("<html><body><h1>Success!</h1><p>Connecting to: "));
    client.print(ssid);
    client.println(F("</p><p>You can close this page.</p></body></html>"));
    
    delay(100);
    client.stop();
    
    Serial.println(F("✓ Configuration saved - will connect now..."));
    
    // Close client connection first
    delay(100);
    
    // Stop AP and web server
    wifiManagerActive = false;
    WiFi.end();  // This also closes the web server
    
    delay(2000);
    
    // Will attempt connection with new credentials in next loop iteration
    return;
    
  } else {
    // 404 Not Found
    client.println(F("HTTP/1.1 404 Not Found"));
    client.println(F("Content-Type: text/plain"));
    client.println(F("Connection: close"));
    client.println();
    client.println(F("404 - Page Not Found"));
  }
  
  delay(10);
  client.stop();
  Serial.println(F("Client disconnected"));
}

// ───────────────────────────────────────────────────────────────────────────
// URL Decode Helper
// ───────────────────────────────────────────────────────────────────────────
void urlDecode(String &str) {
  str.replace("%20", " ");
  str.replace("%21", "!");
  str.replace("%22", "\"");
  str.replace("%23", "#");
  str.replace("%24", "$");
  str.replace("%25", "%");
  str.replace("%26", "&");
  str.replace("%2B", "+");
  str.replace("%2F", "/");
  str.replace("%3A", ":");
  str.replace("%3D", "=");
  str.replace("%3F", "?");
  str.replace("%40", "@");
}


// ═══════════════════════════════════════════════════════════════════════════
//                          WiFi CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Connect to WiFi Network (Requires WiFi Manager Configuration)
// ───────────────────────────────────────────────────────────────────────────
void connectWiFi() {
  // Check if credentials are configured
  if (!wifiCredentialsSaved || savedSSID.length() == 0) {
    Serial.println(F("\n⚠ No WiFi credentials configured!"));
    Serial.println(F("Starting WiFi Manager for configuration..."));
    startWiFiManager();
    return;
  }
  
  Serial.print(F("WiFi: "));
  Serial.println(savedSSID);
  
  WiFi.disconnect();
  delay(500);
  WiFi.begin(savedSSID.c_str(), savedPassword.c_str());


  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    Serial.print(F("."));
    delay(500);
    attempts++;
  }


  cachedWiFiStatus = WiFi.status();
  
  if (cachedWiFiStatus != WL_CONNECTED) {
    Serial.println(F("\nWiFi FAILED"));
    consecutiveWifiFailures++;
    wifiConnectionAttempts++;
    
    // Start WiFi Manager if enabled and max attempts reached
    if (ENABLE_WIFI_MANAGER && wifiConnectionAttempts >= MAX_WIFI_CONNECTION_ATTEMPTS) {
      Serial.println(F("Max WiFi connection attempts reached"));
      Serial.println(F("Starting WiFi Manager Portal..."));
      startWiFiManager();
      return;
    }
    
    if (consecutiveWifiFailures >= MAX_WIFI_FAILURES) {
      Serial.println(F("Max WiFi failures - rebooting"));
      delay(3000);
      NVIC_SystemReset();
    }
    return;
  }


  Serial.println(F("\nWiFi OK"));
  
  attempts = 0;
  while (WiFi.localIP() == IPAddress(0, 0, 0, 0) && attempts < 20) {
    Serial.print(F("Waiting for IP"));
    delay(500);
    attempts++;
  }
  
  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("\nNo IP assigned - reconnecting"));
    consecutiveWifiFailures++;
    delay(2000);
    connectWiFi();
    return;
  }
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("RSSI: "));
  Serial.println(WiFi.RSSI());
  
  consecutiveWifiFailures = 0;
  wifiConnectionAttempts = 0;  // Reset counter on success
}


void handleWiFiDisconnection() {
  Serial.println(F("WiFi lost - reconnecting"));
  consecutiveWifiFailures++;
  mqttConnected = false;
  connectWiFi();
  
  if (getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    delay(1000);
    
    if (!timeInitialized) {
      timeClient.update();
      timeInitialized = true;
    }
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//                    MQTT CONNECTION & MESSAGE HANDLING
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Connect to MQTT Broker (SSL/TLS with no LWT)
// ───────────────────────────────────────────────────────────────────────────
void connectMQTT() {
  // Skip MQTT in calibration mode (unless you want remote control)
  if (isCalibrationMode) {
    Serial.println(F("Calibration mode - skipping MQTT"));
    return;
  }
  
  if (getWiFiStatus() != WL_CONNECTED) {
    Serial.println(F("MQTT: No WiFi"));
    return;
  }


  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("MQTT: No IP address"));
    return;
  }


  if (mqttClient.connected()) {
    mqttConnected = true;
    return;
  }


  Serial.println(F("\n--- MQTT SSL Connection ---"));
  Serial.print(F("Broker: "));
  Serial.println(F(MQTT_BROKER));
  Serial.print(F("Port: "));
  Serial.print(MQTT_PORT);
  Serial.println(F(" (SSL/TLS)"));
  Serial.println(F("Establishing SSL handshake..."));


  // Connect WITHOUT Last Will Testament (LWT)
  // Server will poll for presence instead of relying on broker LWT
  bool connected = mqttClient.connect(
    MQTT_CLIENT_ID,
    MQTT_USERNAME,
    MQTT_PASSWORD
  );


  if (connected) {
    Serial.println(F("✓ MQTT SSL Connected! (No LWT - Polling mode)"));
    mqttConnected = true;
    consecutiveMqttFailures = 0;


    if (mqttClient.subscribe(topicCommands, 0)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(topicCommands);
    }


    // Subscribe to presence query topic - SERVER WILL POLL US
    char presenceQueryTopic[30];
    strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
    
    if (mqttClient.subscribe(presenceQueryTopic, 1)) {
      Serial.print(F("✓ Subscribed: "));
      Serial.println(presenceQueryTopic);
      Serial.println(F("  Waiting for server presence polls..."));
    }


    // Announce we're online (will be validated by server polls)
    publishPresenceOnline();
    
  } else {
    Serial.print(F("✗ MQTT SSL Failed: "));
    Serial.println(mqttClient.state());
    printMqttError(mqttClient.state());
    
    mqttConnected = false;
    consecutiveMqttFailures++;
    
    if (consecutiveMqttFailures >= MAX_MQTT_FAILURES) {
      Serial.println(F("Max MQTT failures - resetting connection"));
      mqttClient.disconnect();
      delay(5000);
      consecutiveMqttFailures = 0;
    }
  }
  
  Serial.println(F("--- End MQTT Connection ---\n"));
}


void printMqttError(int state) {
  switch (state) {
    case -4: Serial.println(F("  SSL_CONNECTION_TIMEOUT")); break;
    case -3: Serial.println(F("  CONNECTION_LOST")); break;
    case -2: Serial.println(F("  CONNECT_FAILED")); break;
    case -1: Serial.println(F("  DISCONNECTED")); break;
    case 1: Serial.println(F("  BAD_PROTOCOL")); break;
    case 2: Serial.println(F("  BAD_CLIENT_ID")); break;
    case 3: Serial.println(F("  UNAVAILABLE")); break;
    case 4: Serial.println(F("  BAD_CREDENTIALS")); break;
    case 5: Serial.println(F("  UNAUTHORIZED")); break;
    default: Serial.println(F("  UNKNOWN")); break;
  }
}


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("MQTT RX ["));
  Serial.print(topic);
  Serial.print(F("]: "));
  
  char message[length + 1];
  memcpy(message, payload, length);
  message[length] = '\0';
  Serial.println(message);


  // Handle presence queries FIRST
  char presenceQueryTopic[30];
  strcpy_P(presenceQueryTopic, PRESENCE_QUERY_TOPIC);
  
  if (strcmp(topic, presenceQueryTopic) == 0) {
    handlePresenceQuery(message);
    return;
  }


  // Handle regular commands - Optimized size
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);


  if (error) {
    Serial.println(F("JSON parse error"));
    return;
  }


  const char* command = doc["command"];
  
  if (command == nullptr) return;


  if (strcmp(command, "go") == 0) {
    Serial.println(F("CMD: GO - Device approved!"));
    saveApprovedStatus(true);
    lastTransmissionMinute = -1;
    
  } else if (strcmp(command, "deregister") == 0) {
    Serial.println(F("CMD: DEREGISTER - Approval revoked"));
    saveApprovedStatus(false);
    
    Serial.println(F("Disconnecting MQTT for fresh registration..."));
    mqttClient.disconnect();
    delay(2000);
    mqttConnected = false;
    consecutiveMqttFailures = 0;
    lastMqttReconnect = millis() - MQTT_RECONNECT_INTERVAL;
    
  } else if (strcmp(command, "restart") == 0) {
    Serial.println(F("CMD: RESTART"));
    delay(1000);
    NVIC_SystemReset();
    
  } else if (strcmp(command, "send_now") == 0) {
    Serial.println(F("CMD: SEND NOW"));
    lastTransmissionMinute = -1;
    
    if (mqttConnected && isApproved && !isCalibrationMode) {
      Serial.println(F("\n=== MANUAL TX (send_now) ==="));
      publishSensorData();
      publishPresenceOnline(); // Announce presence instead of status
      transmissionCount++;
      Serial.println(F("=== TX COMPLETE ===\n"));
    } else if (isCalibrationMode) {
      Serial.println(F("⚠ Cannot send - Calibration mode active"));
    }
    
  } else {
    Serial.print(F("CMD: Unknown - "));
    Serial.println(command);
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//                      MQTT PUBLISHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Publish Sensor Data (pH, TDS, Turbidity)
// ───────────────────────────────────────────────────────────────────────────
void publishSensorData() {
  // Block MQTT transmission in calibration mode
  if (isCalibrationMode) {
    Serial.println(F("⚠ Calibration mode active - MQTT transmission blocked"));
    return;
  }
  
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected"));
    mqttConnected = false;
    return;
  }


  StaticJsonDocument<220> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  // Sensor data assignment
  doc["tds"] = round(tds * 10) / 10.0;
  doc["pH"] = round(ph * 100) / 100.0;
  doc["turbidity"] = round(turbidity * 10) / 10.0;
  doc["messageType"] = "sensor_data";
  doc["interval"] = "30min_clock_sync";
  doc["transmissionNumber"] = transmissionCount;


  char payload[220];
  size_t payloadSize = serializeJson(doc, payload, sizeof(payload));


  Serial.print(F("Publishing ("));
  Serial.print(payloadSize);
  Serial.println(F(" bytes):"));
  Serial.println(payload);


  if (mqttClient.publish(topicData, payload, false)) {
    Serial.println(F("✓ Published!"));
  } else {
    Serial.println(F("✗ Publish failed!"));
    Serial.print(F("State: "));
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println(F("State shows connected but publish failed - forcing reconnect"));
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    }
    
    consecutiveMqttFailures++;
  }
}


void sendRegistration() {
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected - cannot register"));
    mqttConnected = false;
    return;
  }


  if (WiFi.localIP() == IPAddress(0, 0, 0, 0)) {
    Serial.println(F("No IP - cannot register"));
    return;
  }


  Serial.println(F("\n--- Device Registration ---"));


  StaticJsonDocument<480> doc;
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
    
    char phTimeStr[9];
    getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
    doc["phTime"] = phTimeStr;
  }


  JsonArray sensors = doc.createNestedArray("sensors");
  sensors.add("pH");
  sensors.add("turbidity");
  sensors.add("tds");


  char payload[480];
  size_t payloadSize = serializeJson(doc, payload, sizeof(payload));


  Serial.print(F("Size: "));
  Serial.print(payloadSize);
  Serial.println(F(" bytes"));
  
  if (payloadSize > 768) {
    Serial.println(F("✗ Payload too large!"));
    return;
  }
  
  Serial.println(payload);


  bool published = mqttClient.publish(topicRegister, payload, false);


  if (published) {
    Serial.println(F("✓ Registration sent!"));
  } else {
    Serial.println(F("✗ Registration failed!"));
    Serial.print(F("MQTT state: "));
    Serial.println(mqttClient.state());
    
    if (mqttClient.state() == 0) {
      Serial.println(F("State shows connected but publish failed - forcing reconnect"));
      mqttClient.disconnect();
      mqttConnected = false;
      delay(1000);
    } else {
      printMqttError(mqttClient.state());
    }
    
    consecutiveMqttFailures++;
  }
  
  Serial.println(F("--- End Registration ---\n"));
}


// REMOVED: sendStatusUpdate() - Status topic replaced by presence polling
// Status information is now communicated through presence responses
// when server queries "who_is_online"


// REMOVED: sendShutdownStatus() - Not needed with polling mode
// Device simply stops responding to presence queries when offline


// ═══════════════════════════════════════════════════════════════════════════
//                    PRESENCE DETECTION (Server Polling)
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Handle Presence Query from Server ("who_is_online")
// ───────────────────────────────────────────────────────────────────────────
void handlePresenceQuery(const char* message) {
  Serial.println(F("\n=== PRESENCE QUERY RECEIVED ==="));
  
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);


  if (error) {
    Serial.print(F("Failed to parse presence query: "));
    Serial.println(error.c_str());
    return;
  }


  const char* queryType = doc["query"];
  if (queryType != nullptr && strcmp(queryType, "who_is_online") == 0) {
    presenceQueryActive = true;
    lastPresenceQuery = millis();


    Serial.println(F("Query type: who_is_online"));
    Serial.println(F("Preparing response..."));


    StaticJsonDocument<300> responseDoc;
    responseDoc["response"] = "i_am_online";
    responseDoc["deviceId"] = DEVICE_ID;
    responseDoc["deviceName"] = DEVICE_NAME;
    responseDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
    responseDoc["firmwareVersion"] = FIRMWARE_VERSION;
    responseDoc["uptime"] = (millis() - bootTime) / 1000;
    responseDoc["isApproved"] = isApproved;
    responseDoc["wifiRSSI"] = WiFi.RSSI();
    responseDoc["calibrationMode"] = isCalibrationMode;
    
    if (timeInitialized) {
      char phTimeStr[9];
      getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
      responseDoc["phTime"] = phTimeStr;
    }


    char responsePayload[300];
    size_t payloadSize = serializeJson(responseDoc, responsePayload, sizeof(responsePayload));


    Serial.print(F("Response payload: "));
    Serial.println(responsePayload);
    Serial.print(F("Response size: "));
    Serial.print(payloadSize);
    Serial.println(F(" bytes"));


    if (!mqttClient.connected()) {
      Serial.println(F("✗ MQTT disconnected - cannot respond"));
      mqttConnected = false;
      return;
    }


    char presenceResponseTopic[30];
    strcpy_P(presenceResponseTopic, PRESENCE_RESPONSE_TOPIC);
    
    bool published = mqttClient.publish(presenceResponseTopic, responsePayload, false);
    
    if (published) {
      Serial.println(F("✓ Presence response published successfully"));
    } else {
      Serial.println(F("✗ Failed to publish presence response"));
      Serial.print(F("MQTT state: "));
      Serial.println(mqttClient.state());
      printMqttError(mqttClient.state());
    }


    publishPresenceOnline();
    
    Serial.println(F("=== PRESENCE RESPONSE COMPLETE ===\n"));
  } else {
    Serial.print(F("Unknown query type: "));
    Serial.println(queryType != nullptr ? queryType : "null");
  }
}


void publishPresenceOnline() {
  if (!mqttClient.connected()) {
    Serial.println(F("MQTT not connected - cannot publish presence"));
    mqttConnected = false;
    return;
  }


  StaticJsonDocument<240> presenceDoc;
  presenceDoc["deviceId"] = DEVICE_ID;
  presenceDoc["deviceName"] = DEVICE_NAME;
  presenceDoc["status"] = "online";
  presenceDoc["timestamp"] = timeInitialized ? timeClient.getEpochTime() : (millis() / 1000);
  presenceDoc["lastResponse"] = millis();
  presenceDoc["firmwareVersion"] = FIRMWARE_VERSION;
  presenceDoc["uptime"] = (millis() - bootTime) / 1000;
  presenceDoc["isApproved"] = isApproved;
  presenceDoc["calibrationMode"] = isCalibrationMode;
  
  if (timeInitialized) {
    char phTimeStr[9];
    getPhilippineTimeString(phTimeStr, sizeof(phTimeStr));
    presenceDoc["phTime"] = phTimeStr;
  }


  char presencePayload[240];
  serializeJson(presenceDoc, presencePayload, sizeof(presencePayload));


  // Publish WITHOUT retained flag - server will poll to verify
  if (mqttClient.publish(topicPresence, presencePayload, false)) {
    Serial.println(F("✓ Presence status: online (NOT retained)"));
  } else {
    Serial.println(F("✗ Failed to publish presence status"));
    Serial.print(F("MQTT state: "));
    Serial.println(mqttClient.state());
  }
}


// ═══════════════════════════════════════════════════════════════════════════
//                    SENSOR CALIBRATION CALCULATIONS
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Compute TDS Calibration Parameters (Linear Regression)
// ───────────────────────────────────────────────────────────────────────────
void computeCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    meanX += pgm_read_word_near(calibADC + i);
    meanY += pgm_read_float_near(calibPPM + i);
  }
  meanX /= CALIB_COUNT;
  meanY /= CALIB_COUNT;

  float num = 0.0, den = 0.0;
  for (int i = 0; i < CALIB_COUNT; i++) {
    float dx = pgm_read_word_near(calibADC + i) - meanX;
    float dy = pgm_read_float_near(calibPPM + i) - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  if (den != 0.0) {
    fitSlope = num / den;
    fitIntercept = meanY - fitSlope * meanX;
  }
}

void computePHCalibrationParams() {
  float meanX = 0.0, meanY = 0.0;
  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    meanX += pgm_read_word_near(phCalibADC + i);
    meanY += pgm_read_float_near(phCalibPH + i);
  }
  meanX /= PH_CALIB_COUNT;
  meanY /= PH_CALIB_COUNT;

  float num = 0.0, den = 0.0;
  for (int i = 0; i < PH_CALIB_COUNT; i++) {
    float dx = pgm_read_word_near(phCalibADC + i) - meanX;
    float dy = pgm_read_float_near(phCalibPH + i) - meanY;
    num += dx * dy;
    den += dx * dx;
  }

  if (den != 0.0) {
    phFitSlope = num / den;
    phFitIntercept = meanY - phFitSlope * meanX;
  }
}

void printCalibrationInfo() {
  Serial.println(F("=== CALIBRATION ==="));
  Serial.print(F("TDS Slope: "));
  Serial.println(fitSlope, 3);
  Serial.print(F("TDS Intercept: "));
  Serial.println(fitIntercept, 2);
  Serial.print(F("pH Slope: "));
  Serial.println(phFitSlope, 3);
  Serial.print(F("pH Intercept: "));
  Serial.println(phFitIntercept, 2);
  Serial.println(F("==================="));
}

float adcToPPM(int adc) {
  for (int i = 0; i < CALIB_COUNT - 1; i++) {
    int adc_i = pgm_read_word_near(calibADC + i);
    int adc_i1 = pgm_read_word_near(calibADC + i + 1);

    if (adc >= adc_i && adc <= adc_i1) {
      float ppm_i = pgm_read_float_near(calibPPM + i);
      float ppm_i1 = pgm_read_float_near(calibPPM + i + 1);
      float slope = (ppm_i1 - ppm_i) / (float)(adc_i1 - adc_i);
      return ppm_i + slope * (adc - adc_i);
    }
  }
  return fitSlope * adc + fitIntercept;
}

float adcToPH(int adc) {
  for (int i = 0; i < PH_CALIB_COUNT - 1; i++) {
    int adc_i = pgm_read_word_near(phCalibADC + i);
    int adc_i1 = pgm_read_word_near(phCalibADC + i + 1);

    if (adc >= adc_i && adc <= adc_i1) {
      float ph_i = pgm_read_float_near(phCalibPH + i);
      float ph_i1 = pgm_read_float_near(phCalibPH + i + 1);
      float slope = (ph_i1 - ph_i) / (float)(adc_i1 - adc_i);
      return ph_i + slope * (adc - adc_i);
    }
  }
  return phFitSlope * adc + phFitIntercept;
}

float calculateTurbidityNTU(int adcValue) {
  // Calibrated for:
  // Clear water: ADC ~360, NTU = 0
  // Cloudy water: ADC ~100, NTU = 20
  float slope = 20.0 / (100.0 - 360.0);  // -0.0769230769
  float intercept = -slope * 360.0;       // 27.69230769
  float ntu = slope * adcValue + intercept;
  return (ntu < 0) ? 0 : ntu;
}

String getTurbidityStatus(float ntu) {
  if (ntu > 10.0) return "EMERGENCY";
  if (ntu > 5.0) return "CRITICAL";
  if (ntu > 1.0) return "WARNING";
  return "NORMAL";
}


// ═══════════════════════════════════════════════════════════════════════════
//                    SENSOR READING & PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Read All Sensors (pH, TDS, Turbidity) with SMA Smoothing
// ───────────────────────────────────────────────────────────────────────────
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
  turbidity = calculateTurbidityNTU(avgTurb);

  // Simple output for calibration
  Serial.print(F("Raw TDS:"));
  Serial.print(rawTDS);
  Serial.print(F(" Raw pH:"));
  Serial.print(rawPH);
  Serial.print(F(" Raw Turb:"));
  Serial.print(rawTurb);
  Serial.print(F(" | Avg TDS:"));
  Serial.print(avgTDS);
  Serial.print(F(" Avg pH:"));
  Serial.print(avgPH);
  Serial.print(F(" Avg Turb:"));
  Serial.print(avgTurb);
  Serial.print(F(" | TDS:"));
  Serial.print(tds, 1);
  Serial.print(F(" pH:"));
  Serial.print(ph, 2);
  Serial.print(F(" Turb:"));
  Serial.print(turbidity, 1);
  Serial.print(F(" NTU ("));
  Serial.print(getTurbidityStatus(turbidity));
  Serial.println(F(")"));
}


// ═══════════════════════════════════════════════════════════════════════════
//                      SYSTEM WATCHDOG & MONITORING
// ═══════════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────────
// Print System Status (Heartbeat every 5 minutes)
// ───────────────────────────────────────────────────────────────────────────
void printWatchdog() {
  Serial.println(F("\n=== WATCHDOG ==="));
  Serial.print(F("Uptime: "));
  Serial.print((millis() - bootTime) / 3600000);
  Serial.println(F("h"));
  
  Serial.print(F("Boot count: "));
  Serial.println(bootCount);
  
  Serial.print(F("Calibration Mode: "));
  Serial.println(isCalibrationMode ? F("ACTIVE (255ms)") : F("OFF"));
  
  Serial.print(F("Read Interval: "));
  Serial.print(sensorReadInterval);
  Serial.println(F("ms"));
  
  Serial.print(F("IP: "));
  Serial.println(WiFi.localIP());
  
  Serial.print(F("Approved: "));
  Serial.println(isApproved ? F("YES") : F("NO"));
  
  if (timeInitialized) {
    Serial.print(F("UTC:  "));
    Serial.println(timeClient.getFormattedTime());
    Serial.print(F("PH:   "));
    printPhilippineTime();
    
    if (!isCalibrationMode) {
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
    
    int currentHourUTC = timeClient.getHours();
    int hoursUntilRestart = (currentHourUTC < RESTART_HOUR_UTC) 
      ? RESTART_HOUR_UTC - currentHourUTC 
      : 24 - currentHourUTC + RESTART_HOUR_UTC;
    
    Serial.print(F("Restart in: "));
    Serial.print(hoursUntilRestart);
    Serial.println(F("h"));
  } else {
    Serial.println(F("Time: Not synced"));
  }
  
  Serial.print(F("WiFi: "));
  Serial.println(getWiFiStatus() == WL_CONNECTED ? F("OK") : F("DOWN"));
  Serial.print(F("MQTT SSL: "));
  Serial.println(mqttConnected ? F("OK") : F("DOWN"));
  Serial.print(F("TX Count: "));
  Serial.println(transmissionCount);
  Serial.println(F("================\n"));
}


// ═══════════════════════════════════════════════════════════════════════════
//                          ARDUINO SETUP FUNCTION
// ═══════════════════════════════════════════════════════════════════════════
// 
// Initialization sequence executed once at device boot
// 
// INITIALIZATION ORDER:
//   1. Serial communication (115200 baud)
//   2. Boot time recording
//   3. Display firmware information and mode
//   4. Build MQTT topic strings
//   5. Initialize EEPROM (load saved data)
//   6. Connect to WiFi (use saved credentials or start WiFi Manager)
//   7. Sync time via NTP (Philippine Time UTC+8)
//   8. Connect to MQTT broker (if not in calibration mode)
//   9. Send registration request (if not approved)
//   10. Initialize sensor arrays
//   11. Display status summary
// 
// CALIBRATION MODE:
//   - If CALIBRATION_MODE = true, skips MQTT initialization
//   - Displays fast sensor readings every 255ms
//   - WiFi still required for potential future features
// 
// NORMAL MODE:
//   - Full MQTT connectivity
//   - Registers with server
//   - Waits for "go" command if not approved
//   - Begins scheduled data transmission
// 
// ERROR HANDLING:
//   - WiFi connection failure: Starts WiFi Manager after 3 attempts
//   - MQTT connection failure: Retries with exponential backoff
//   - NTP sync failure: Retries every 60 seconds
//   - Sensor initialization: Non-fatal, continues with zeros
// 
// ═══════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  bootTime = millis();


  Serial.println(F("\n=== Water Quality Monitor - Arduino R4 WiFi ==="));
  Serial.println(F("Firmware: v7.0.0 - Server Polling Mode"));
  Serial.print(F("Boot: "));
  Serial.println(bootTime);
  Serial.println(F("MQTT: SSL/TLS (Port 8883) - No LWT"));
  Serial.println(F("Restart: 12:00 AM Philippine Time (UTC+8)"));
  Serial.println(F("Data TX: Every 30 minutes (:00 and :30)"));
  Serial.println(F("Presence: Server polling (who_is_online)"));
  Serial.println(F("Optimizations: F() macro + PROGMEM + Reduced RAM"));
  
  // Display calibration mode status
  Serial.print(F("CALIBRATION MODE: "));
  Serial.println(isCalibrationMode ? F("ENABLED (255ms, no MQTT)") : F("DISABLED (normal)"));
  
  buildTopics();
  initEEPROM();
  
  pinMode(TDS_PIN, INPUT);
  pinMode(PH_PIN, INPUT);
  pinMode(TURBIDITY_PIN, INPUT);


  memset(smaBuffer, 0, sizeof(smaBuffer));
  memset(phBuffer, 0, sizeof(phBuffer));
  memset(turbBuffer, 0, sizeof(turbBuffer));


  computeCalibrationParams();
  computePHCalibrationParams();
  printCalibrationInfo();


  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(90);
  mqttClient.setSocketTimeout(60);
  mqttClient.setBufferSize(768);


  Serial.println(F("\n=== Connecting... ==="));
  
  connectWiFi();
  
  // Skip MQTT and NTP in calibration mode
  if (!isCalibrationMode && getWiFiStatus() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    
    timeClient.begin();
    delay(1000);
    
    Serial.print(F("NTP sync"));
    for (int i = 0; i < 5; i++) {
      Serial.print(F("."));
      if (timeClient.update()) {
        timeInitialized = true;
        Serial.println(F(" OK"));
        printCurrentTime();
        break;
      }
      delay(1000);
    }
    
    if (!timeInitialized) {
      Serial.println(F(" Failed (will retry)"));
    }
    
    delay(2000);
    
    connectMQTT();
    
    if (mqttConnected) {
      delay(3000);
      
      if (!isApproved) {
        Serial.println(F("Device NOT approved - sending registration"));
        sendRegistration();
      } else {
        Serial.println(F("Device already approved - ready for data transmission"));
        publishPresenceOnline(); // Announce presence
      }
    }
  } else if (isCalibrationMode) {
    Serial.println(F("\n*** CALIBRATION MODE - Skipping MQTT/NTP ***"));
    Serial.println(F("*** Sensor readings will display every 255ms ***"));
  }


  Serial.println(F("\n=== System Ready ==="));
  
  if (isCalibrationMode) {
    Serial.println(F("Mode: CALIBRATION (255ms local readings only)"));
  } else {
    Serial.print(F("Mode: "));
    Serial.println(isApproved ? F("ACTIVE MONITORING") : F("WAITING FOR APPROVAL"));
    
    if (timeInitialized) {
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
  }
  
  Serial.println();
}


// ═══════════════════════════════════════════════════════════════════════════
//                          ARDUINO MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════════
// 
// Primary execution loop running continuously after setup()
// 
// EXECUTION ORDER:
//   1. WiFi Manager Mode (if active)
//      - Handle web portal HTTP requests
//      - Check for configuration timeout
//      - Exit to normal mode when credentials saved
// 
//   2. Safety Checks
//      - Check for millis() overflow (~50 days)
//      - Check for midnight restart time
// 
//   3. WiFi Management
//      - Monitor WiFi connection status
//      - Reconnect if disconnected
//      - Track uptime without WiFi
// 
//   4. Time Synchronization
//      - Update NTP time every 60 seconds
//      - Maintain Philippine Time (UTC+8)
// 
//   5. MQTT Connection (if not in calibration mode)
//      - Connect to broker if disconnected
//      - Process incoming messages (mqttClient.loop())
//      - Handle server polling queries
// 
//   6. Sensor Readings
//      - Read pH, TDS, Turbidity sensors
//      - Apply smoothing algorithms (SMA)
//      - Display readings to Serial Monitor
//      - Interval: 60s (normal) or 255ms (calibration)
// 
//   7. Data Transmission (normal mode only)
//      - Check if device is approved
//      - Check if scheduled time (:00 or :30 minutes)
//      - Publish sensor data to MQTT
//      - Handle manual "send_now" commands
// 
// SPECIAL MODES:
//   - WiFi Manager Active: Only processes web portal requests
//   - Calibration Mode: Fast readings, no MQTT, Serial output only
//   - Waiting for Approval: Sensors active, no data transmission
// 
// TIMING:
//   - Loop executes as fast as possible
//   - Delays only for non-blocking operations
//   - Time-based actions use millis() comparison
// 
// ═══════════════════════════════════════════════════════════════════════════
void loop() {
  unsigned long currentMillis = millis();

  // ═════════════════════════════════════════════════════════════════════════
  // WiFi MANAGER MODE: Handle Web Portal Requests
  // ═════════════════════════════════════════════════════════════════════════
  if (wifiManagerActive) {
    handleWebPortal();
    
    // Check for timeout
    if (currentMillis - wifiManagerStartTime > WIFI_MANAGER_TIMEOUT) {
      Serial.println(F("\n⚠ WiFi Manager timeout"));
      
      if (!wifiCredentialsSaved || savedSSID.length() == 0) {
        Serial.println(F("✗ No credentials configured - restarting portal..."));
        wifiManagerStartTime = currentMillis;  // Reset timeout
      } else {
        Serial.println(F("Using previously saved credentials"));
        WiFi.end();  // This also closes the web server
        wifiManagerActive = false;
        delay(1000);
        connectWiFi();
      }
    }
    
    // Don't run normal loop operations in WiFi Manager mode
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SAFETY: Maximum Uptime Check (skip in calibration mode)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCalibrationMode && (currentMillis - bootTime) / 3600000UL >= MAX_UPTIME_HOURS) {
    Serial.println(F("Max uptime - safety restart"));
    delay(2000);
    NVIC_SystemReset();
  }


  // ─────────────────────────────────────────────────────────────────────────
  // SCHEDULED RESTART: Midnight Philippine Time Check
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCalibrationMode && timeInitialized) {
    checkMidnightRestart();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WiFi MANAGEMENT: Monitor Connection Status
  // ─────────────────────────────────────────────────────────────────────────
  uint8_t wifiStatus = getWiFiStatus();
  if (!isCalibrationMode && wifiStatus != WL_CONNECTED) {
    handleWiFiDisconnection();
    delay(5000);
    return;
  } else {
    consecutiveWifiFailures = 0;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // NTP TIME SYNC: Periodic Update (every 1 hour)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCalibrationMode && timeInitialized && currentMillis - lastNtpUpdate >= NTP_UPDATE_INTERVAL) {
    lastNtpUpdate = currentMillis;
    timeClient.update();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NTP TIME INIT: First-Time Synchronization
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCalibrationMode && !timeInitialized && wifiStatus == WL_CONNECTED) {
    if (timeClient.update()) {
      timeInitialized = true;
      Serial.println(F("NTP time synchronized"));
      printCurrentTime();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MQTT CONNECTION: Manage Broker Connection & Message Loop
  // ─────────────────────────────────────────────────────────────────────────
  if (!isCalibrationMode) {
    if (!mqttClient.connected()) {
      mqttConnected = false;
      
      bool needMqtt = !isApproved;
      
      if (timeInitialized && isApproved) {
        int currentMinute = timeClient.getMinutes();
        needMqtt = (currentMinute == 28 || currentMinute == 29 || 
                    currentMinute == 58 || currentMinute == 59 || 
                    currentMinute == 0 || currentMinute == 30);
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
      Serial.println(F("Presence query timeout"));
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  // WATCHDOG: System Heartbeat & Status Logging
  // ─────────────────────────────────────────────────────────────────────────
  unsigned long watchdogInterval = isCalibrationMode ? 60000 : WATCHDOG_INTERVAL;
  if (currentMillis - lastWatchdog >= watchdogInterval) {
    lastWatchdog = currentMillis;
    printWatchdog();
  }

  // ═════════════════════════════════════════════════════════════════════════
  // SENSOR READINGS: Always Active (Works in ALL Modes)
  // ═════════════════════════════════════════════════════════════════════════
  if (currentMillis - lastSensorRead >= sensorReadInterval) {
    lastSensorRead = currentMillis;
    readSensors();
    
    if (isCalibrationMode) {
      // In calibration mode, show fast readings
      Serial.print(F("[CALIB] Interval: "));
      Serial.print(sensorReadInterval);
      Serial.println(F("ms - Local display only"));
    } else if (isApproved && timeInitialized) {
      // In normal mode, show next transmission time
      char nextTxStr[15];
      getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
      Serial.print(F("Next TX: "));
      Serial.println(nextTxStr);
    }
  }


  // ═════════════════════════════════════════════════════════════════════════
  // REGISTRATION MODE: Device Awaiting Approval
  // ═════════════════════════════════════════════════════════════════════════
  if (!isCalibrationMode && !isApproved) {
    if (currentMillis - lastRegistrationAttempt >= REGISTRATION_INTERVAL) {
      lastRegistrationAttempt = currentMillis;
      if (mqttConnected) {
        sendRegistration();
      }
    }
  } 
  // ═════════════════════════════════════════════════════════════════════════
  // ACTIVE MONITORING: Clock-Synchronized Data Transmission
  // ═════════════════════════════════════════════════════════════════════════
  else if (!isCalibrationMode) {
    // Check if it's time for scheduled transmission (:00 or :30)
    if (isTransmissionTime()) {
      Serial.println(F("\n=== SCHEDULED 30-MIN TX ==="));
      Serial.print(F("Current time: "));
      Serial.println(timeClient.getFormattedTime());
      
      if (!mqttConnected) {
        connectMQTT();
        delay(3000);
      }
      
      if (mqttConnected) {
        publishSensorData();
        publishPresenceOnline(); // Update presence instead of status
        transmissionCount++;
        
        lastTransmissionMinute = timeClient.getMinutes();
        
        Serial.print(F("TX Count: "));
        Serial.println(transmissionCount);
        
        char nextTxStr[15];
        getNextTransmissionPHTime(nextTxStr, sizeof(nextTxStr));
        Serial.print(F("Next TX: "));
        Serial.println(nextTxStr);
      } else {
        Serial.println(F("MQTT unavailable - transmission skipped"));
      }
      
      Serial.println(F("=== TX COMPLETE ===\n"));
    }
  }


  // ═════════════════════════════════════════════════════════════════════════
  // LOOP DELAY: Timing Control (Mode-Dependent)
  // ═════════════════════════════════════════════════════════════════════════
  if (!isCalibrationMode) {
    delay(100);  // Normal mode: 100ms delay for stable operation
  } else {
    delay(10);   // Calibration mode: 10ms for tight 255ms sensor timing
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              END OF PROGRAM
// ═══════════════════════════════════════════════════════════════════════════
// 
// FIRMWARE SUMMARY:
//   Total Lines: ~2400+
//   Memory Optimizations: F() macro, PROGMEM, optimized buffers
//   WiFi: Manager with EEPROM persistence
//   MQTT: SSL/TLS secure connection (HiveMQ Cloud)
//   Sensors: pH, TDS, Turbidity with smoothing algorithms
//   Modes: Normal (60s + MQTT) and Calibration (255ms, no MQTT)
// 
// DEPLOYMENT CHECKLIST:
//   ☐ Set CALIBRATION_MODE to false for production
//   ☐ Verify MQTT broker credentials (MQTT_BROKER, MQTT_USERNAME, etc.)
//   ☐ Confirm device ID is unique (DEVICE_ID, MQTT_CLIENT_ID)
//   ☐ Test WiFi Manager configuration process
//   ☐ Verify sensor calibration constants
//   ☐ Check Serial Monitor output at 115200 baud
//   ☐ Confirm data transmission at :00 and :30 minutes
//   ☐ Wait for server "go" command before expecting data
// 
// MAINTENANCE:
//   - Device restarts automatically at midnight (Philippine Time)
//   - WiFi credentials persist across reboots (EEPROM)
//   - Approval status persists across reboots (EEPROM)
//   - Check boot counter in Serial Monitor for restart tracking
//   - Monitor "uptime without WiFi" for connectivity issues
// 
// SUPPORT:
//   - Serial Monitor: 115200 baud for debug output
//   - WiFi Manager: http://192.168.4.1 when AP active
//   - MQTT Commands: go, deregister, restart, send_now
//   - Factory Reset: Call clearEEPROM() to erase all settings
// 
// VERSION HISTORY:
//   v7.0.0 - December 2025
//     • Added WiFi Manager with web portal
//     • Implemented WiFi credential EEPROM persistence
//     • Simplified HTML for microcontroller performance
//     • Enhanced POST request parsing with validation
//     • Added comprehensive inline documentation
//     • Optimized for Arduino UNO R4 WiFi platform
// 
// COPYRIGHT:
//   PureTrack Team
//   December 2025
//   All Rights Reserved
// 
// ═══════════════════════════════════════════════════════════════════════════

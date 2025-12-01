# Water Quality Monitoring System - Comprehensive Documentation

## 📚 Table of Contents

1. [Overview](#overview)
2. [Firmware Architecture](#firmware-architecture)
3. [System Initialization](#system-initialization)
4. [Module Documentation](#module-documentation)
5. [Configuration Guide](#configuration-guide)
6. [Calibration Procedures](#calibration-procedures)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [API Reference](#api-reference)

---

## 📋 Overview

**Project:** PureTrack Water Quality Monitoring System  
**Hardware:** Arduino UNO R4 WiFi  
**Firmware Version:** v8.0.0  
**Last Updated:** December 2025  
**Author:** YUZON, Tristan Justine M.

### Key Features

✅ **WiFi Manager** - Zero-configuration web portal for WiFi setup  
✅ **WiFi Persistence** - Credentials saved to EEPROM (survives reboots)  
✅ **Secure MQTT** - SSL/TLS connection to HiveMQ Cloud (Port 8883)  
✅ **Scheduled Transmission** - Data sent every 30 minutes (:00 and :30)  
✅ **NTP Time Sync** - Philippine Time Zone (UTC+8)  
✅ **Calibration Mode** - Fast sensor readings for calibration  
✅ **Auto Restart** - Daily midnight maintenance restart  
✅ **Approval System** - Server-side device registration  
✅ **System Readiness Framework** - Comprehensive initialization tracking

---

## 🏗️ Firmware Architecture

### Code Structure

```
Arduino_Uno_R4_Optimized.ino (3000+ lines)
├── Header & Configuration (Lines 1-300)
│   ├── System Configuration
│   ├── Pin Assignments
│   ├── Timing Constants
│   ├── Calibration Data (PROGMEM)
│   └── Global Variables
│
├── System Readiness Framework (Lines 300-720)
│   ├── Module Status Tracking
│   ├── Readiness Evaluation
│   └── Status Reporting
│
├── EEPROM Persistence (Lines 720-940)
│   ├── Initialization
│   ├── WiFi Credentials Storage
│   ├── Approval Status
│   └── Boot Counter
│
├── Time Management (Lines 940-1160)
│   ├── Clock Synchronization
│   ├── Transmission Scheduling
│   ├── Midnight Restart Logic
│   └── Philippine Time Conversion
│
├── WiFi Manager (Lines 1160-1520)
│   ├── Web Portal HTML Generation
│   ├── Network Scanning
│   ├── POST Request Parsing
│   └── Credential Validation
│
├── WiFi Connection (Lines 1520-1630)
│   ├── Connection Management
│   ├── Disconnection Handling
│   └── Auto-Reconnection
│
├── MQTT Communication (Lines 1630-2140)
│   ├── SSL/TLS Connection
│   ├── Message Callback
│   ├── Data Publishing
│   ├── Registration
│   └── Presence Detection
│
├── Sensor Calibration (Lines 2140-2360)
│   ├── Linear Regression
│   ├── ADC to Physical Units
│   └── Turbidity Calculation
│
├── Sensor Reading (Lines 2360-2480)
│   ├── Analog Input
│   ├── Moving Average Smoothing
│   └── Serial Output
│
├── System Watchdog (Lines 2480-2560)
│   └── Periodic Status Logging
│
├── Setup Function (Lines 2560-2780)
│   └── Complete Initialization Sequence
│
└── Main Loop (Lines 2780-3009)
    └── Event-Driven Operation
```

### Memory Usage

| Component | RAM Usage | Optimization |
|-----------|-----------|--------------|
| String Constants | ~500 bytes saved | F() macro |
| Calibration Tables | ~100 bytes saved | PROGMEM |
| MQTT Buffers | 768 bytes | Optimized sizing |
| WiFi Status Cache | Minimal | 1-second caching |
| Sensor Smoothing | 180 bytes | 3 x 20-sample buffers |
| **Total Estimated** | **~60% RAM** | Well within limits |

---

## 🚀 System Initialization

### Boot Sequence

The device follows a strict initialization order to ensure system reliability:

```
1. Serial Communication (115200 baud)
   └─> Essential for debugging and monitoring

2. Boot Time Recording
   └─> millis() timestamp for uptime tracking

3. Firmware Information Display
   ├─> Version number
   ├─> Calibration mode status
   └─> Feature summary

4. MQTT Topic Construction
   └─> Build device-specific topics once

5. EEPROM Initialization
   ├─> Read magic number (validation)
   ├─> Load WiFi credentials
   ├─> Load approval status
   └─> Increment boot counter

6. Sensor Hardware Setup
   ├─> Configure analog input pins
   └─> Initialize smoothing buffers

7. Calibration Engine
   ├─> Compute TDS linear regression
   └─> Compute pH linear regression

8. MQTT Client Configuration
   ├─> Set broker address and port
   ├─> Configure callbacks
   └─> Set buffer sizes

9. WiFi Connection
   ├─> Load saved credentials from EEPROM
   ├─> Attempt connection (max 3 tries)
   └─> Start WiFi Manager if failed

10. NTP Time Synchronization (Normal Mode)
    ├─> Connect to pool.ntp.org
    ├─> Retry up to 15 times
    ├─> Validate timestamp (must be > 2020)
    └─> Block data transmission until synced

11. MQTT Broker Connection (Normal Mode)
    ├─> Establish SSL/TLS connection
    ├─> Subscribe to command topics
    └─> Subscribe to presence query topic

12. Device Registration (If Not Approved)
    └─> Send registration request to server

13. System Readiness Verification
    ├─> Check all module states
    ├─> Print comprehensive status report
    └─> Enable data transmission if ready
```

### System Readiness Framework

The firmware implements a comprehensive module tracking system:

```cpp
enum ModuleStatus {
  MODULE_UNINITIALIZED = 0,  // Not started
  MODULE_INITIALIZING = 1,   // In progress
  MODULE_FAILED = 2,         // Failed (will retry)
  MODULE_READY = 3           // Fully operational
};

struct SystemReadiness {
  ModuleStatus eeprom;       // Configuration storage
  ModuleStatus wifi;         // Network connectivity
  ModuleStatus ntp;          // Time synchronization
  ModuleStatus mqtt;         // Server communication
  ModuleStatus sensors;      // Hardware initialization
  ModuleStatus calibration;  // Data processing
  bool systemReady;          // Overall system status
  unsigned long readyTime;   // Timestamp when ready
};
```

**Critical Rule:** Data transmission is **BLOCKED** until ALL modules report `MODULE_READY`.

---

## 📦 Module Documentation

### 1. EEPROM Persistence Module

**Purpose:** Store configuration data that survives power cycles

#### Memory Map

| Address | Size | Description |
|---------|------|-------------|
| 0-1 | 2 bytes | Magic number (0xA5B7) |
| 2 | 1 byte | Approval status (0=no, 1=yes) |
| 3-6 | 4 bytes | Boot counter (unsigned long) |
| 7-38 | 32 bytes | WiFi SSID (null-terminated) |
| 39-102 | 64 bytes | WiFi Password (null-terminated) |
| 103 | 1 byte | WiFi saved flag (0=no, 1=yes) |

**Total:** 104 bytes used (out of 512 available)

#### Key Functions

```cpp
void initEEPROM()
  // Initialize EEPROM and load stored data
  // Returns: void
  // Effects: Loads WiFi credentials, approval status, boot count
  
void saveApprovedStatus(bool approved)
  // Save device approval status
  // Parameters: approved (true/false)
  
void saveWiFiCredentials(String ssid, String password)
  // Save WiFi credentials to EEPROM
  // Parameters: ssid (max 32 chars), password (max 64 chars)
  
bool loadWiFiCredentials(String &ssid, String &password)
  // Load WiFi credentials from EEPROM
  // Returns: true if credentials exist, false otherwise
  
void clearEEPROM()
  // Factory reset - erase all EEPROM data
  // WARNING: Requires reconfiguration via WiFi Manager
```

---

### 2. WiFi Manager Module

**Purpose:** Provide zero-configuration WiFi setup via web interface

#### Process Flow

```
1. Device Boot
   └─> Check EEPROM for saved credentials

2. If No Credentials OR Connection Fails 3 Times:
   ├─> Create Access Point "PureTrack-Setup"
   ├─> Password: "12345678"
   ├─> Start web server on 192.168.4.1
   └─> Wait for user configuration

3. User Connects to AP:
   ├─> Open browser to http://192.168.4.1
   ├─> View list of available networks
   ├─> Enter WiFi SSID and password
   └─> Submit form

4. Device Receives Configuration:
   ├─> Parse POST request
   ├─> URL decode special characters
   ├─> Validate credentials
   ├─> Save to EEPROM
   └─> Close AP and connect

5. Subsequent Boots:
   └─> Automatically connect using saved credentials
```

#### Configuration Portal Features

- **Lightweight HTML** (no CSS/JS for fast rendering)
- **2-second request timeout** (optimized for microcontroller)
- **5-minute portal timeout** (auto-close if not configured)
- **URL decoding** (handles spaces and special characters)
- **Form validation** (prevents empty SSID submission)

#### Key Functions

```cpp
void startWiFiManager()
  // Start WiFi configuration access point
  // Creates AP and web server
  
void handleWebPortal()
  // Process HTTP requests from configuration portal
  // Handles GET / (main page) and POST /connect (credentials)
  
String scanWiFiNetworks()
  // Scan and return list of available networks
  // Returns: HTML-formatted network list with RSSI
  
String generateWebPortalHTML(String networkList)
  // Generate minimal HTML for configuration page
  // Returns: Complete HTML page as String
  
void urlDecode(String &str)
  // Decode URL-encoded characters in form data
  // Handles spaces, symbols, and special characters
```

---

### 3. Time Management Module

**Purpose:** Synchronize system time and schedule operations

#### NTP Synchronization

- **NTP Server:** pool.ntp.org
- **Timezone:** Philippine Time (UTC+8)
- **Sync Frequency:** Every 60 minutes
- **Initial Retries:** Up to 15 attempts at startup
- **Retry Interval:** 30 seconds if sync fails

#### Time Validation

**CRITICAL:** The system validates timestamps before data transmission:

```cpp
// Timestamp must be after January 1, 2020
if (epochTime < 1577836800) {
  // BLOCK TRANSMISSION - Invalid time
}
```

This prevents sending sensor data with incorrect timestamps (e.g., 1970 dates).

#### Scheduled Operations

| Operation | Schedule | Time Zone |
|-----------|----------|-----------|
| Data Transmission | :00 and :30 minutes | Philippine Time |
| Midnight Restart | 12:00 AM | Philippine Time (16:00 UTC) |
| NTP Resync | Every 60 minutes | N/A |

#### Key Functions

```cpp
bool isTransmissionTime()
  // Check if current time matches transmission schedule
  // Returns: true if :00 or :30 minutes
  
void checkMidnightRestart()
  // Check if it's time for scheduled restart
  // Restarts at 12:00 AM Philippine Time
  
void printCurrentTime()
  // Display UTC and Philippine times
  
void getPhilippineTimeString(char* buffer, size_t bufSize)
  // Convert epoch time to Philippine Time string
  // Format: HH:MM:SS
  
void getPhilippineDateString(char* buffer, size_t bufSize)
  // Convert epoch time to Philippine Date string
  // Format: YYYY-MM-DD
```

---

### 4. MQTT Communication Module

**Purpose:** Secure server communication via SSL/TLS

#### Connection Details

- **Broker:** HiveMQ Cloud
- **Port:** 8883 (SSL/TLS)
- **Protocol:** MQTT v3.1.1
- **Keep-Alive:** 90 seconds
- **Socket Timeout:** 60 seconds
- **Buffer Size:** 768 bytes

#### Topics

##### Device Publishes To:

| Topic | Payload Type | Frequency | QoS |
|-------|--------------|-----------|-----|
| `devices/{deviceId}/data` | Sensor readings | Every 30 min | 0 |
| `devices/{deviceId}/register` | Registration info | On boot | 0 |
| `devices/{deviceId}/presence` | Online status | On connect | 0 |
| `presence/response` | Polling response | On query | 0 |

##### Device Subscribes To:

| Topic | Description | QoS |
|-------|-------------|-----|
| `devices/{deviceId}/commands` | Server commands | 0 |
| `presence/query` | Server polling | 1 |

#### MQTT Commands

```json
// Approve Device
{"command": "go"}

// Revoke Approval
{"command": "deregister"}

// Restart Device
{"command": "restart"}

// Force Immediate Transmission
{"command": "send_now"}
```

#### Presence Detection

**Server Polling Mode (No LWT):**

```
1. Server publishes to "presence/query":
   {"query": "who_is_online"}

2. Device responds to "presence/response":
   {
     "response": "i_am_online",
     "deviceId": "arduino_uno_r4_002",
     "timestamp": 1734567890,
     "uptime": 3600,
     "isApproved": true
   }

3. Server tracks last response time
4. Device offline if no response within 30 seconds
```

#### Key Functions

```cpp
void connectMQTT()
  // Establish SSL/TLS connection to broker
  // Subscribe to command and presence topics
  
void mqttCallback(char* topic, byte* payload, unsigned int length)
  // Process incoming MQTT messages
  // Handles commands and presence queries
  
void publishSensorData()
  // Publish pH, TDS, Turbidity readings
  // Validates time sync before transmission
  
void sendRegistration()
  // Send device information to server
  // Includes firmware version, MAC, IP, sensors
  
void handlePresenceQuery(const char* message)
  // Respond to server "who_is_online" query
  
void publishPresenceOnline()
  // Announce device online status
```

---

### 5. Sensor Calibration Module

**Purpose:** Convert ADC readings to physical units

#### Calibration Method

**Linear Regression with Piecewise Interpolation:**

```
1. Define calibration points (ADC, Physical Unit)
2. Compute best-fit line using least squares
3. For readings between points, use linear interpolation
4. For readings outside range, use regression equation
```

#### TDS Calibration

```cpp
const int calibADC[4] = {105, 116, 224, 250};           // ADC values
const float calibPPM[4] = {236.0, 278.0, 1220.0, 1506.0}; // PPM values
const float TDS_CALIBRATION_FACTOR = 0.589;             // Final adjustment
```

**Calibration Solutions:**
- 342 ppm (Low range)
- 1413 ppm (High range)

#### pH Calibration

```cpp
const int phCalibADC[4] = {0, 100, 400, 450};         // ADC values
const float phCalibPH[4] = {6.6, 7.0, 4.0, 9.0};      // pH values
```

**Buffer Solutions:**
- pH 4.0 (Acidic)
- pH 7.0 (Neutral)
- pH 10.0 (Alkaline)

#### Turbidity Calibration

```cpp
// Clear water: ADC ~360, NTU = 0
// Cloudy water: ADC ~100, NTU = 20
float slope = 20.0 / (100.0 - 360.0);  // -0.0769230769
float intercept = -slope * 360.0;      // 27.69230769
```

**Reference Standards:**
- 0 NTU (Distilled water)
- Formazin standards (20, 50, 100 NTU)

#### Key Functions

```cpp
void computeCalibrationParams()
  // Compute TDS linear regression parameters
  // Calculates slope and intercept from calibration points
  
void computePHCalibrationParams()
  // Compute pH linear regression parameters
  
void printCalibrationInfo()
  // Display calibration parameters to Serial
  
float adcToPPM(int adc)
  // Convert ADC reading to TDS (ppm)
  // Uses piecewise interpolation + regression
  
float adcToPH(int adc)
  // Convert ADC reading to pH value
  // Clamps result between 0.0 and 14.0
  
float calculateTurbidityNTU(int adcValue)
  // Convert ADC reading to turbidity (NTU)
  // Returns 0 for negative values
```

---

### 6. Sensor Reading Module

**Purpose:** Acquire and smooth sensor data

#### Simple Moving Average (SMA)

Each sensor uses a 20-sample circular buffer:

```cpp
// TDS Smoothing
const int SMA_SIZE = 20;
int smaBuffer[SMA_SIZE];
int smaIndex = 0;
long smaSum = 0;
int smaCount = 0;
```

**Benefits:**
- Reduces noise and jitter
- Fast computation (running sum)
- No division until output
- Memory efficient (integer math)

#### Reading Process

```
1. Read raw ADC values
   ├─> TDS (A0)
   ├─> pH (A1)
   └─> Turbidity (A2)

2. Update circular buffers
   ├─> Remove oldest value from sum
   ├─> Add new value to buffer and sum
   └─> Advance buffer index (modulo SMA_SIZE)

3. Compute averages
   └─> Average = Sum / Count

4. Apply calibration
   ├─> TDS: adcToPPM() + adjustment factor
   ├─> pH: adcToPH() + clamping (0-14)
   └─> Turbidity: calculateTurbidityNTU()

5. Display to Serial
   └─> Raw ADC, Averaged ADC, Calibrated values
```

#### Key Function

```cpp
void readSensors()
  // Read all sensors with SMA smoothing
  // Updates global variables: tds, ph, turbidity
  // Prints values to Serial Monitor
```

---

## ⚙️ Configuration Guide

### 1. Basic Configuration

Edit these constants at the top of the firmware:

```cpp
// ─────────────────────────────────────────────────────────────
// CALIBRATION MODE (Enable/Disable)
// ─────────────────────────────────────────────────────────────
#define CALIBRATION_MODE false  // Set to true for calibration

// ─────────────────────────────────────────────────────────────
// WiFi Manager Settings
// ─────────────────────────────────────────────────────────────
#define AP_SSID "PureTrack-Setup"
#define AP_PASSWORD "12345678"
#define WIFI_MANAGER_TIMEOUT 300000  // 5 minutes

// ─────────────────────────────────────────────────────────────
// MQTT Broker Configuration
// ─────────────────────────────────────────────────────────────
#define MQTT_BROKER "your-broker.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_CLIENT_ID "arduino_uno_r4_002"
#define MQTT_USERNAME "Admin"
#define MQTT_PASSWORD "Admin123"

// ─────────────────────────────────────────────────────────────
// Device Identity
// ─────────────────────────────────────────────────────────────
#define DEVICE_ID "arduino_uno_r4_002"
#define DEVICE_NAME "Water Quality Monitor R4"
#define FIRMWARE_VERSION "8.0.0"
```

### 2. Timing Configuration

```cpp
// Normal sensor reading interval
#define SENSOR_READ_INTERVAL 60000  // 60 seconds

// Calibration fast reading interval
#define CALIBRATION_INTERVAL 255  // 255 milliseconds

// MQTT reconnection attempts
#define MQTT_RECONNECT_INTERVAL 30000  // 30 seconds

// NTP resync interval
#define NTP_UPDATE_INTERVAL 3600000  // 1 hour

// Midnight restart (Philippine Time)
#define RESTART_HOUR_UTC 16  // 4:00 PM UTC = 12:00 AM PH
```

### 3. Sensor Pin Configuration

```cpp
#define TDS_PIN A0        // TDS sensor analog input
#define PH_PIN A1         // pH sensor analog input
#define TURBIDITY_PIN A2  // Turbidity sensor analog input
```

---

## 🔧 Calibration Procedures

### Prerequisites

- Arduino IDE 2.0+
- Serial Monitor (115200 baud)
- Known reference solutions
- Stable power supply
- Clean sensor probes

### TDS Sensor Calibration

**1. Prepare Reference Solutions:**
- 342 ppm calibration solution
- 1413 ppm calibration solution
- Distilled water (0 ppm)

**2. Enable Calibration Mode:**
```cpp
#define CALIBRATION_MODE true
```

**3. Upload Firmware:**
- Upload to Arduino
- Open Serial Monitor (115200 baud)

**4. Record Measurements:**

```
Immerse sensor in 0 ppm (distilled water)
  └─> Wait 30 seconds
  └─> Record Raw TDS ADC value
  
Rinse sensor with distilled water

Immerse sensor in 342 ppm solution
  └─> Wait 30 seconds
  └─> Record Raw TDS ADC value
  
Rinse sensor

Immerse sensor in 1413 ppm solution
  └─> Wait 30 seconds
  └─> Record Raw TDS ADC value
```

**5. Update Calibration Arrays:**
```cpp
const int calibADC[4] = {[YOUR_VALUES_HERE]};
const float calibPPM[4] = {0.0, 342.0, 1413.0, [MAX_VALUE]};
```

**6. Test and Adjust:**
```cpp
const float TDS_CALIBRATION_FACTOR = 0.589;  // Adjust if needed
```

**7. Return to Normal Mode:**
```cpp
#define CALIBRATION_MODE false
```

### pH Sensor Calibration

**1. Prepare Buffer Solutions:**
- pH 4.0 buffer
- pH 7.0 buffer
- pH 10.0 buffer

**2. Enable Calibration Mode:**
```cpp
#define CALIBRATION_MODE true
```

**3. Upload and Monitor:**
- Open Serial Monitor
- Wait for readings to stabilize

**4. Record Measurements:**

```
Immerse sensor in pH 7.0 buffer (neutral)
  └─> Wait 60 seconds (pH sensors are slower)
  └─> Record Raw pH ADC value
  
Rinse sensor with distilled water

Immerse sensor in pH 4.0 buffer (acidic)
  └─> Wait 60 seconds
  └─> Record Raw pH ADC value
  
Rinse sensor

Immerse sensor in pH 10.0 buffer (alkaline)
  └─> Wait 60 seconds
  └─> Record Raw pH ADC value
```

**5. Update Calibration Arrays:**
```cpp
const int phCalibADC[4] = {[YOUR_VALUES_HERE]};
const float phCalibPH[4] = {[CORRESPONDING_PH_VALUES]};
```

### Turbidity Sensor Calibration

**1. Prepare Standards:**
- Distilled water (0 NTU)
- Formazin standards (20, 50, 100 NTU)

**2. Record Baseline:**
```
Clear water (0 NTU)
  └─> Record Raw Turbidity ADC
  └─> Should be ~360 (high voltage)
```

**3. Record Cloudy Sample:**
```
Cloudy water (~20 NTU)
  └─> Record Raw Turbidity ADC
  └─> Should be ~100 (low voltage)
```

**4. Update Calibration:**
```cpp
float calculateTurbidityNTU(int adcValue) {
  float slope = 20.0 / (100.0 - 360.0);  // Adjust based on your readings
  float intercept = -slope * 360.0;
  float ntu = slope * adcValue + intercept;
  return (ntu < 0) ? 0 : ntu;
}
```

---

## 🔍 Troubleshooting Guide

### WiFi Issues

#### Problem: Device won't connect to WiFi

**Symptoms:**
- Serial shows "WiFi FAILED"
- No IP address assigned
- WiFi Manager starts automatically

**Solutions:**

1. **Check credentials:**
   ```
   - Verify SSID is correct (case-sensitive)
   - Verify password is correct
   - Check for special characters
   ```

2. **Signal strength:**
   ```
   - Move device closer to router
   - Check RSSI in Serial Monitor
   - RSSI > -70 dBm is good
   ```

3. **Router settings:**
   ```
   - Ensure 2.4 GHz band is enabled
   - Check MAC address filtering
   - Verify DHCP is enabled
   ```

4. **Factory reset:**
   ```cpp
   clearEEPROM();  // Call this in setup()
   // Re-upload firmware
   ```

#### Problem: WiFi Manager portal won't load

**Symptoms:**
- Can connect to "PureTrack-Setup"
- Browser can't reach 192.168.4.1
- Page times out

**Solutions:**

1. **Wait longer:**
   ```
   - Microcontrollers are slow
   - Wait 10-15 seconds for page load
   - Don't refresh repeatedly
   ```

2. **Try different browser:**
   ```
   - Use plain HTTP (not HTTPS)
   - Disable browser caching
   - Use incognito/private mode
   ```

3. **Check IP manually:**
   ```
   - Serial Monitor shows: "AP IP Address: 192.168.4.1"
   - Navigate to exact IP shown
   ```

### MQTT Issues

#### Problem: MQTT connection fails

**Symptoms:**
- Serial shows "✗ MQTT SSL Failed"
- Error codes displayed
- Device can't register

**Solutions:**

1. **Check credentials:**
   ```cpp
   #define MQTT_BROKER "your-broker.hivemq.cloud"
   #define MQTT_USERNAME "Admin"
   #define MQTT_PASSWORD "Admin123"
   ```

2. **Verify broker status:**
   ```
   - Check if broker is online
   - Verify SSL/TLS port 8883 is open
   - Test with MQTT client (e.g., MQTT.fx)
   ```

3. **Check network:**
   ```
   - Ensure WiFi has internet access
   - Ping broker from same network
   - Check firewall rules
   ```

#### Problem: MQTT connects but publishes fail

**Symptoms:**
- "MQTT SSL Connected!" message
- "✗ Publish failed!" for data
- State shows connected (0)

**Solutions:**

1. **Check buffer size:**
   ```cpp
   mqttClient.setBufferSize(768);  // Ensure this is set
   ```

2. **Reduce payload size:**
   ```
   - Check JSON payload in Serial
   - Should be < 768 bytes
   - Remove unnecessary fields
   ```

3. **Check topic permissions:**
   ```
   - Verify device can publish to topic
   - Check broker ACL settings
   - Test with simpler topic
   ```

### Time Sync Issues

#### Problem: NTP sync fails

**Symptoms:**
- "✗ NTP sync failed" repeatedly
- Time shows 1970 dates
- Data transmission blocked

**Solutions:**

1. **Check internet access:**
   ```
   - Verify WiFi has internet
   - Test on same network
   - Check DNS settings
   ```

2. **Try different NTP server:**
   ```cpp
   NTPClient timeClient(ntpUDP, "time.google.com", 0, NTP_UPDATE_INTERVAL);
   ```

3. **Wait longer:**
   ```
   - NTP sync can take 30-60 seconds
   - Device retries every 30 seconds
   - Be patient on first boot
   ```

#### Problem: Data transmission blocked by time validation

**Symptoms:**
- "⚠ Cannot publish: Invalid epoch time"
- Epoch time shows < 1577836800
- Time appears unsynced

**Solutions:**

1. **Force NTP update:**
   ```
   - Restart device
   - Wait 2 minutes for sync
   - Check "UTC Time" in Serial
   ```

2. **Verify timezone:**
   ```cpp
   #define TIMEZONE_OFFSET_SECONDS 28800  // +8 hours PH
   ```

### Sensor Reading Issues

#### Problem: Erratic sensor readings

**Symptoms:**
- Values jump wildly
- No stabilization
- Unrealistic measurements

**Solutions:**

1. **Check connections:**
   ```
   - Verify sensor cables are secure
   - Check for loose wires
   - Measure voltage at analog pins
   ```

2. **Increase SMA buffer:**
   ```cpp
   const int SMA_SIZE = 30;  // Increase from 20
   ```

3. **Wait for stabilization:**
   ```
   - SMA requires 20 samples to fill buffer
   - Wait 20 minutes in normal mode
   - Or 5 seconds in calibration mode
   ```

#### Problem: Sensor reads zero or constant value

**Symptoms:**
- TDS always 0 ppm
- pH always same value
- No response to changes

**Solutions:**

1. **Check sensor power:**
   ```
   - Verify 5V power connection
   - Check ground connection
   - Measure with multimeter
   ```

2. **Test sensor directly:**
   ```
   - Enable calibration mode
   - Watch Raw ADC values
   - Should change with conditions
   ```

3. **Recalibrate:**
   ```
   - Follow calibration procedures
   - Update calibration arrays
   - Test with known solutions
   ```

### System Readiness Issues

#### Problem: System never becomes ready

**Symptoms:**
- "⚠️ SYSTEM NOT READY" persists
- Some modules stuck at INITIALIZING
- Data transmission never starts

**Solutions:**

1. **Check module status:**
   ```
   printSystemReadiness();  // Call in setup()
   // Identify which module failed
   ```

2. **Module-specific fixes:**
   ```
   EEPROM: clearEEPROM() and restart
   WiFi: Reconfigure via WiFi Manager
   NTP: Wait longer, try different server
   MQTT: Check broker credentials
   Sensors: Verify pin connections
   Calibration: Should always succeed
   ```

3. **Serial debugging:**
   ```
   - Check for error messages
   - Look for initialization failures
   - Note which module is stuck
   ```

---

## 📚 API Reference

### EEPROM Functions

```cpp
void initEEPROM()
```
Initialize EEPROM and load stored configuration.  
**Called:** Once during `setup()`  
**Effects:** Loads WiFi credentials, approval status, increments boot counter

```cpp
void saveApprovedStatus(bool approved)
```
Save device approval status to EEPROM.  
**Parameters:** `approved` - true to approve, false to revoke  
**EEPROM Address:** 2

```cpp
void saveWiFiCredentials(String ssid, String password)
```
Save WiFi credentials to EEPROM for persistence.  
**Parameters:**
- `ssid` - WiFi network name (max 32 characters)
- `password` - WiFi password (max 64 characters)

**EEPROM Addresses:** 7-38 (SSID), 39-102 (Password), 103 (Saved flag)

```cpp
bool loadWiFiCredentials(String &ssid, String &password)
```
Load WiFi credentials from EEPROM.  
**Parameters:** References to Strings for SSID and password  
**Returns:** true if credentials exist, false otherwise

```cpp
void clearEEPROM()
```
Factory reset - erase all EEPROM data.  
**WARNING:** Requires reconfiguration via WiFi Manager

### WiFi Manager Functions

```cpp
void startWiFiManager()
```
Create Access Point and start configuration web server.  
**AP SSID:** PureTrack-Setup  
**AP Password:** 12345678  
**Portal URL:** http://192.168.4.1

```cpp
void handleWebPortal()
```
Process HTTP requests from configuration portal.  
**Routes:**
- `GET /` - Main configuration page
- `POST /connect` - Process credentials

```cpp
String scanWiFiNetworks()
```
Scan for available WiFi networks.  
**Returns:** HTML-formatted list of networks with RSSI

```cpp
void urlDecode(String &str)
```
Decode URL-encoded characters in form data.  
**Effects:** Replaces %20 with space, %40 with @, etc.

### Time Management Functions

```cpp
bool isTransmissionTime()
```
Check if current time matches transmission schedule.  
**Returns:** true if minutes == 0 or 30  
**Requires:** `timeInitialized == true`

```cpp
void checkMidnightRestart()
```
Check for scheduled midnight restart (Philippine Time).  
**Restart Time:** 12:00 AM PH (16:00 UTC)  
**Effects:** Calls `NVIC_SystemReset()` at scheduled time

```cpp
void printCurrentTime()
```
Display UTC and Philippine times to Serial.  
**Format:**
```
UTC Time: HH:MM:SS
PH Time:  HH:MM:SS
```

```cpp
void getPhilippineTimeString(char* buffer, size_t bufSize)
```
Convert epoch time to Philippine Time string.  
**Parameters:** Character buffer and size  
**Format:** HH:MM:SS

```cpp
void getPhilippineDateString(char* buffer, size_t bufSize)
```
Convert epoch time to Philippine Date string.  
**Parameters:** Character buffer and size  
**Format:** YYYY-MM-DD

### MQTT Functions

```cpp
void connectMQTT()
```
Establish SSL/TLS connection to MQTT broker.  
**Broker:** HiveMQ Cloud  
**Port:** 8883  
**Effects:** Subscribes to commands and presence topics

```cpp
void publishSensorData()
```
Publish sensor readings to MQTT.  
**Topic:** `devices/{deviceId}/data`  
**Requires:** System fully ready, time synchronized  
**Blocks:** If time invalid or system not ready

```cpp
void sendRegistration()
```
Send device registration information to server.  
**Topic:** `devices/{deviceId}/register`  
**Includes:** Firmware version, MAC, IP, sensors, uptime

```cpp
void handlePresenceQuery(const char* message)
```
Respond to server "who_is_online" query.  
**Response Topic:** `presence/response`  
**Payload:** Device status and metadata

```cpp
void publishPresenceOnline()
```
Announce device online status.  
**Topic:** `devices/{deviceId}/presence`  
**Not Retained:** Server must poll for verification

### Calibration Functions

```cpp
void computeCalibrationParams()
```
Compute TDS linear regression parameters from calibration data.  
**Effects:** Sets `fitSlope` and `fitIntercept` globals

```cpp
void computePHCalibrationParams()
```
Compute pH linear regression parameters from calibration data.  
**Effects:** Sets `phFitSlope` and `phFitIntercept` globals

```cpp
float adcToPPM(int adc)
```
Convert ADC reading to TDS (parts per million).  
**Parameters:** `adc` - Analog input value (0-1023)  
**Returns:** TDS in ppm (float)

```cpp
float adcToPH(int adc)
```
Convert ADC reading to pH value.  
**Parameters:** `adc` - Analog input value (0-1023)  
**Returns:** pH (0.0 - 14.0)

```cpp
float calculateTurbidityNTU(int adcValue)
```
Convert ADC reading to turbidity (NTU).  
**Parameters:** `adcValue` - Analog input value (0-1023)  
**Returns:** Turbidity in NTU (float, >= 0)

### Sensor Reading Functions

```cpp
void readSensors()
```
Read all sensors with SMA smoothing.  
**Effects:**
- Updates global variables: `tds`, `ph`, `turbidity`
- Updates circular buffers for smoothing
- Prints values to Serial Monitor

**Serial Output Format:**
```
Raw TDS:105 Raw pH:250 Raw Turb:360 | Avg TDS:108 Avg pH:248 Avg Turb:358 | TDS:280.5 pH:7.02 Turb:0.8 NTU (NORMAL)
```

### System Functions

```cpp
void printWatchdog()
```
Print comprehensive system status (heartbeat).  
**Frequency:** Every 5 minutes (normal) or 1 minute (calibration)  
**Displays:**
- System readiness
- Uptime and boot count
- Network status
- Time information
- Next transmission time

```cpp
void setCalibrationMode(bool enabled)
```
Enable or disable calibration mode at runtime.  
**Parameters:** `enabled` - true for calibration, false for normal  
**Effects:**
- Changes sensor read interval
- Displays mode information
- Does NOT disconnect/reconnect MQTT

```cpp
void toggleCalibrationMode()
```
Toggle between calibration and normal modes.  
**Effects:** Calls `setCalibrationMode(!isCalibrationMode)`

---

## 📊 Performance Specifications

### Timing Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Boot to Ready | 15-20s | With WiFi + MQTT |
| WiFi Connection | 5-10s | Depends on network |
| MQTT SSL Handshake | 2-5s | SSL negotiation |
| NTP Sync | 1-3s | Per sync attempt |
| Sensor Read (Normal) | 5ms | Per sensor |
| Sensor Read (Calibration) | 5ms | Same as normal |
| Data Transmission | 100-500ms | Depends on payload |
| Loop Iteration | 100ms | Normal mode |
| Loop Iteration (Calibration) | 10ms | Fast mode |

### Memory Usage

| Component | RAM | Flash |
|-----------|-----|-------|
| Global Variables | ~2KB | - |
| MQTT Buffer | 768B | - |
| Sensor Buffers | 180B | - |
| String Constants | ~500B saved | ~5KB |
| Calibration Tables | ~100B saved | ~200B |
| **Total Estimated** | **~60%** | **~75%** |

### Network Statistics

| Metric | Value | Notes |
|--------|-------|-------|
| MQTT Packet Size (Data) | ~250B | JSON sensor payload |
| MQTT Packet Size (Registration) | ~400B | Includes metadata |
| MQTT Packet Size (Presence) | ~200B | Lightweight status |
| Data Transmission Frequency | 30 min | Clock-synchronized |
| MQTT Keep-Alive | 90s | Broker timeout |
| WiFi Status Check | 1s | Cached |

---

## 🛡️ Security Considerations

### Current Security Measures

1. **MQTT SSL/TLS Encryption**
   - Port 8883 (encrypted)
   - Certificate validation
   - Prevents eavesdropping

2. **WiFi Password Protection**
   - WPA2 security
   - Access Point requires password
   - Credentials saved in EEPROM

3. **Device Authentication**
   - MQTT username/password
   - Server approval required
   - Unique device ID

### Security Recommendations

1. **Change Default Credentials:**
   ```cpp
   #define MQTT_USERNAME "YourSecureUsername"
   #define MQTT_PASSWORD "YourSecurePassword"
   #define AP_PASSWORD "YourStrongPassword"
   ```

2. **EEPROM Encryption (Future):**
   - Currently stored in plain text
   - Consider encrypting WiFi password
   - Use hardware crypto if available

3. **Web Portal Authentication (Future):**
   - Currently no authentication
   - Add basic auth for production
   - Use in controlled environment only

4. **Firmware Updates:**
   - Only upload from trusted sources
   - Verify firmware integrity
   - Keep libraries updated

---

## 📞 Support

### Getting Help

1. **Check Serial Monitor:**
   - Baud rate: 115200
   - Line ending: Both NL & CR
   - Look for error messages

2. **System Status:**
   ```cpp
   printSystemReadiness();  // Show module states
   printWatchdog();         // Show system status
   ```

3. **Factory Reset:**
   ```cpp
   clearEEPROM();  // Reset to factory defaults
   ```

4. **Contact Information:**
   - Project: PureTrack
   - Email: [support@puretrack.com]
   - Documentation: Check README.md

---

## 📜 Version History

### v8.0.0 - December 2025 (Current)
- ✅ Added System Readiness Framework
- ✅ Enhanced documentation throughout code
- ✅ Improved time validation for data transmission
- ✅ Added comprehensive module status tracking
- ✅ Refined NTP sync retry logic
- ✅ Created detailed API reference documentation

### v7.0.0 - December 2025
- ✅ Added WiFi Manager with web portal
- ✅ Implemented WiFi credential EEPROM persistence
- ✅ Simplified HTML for microcontroller performance
- ✅ Enhanced POST request parsing with validation
- ✅ Added comprehensive inline documentation
- ✅ Optimized for Arduino UNO R4 WiFi platform

---

## 📄 License

**Copyright © 2025 PureTrack Team**  
**All Rights Reserved**

This firmware is proprietary software developed for the PureTrack Water Quality Monitoring System. Unauthorized copying, modification, or distribution is prohibited.

---

**Document Version:** 1.0  
**Last Updated:** December 2025  
**Firmware Compatibility:** v8.0.0+

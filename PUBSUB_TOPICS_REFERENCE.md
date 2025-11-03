# Pub/Sub Topics Reference

This document provides a complete reference for all MQTT and Pub/Sub topics used in the Water Quality Monitoring System. It ensures alignment between device firmware, MQTT bridge, and Cloud Functions.

## Table of Contents
1. [Overview](#overview)
2. [Topic Architecture](#topic-architecture)
3. [Device Topics (MQTT)](#device-topics-mqtt)
4. [Bridge Mappings](#bridge-mappings)
5. [Cloud Functions (Pub/Sub)](#cloud-functions-pubsub)
6. [Constants Reference](#constants-reference)
7. [Complete Flow Diagrams](#complete-flow-diagrams)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The system uses a three-tier messaging architecture:
1. **Device Layer**: Arduino devices publish to MQTT topics
2. **Bridge Layer**: MQTT-to-Pub/Sub bridge forwards messages
3. **Cloud Layer**: Firebase Cloud Functions process Pub/Sub messages

All topics are now **verified and aligned** across all layers.

---

## Topic Architecture

```
┌──────────────┐       MQTT        ┌──────────────┐      Pub/Sub      ┌──────────────┐
│   Device     │ ───────────────> │ MQTT Bridge  │ ──────────────> │   Cloud      │
│  (Arduino)   │                    │   (Node.js)  │                  │  Functions   │
└──────────────┘                    └──────────────┘                  └──────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │  Pub/Sub     │
                                    │  (GCP)       │
                                    └──────────────┘
                                           ▲
                                           │
                                    Device Commands
```

---

## Device Topics (MQTT)

### Published by Device

| Purpose | Topic Pattern | Example | QoS |
|---------|--------------|---------|-----|
| Sensor Data | `device/sensordata/{deviceId}` | `device/sensordata/arduino_uno_r4_001` | 1 |
| Registration | `device/registration/{deviceId}` | `device/registration/arduino_uno_r4_001` | 1 |
| Status | `device/status/{deviceId}` | `device/status/arduino_uno_r4_001` | 1 |

### Subscribed by Device

| Purpose | Topic Pattern | Example | QoS |
|---------|--------------|---------|-----|
| Commands | `device/command/{deviceId}` | `device/command/arduino_uno_r4_001` | 1 |
| Discovery | `device/discovery/request` | `device/discovery/request` | 1 |

### Device Code Reference

```cpp
// From device_config/Arduino_Uno_R4.ino
#define DEVICE_ID "arduino_uno_r4_001"
#define TOPIC_SENSOR_DATA "device/sensordata/" DEVICE_ID
#define TOPIC_REGISTRATION "device/registration/" DEVICE_ID
#define TOPIC_STATUS "device/status/" DEVICE_ID
#define TOPIC_COMMAND "device/command/" DEVICE_ID
#define TOPIC_DISCOVERY "device/discovery/request"
```

---

## Bridge Mappings

The MQTT Bridge (`mqtt-bridge/index.js`) forwards messages between MQTT and Pub/Sub.

### MQTT → Pub/Sub

| MQTT Topic Pattern | Pub/Sub Topic | Immediate/Buffered |
|--------------------|---------------|-------------------|
| `device/sensordata/+` | `iot-sensor-readings` | Buffered (60s) |
| `device/registration/+` | `iot-device-registration` | Immediate |
| `device/status/+` | `iot-device-status` | Immediate |

### Pub/Sub → MQTT

| Pub/Sub Subscription | MQTT Topic (from attributes) | Purpose |
|---------------------|----------------------------|---------|
| `device-commands-sub` | `device/command/{deviceId}` | Device-specific commands |
| `device-commands-sub` | `device/discovery/request` | Broadcast discovery |

### Bridge Code Reference

```javascript
// From mqtt-bridge/index.js
const TOPIC_MAPPINGS = {
  'device/sensordata/+': 'iot-sensor-readings',
  'device/registration/+': 'iot-device-registration',
  'device/status/+': 'iot-device-status',
};

const COMMAND_SUBSCRIPTION = 'device-commands-sub';
```

---

## Cloud Functions (Pub/Sub)

### Pub/Sub Triggers

| Function | Pub/Sub Topic | Purpose | Source |
|----------|---------------|---------|--------|
| `processSensorData` | `iot-sensor-readings` | Process sensor data, create alerts | Device sensor readings |
| `autoRegisterDevice` | `iot-device-registration` | Auto-register new devices | Device registration |
| `monitorDeviceStatus` | `iot-device-status` | Track device online/offline | Device status updates |

### Pub/Sub Publishers

| Function | Publishes To | MQTT Target | Purpose |
|----------|-------------|-------------|---------|
| `deviceManagement.handleDiscoverDevices` | `device-commands` | `device/discovery/request` | Broadcast discovery |
| `deviceManagement.handleSendCommand` | `device-commands` | `device/command/{deviceId}` | Send device command |

### Functions Code Reference

```typescript
// From functions/src/constants/pubsub.constants.ts
export const PUBSUB_TOPICS = {
  SENSOR_DATA: "iot-sensor-readings",
  DEVICE_REGISTRATION: "iot-device-registration",
  DEVICE_STATUS: "iot-device-status",
  DEVICE_COMMANDS: "device-commands",
  SYSTEM_EVENTS: "system-events",
} as const;
```

---

## Constants Reference

### Pub/Sub Topics Constants

**File:** `functions/src/constants/pubsub.constants.ts`

```typescript
export const PUBSUB_TOPICS = {
  SENSOR_DATA: "iot-sensor-readings",
  DEVICE_REGISTRATION: "iot-device-registration",
  DEVICE_STATUS: "iot-device-status",
  DEVICE_COMMANDS: "device-commands",
  SYSTEM_EVENTS: "system-events",
} as const;
```

### MQTT Topics Constants

**File:** `functions/src/constants/deviceManagement.constants.ts`

```typescript
export const MQTT_TOPICS = {
  DISCOVERY_REQUEST: "device/discovery/request",
  DISCOVERY_RESPONSE: "device/discovery/response",
  COMMAND_PREFIX: "device/command/",
  STATUS_PREFIX: "device/status/",
  SENSOR_DATA_PREFIX: "device/sensordata/",
} as const;
```

---

## Complete Flow Diagrams

### Sensor Data Flow

```
┌─────────────┐
│   Device    │
│ (Arduino)   │
└──────┬──────┘
       │ MQTT Publish
       │ device/sensordata/arduino_uno_r4_001
       │
       ▼
┌──────────────┐
│ MQTT Bridge  │
│  (Node.js)   │
└──────┬───────┘
       │ Buffer 60s, then publish
       │ iot-sensor-readings
       │
       ▼
┌──────────────────────┐
│ processSensorData    │
│ (Cloud Function)     │
│ - Store in RTDB      │
│ - Check thresholds   │
│ - Create alerts      │
│ - Send notifications │
└──────────────────────┘
```

### Device Registration Flow

```
┌─────────────┐
│   Device    │
│ (Arduino)   │
└──────┬──────┘
       │ MQTT Publish
       │ device/registration/arduino_uno_r4_001
       │ { deviceId, name, type, firmwareVersion, ... }
       │
       ▼
┌──────────────┐
│ MQTT Bridge  │
│  (Node.js)   │
└──────┬───────┘
       │ Publish immediately
       │ iot-device-registration
       │
       ▼
┌──────────────────────┐
│ autoRegisterDevice   │
│ (Cloud Function)     │
│ - Create device doc  │
│ - Init RTDB struct   │
│ - Set online status  │
└──────────────────────┘
```

### Status Update Flow

```
┌─────────────┐
│   Device    │
│ (Arduino)   │
└──────┬──────┘
       │ MQTT Publish (every 5 min)
       │ device/status/arduino_uno_r4_001
       │ { status: "online", uptime, rssi }
       │
       ▼
┌──────────────┐
│ MQTT Bridge  │
│  (Node.js)   │
└──────┬───────┘
       │ Publish immediately
       │ iot-device-status
       │
       ▼
┌──────────────────────┐
│ monitorDeviceStatus  │
│ (Cloud Function)     │
│ - Update status      │
│ - Update lastSeen    │
└──────────────────────┘
```

### Command Flow

```
┌──────────────────────┐
│ Frontend/API         │
│ deviceManagement.ts  │
└──────┬───────────────┘
       │ Pub/Sub Publish
       │ device-commands
       │ Attributes: { mqtt_topic: "device/command/arduino_uno_r4_001" }
       │ { command: "READ_SENSORS" }
       │
       ▼
┌──────────────┐
│ MQTT Bridge  │
│  (Node.js)   │
│ Subscription │
└──────┬───────┘
       │ MQTT Publish
       │ device/command/arduino_uno_r4_001
       │
       ▼
┌─────────────┐
│   Device    │
│ (Arduino)   │
│ - Execute   │
└─────────────┘
```

### Discovery Flow

```
┌──────────────────────┐
│ Frontend/API         │
│ handleDiscoverDevices│
└──────┬───────────────┘
       │ Pub/Sub Publish
       │ device-commands
       │ Attributes: { mqtt_topic: "device/discovery/request" }
       │ { command: "DISCOVER" }
       │
       ▼
┌──────────────┐
│ MQTT Bridge  │
│  (Node.js)   │
└──────┬───────┘
       │ MQTT Broadcast
       │ device/discovery/request
       │
       ▼
┌─────────────┐
│ All Devices │
│ (Listening) │
│ - Respond   │
└─────────────┘
```

---

## Troubleshooting

### Device Not Registering

**Symptom:** Device connects but doesn't appear in Firestore

**Check:**
1. Device publishes to: `device/registration/{deviceId}`
2. Bridge subscribes to: `device/registration/+`
3. Bridge forwards to: `iot-device-registration`
4. Function listens to: `iot-device-registration` ✅

**Solution:** Ensure all topics match the patterns above.

---

### Sensor Data Not Appearing

**Symptom:** Device publishes but data doesn't reach Cloud Functions

**Check:**
1. Device publishes to: `device/sensordata/{deviceId}` (lowercase)
2. Bridge subscribes to: `device/sensordata/+`
3. Bridge forwards to: `iot-sensor-readings`
4. Function listens to: `iot-sensor-readings` ✅

**Note:** Bridge buffers sensor data for 60 seconds before publishing to Pub/Sub.

---

### Commands Not Reaching Device

**Symptom:** Commands sent from frontend don't reach device

**Check:**
1. Function publishes to: `device-commands` topic
2. Message attributes include: `mqtt_topic: "device/command/{deviceId}"`
3. Bridge has subscription: `device-commands-sub`
4. Bridge forwards to MQTT: `device/command/{deviceId}`
5. Device subscribes to: `device/command/{deviceId}` ✅

**Solution:** Verify Pub/Sub subscription `device-commands-sub` exists in GCP.

---

### Status Updates Not Working

**Symptom:** Device status remains offline or stale

**Check:**
1. Device publishes to: `device/status/{deviceId}`
2. Bridge subscribes to: `device/status/+`
3. Bridge forwards to: `iot-device-status`
4. Function listens to: `iot-device-status` ✅

---

## Deployment Checklist

Before deploying, ensure:

- [ ] All Pub/Sub topics exist in GCP:
  - [ ] `iot-sensor-readings`
  - [ ] `iot-device-registration`
  - [ ] `iot-device-status`
  - [ ] `device-commands`

- [ ] Pub/Sub subscription exists:
  - [ ] `device-commands-sub` → `device-commands` topic

- [ ] MQTT Bridge has correct credentials:
  - [ ] `MQTT_BROKER`
  - [ ] `MQTT_USERNAME`
  - [ ] `MQTT_PASSWORD`

- [ ] Device firmware is configured:
  - [ ] WiFi credentials
  - [ ] MQTT broker URL
  - [ ] Device ID is unique

- [ ] Cloud Functions deployed:
  - [ ] `processSensorData`
  - [ ] `autoRegisterDevice`
  - [ ] `monitorDeviceStatus`
  - [ ] `deviceManagement`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-03 | Initial documentation after topic alignment fix |

**Last Updated:** 2025-01-03  
**Verified:** All topics aligned and tested

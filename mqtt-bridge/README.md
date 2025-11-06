# MQTT-to-Pub/Sub Bridge

> **Enterprise-grade IoT message broker bridge connecting MQTT devices to Google Cloud Pub/Sub with intelligent buffering, monitoring, and fault tolerance.**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/status-production-success)](https://mqtt-bridge-8158575421.us-central1.run.app/health)

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Endpoints](#-api-endpoints)
- [Monitoring & Metrics](#-monitoring--metrics)
- [Message Flow](#-message-flow)
- [Error Handling](#-error-handling)
- [Performance Tuning](#-performance-tuning)
- [Troubleshooting](#-troubleshooting)
- [Development](#-development)

---

## 🎯 Overview

The MQTT-to-Pub/Sub Bridge is a production-ready Node.js service that acts as a reliable intermediary between IoT devices communicating via MQTT and Google Cloud Platform's Pub/Sub messaging system. It provides:

- **Real-time message routing** from MQTT topics to GCP Pub/Sub topics
- **Intelligent buffering** to optimize throughput and reduce API calls
- **Fault tolerance** with circuit breakers and exponential backoff
- **Observability** through structured logging and Prometheus metrics
- **Graceful shutdown** ensuring zero message loss during deployment

### Use Case

This bridge is designed for IoT ecosystems where:
- Devices publish sensor data via MQTT (lightweight protocol)
- Backend services consume messages via Pub/Sub (scalable, managed)
- Reliability and observability are critical requirements
- Cost optimization through message batching is important

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   IoT Devices   │  MQTT   │  MQTT-Pub/Sub    │ Pub/Sub │  GCP Services   │
│  (Arduino/ESP)  │────────▶│     Bridge       │────────▶│  (Cloud Fns)    │
│                 │         │  (This Service)  │         │  (Firestore)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌────────────────┐
                            │  Monitoring    │
                            │  (Prometheus)  │
                            │  (Logs/Alerts) │
                            └────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **MQTT Client** | `mqtt` (v5.3.0) | Connects to HiveMQ Cloud, subscribes to device topics |
| **Pub/Sub Client** | `@google-cloud/pubsub` (v5.2.0) | Publishes messages to GCP Pub/Sub with batching |
| **Message Buffer** | In-memory Map | Accumulates messages for batch publishing |
| **Circuit Breaker** | `opossum` (v8.1.4) | Protects against cascading failures |
| **HTTP Server** | `express` (v4.19.2) | Exposes health checks and metrics |
| **Logger** | `pino` (v10.1.0) | Structured, high-performance logging |
| **Metrics** | `prom-client` (v15.1.3) | Prometheus-compatible metrics |

---

## ✨ Key Features

### 1. **Intelligent Message Buffering**
- **Adaptive Flushing**: Automatically flushes when buffer reaches 80% capacity
- **Time-based Flushing**: Periodic flush every 10 seconds (configurable)
- **Batch Optimization**: Publishes up to 500 messages per batch to Pub/Sub
- **Memory Safety**: Monitors buffer size across all topics

**Configuration:**
```javascript
BUFFER_INTERVAL_MS: 10000      // Flush interval (10 seconds)
MAX_BUFFER_SIZE: 200           // Max messages per topic
BUFFER_FLUSH_THRESHOLD: 0.8    // Adaptive flush at 80%
```

### 2. **Fault Tolerance & Resilience**

#### Circuit Breaker Pattern
Prevents overwhelming Pub/Sub during outages:
- **Opens** when 50% of requests fail within timeout window
- **Half-open** after 30 seconds to test recovery
- **Closes** when requests succeed again

```javascript
Circuit Breaker Settings:
- Timeout: 3000ms
- Error Threshold: 50%
- Reset Timeout: 30 seconds
```

#### Exponential Backoff
Retries failed publishes with intelligent backoff:
```javascript
Retry Strategy:
- Initial Delay: 100ms
- Time Multiplier: 2x
- Max Delay: 5000ms
- Max Attempts: 3
- Jitter: Full (randomized)
```

#### Dead Letter Queue (DLQ)
Failed messages after 3 retries are sent to `iot-failed-messages-dlq` topic with:
- Original message payload
- Error details and stack trace
- Retry count and timestamps
- Original topic reference

### 3. **Quality of Service (QoS)**

Different QoS levels for different message types:
- **Sensor Data**: QoS 0 (At most once) - High throughput, occasional loss acceptable
- **Device Registration**: QoS 1 (At least once) - Guaranteed delivery, critical events

### 4. **Memory Management**

Active monitoring prevents OOM crashes:
- **Check Interval**: 30 seconds
- **Warning Threshold**: 85% heap usage
- **Critical Threshold**: 95% heap usage (triggers GC if available)

```javascript
Memory Monitoring:
✓ Tracks heap usage, RSS, and external memory
✓ Logs warnings at 85% capacity
✓ Force garbage collection at 95%
```

### 5. **Observability**

#### Structured Logging (Pino)
- **Development**: Pretty-printed, colorized logs
- **Production**: JSON-formatted for log aggregation
- **Log Levels**: `debug`, `info`, `warn`, `error`

#### Prometheus Metrics
Exported via `/metrics` endpoint:

| Metric | Type | Description |
|--------|------|-------------|
| `mqtt_message_latency_seconds` | Histogram | End-to-end processing time |
| `mqtt_buffer_utilization_percent` | Gauge | Buffer fill percentage |
| `mqtt_publish_success_total` | Counter | Successful publishes |
| `mqtt_publish_failure_total` | Counter | Failed publishes by error type |
| `mqtt_messages_buffered_total` | Counter | Total buffered messages |
| `mqtt_messages_dropped_total` | Counter | Overflow/dropped messages |
| `mqtt_circuit_breaker_open` | Gauge | Circuit breaker state (0/1) |
| `nodejs_*` | Various | Node.js runtime metrics |

### 6. **Graceful Shutdown**

Zero message loss during deployments:
1. Stop accepting new messages
2. Stop timers (buffer flusher, memory monitor)
3. Flush all buffered messages (5-second timeout)
4. Publish "offline" status to `bridge/status` topic
5. Close MQTT connection gracefully
6. Exit process

**Shutdown Grace Period**: 8 seconds

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Google Cloud Project** with:
  - Pub/Sub API enabled
  - Service account with `roles/pubsub.publisher` permission
  - Service account JSON key file
- **MQTT Broker**: HiveMQ Cloud (or compatible MQTT v5 broker)
- **Docker** (for containerized deployment)
- **Google Cloud SDK** (for Cloud Run deployment)

---

## 🚀 Installation

### Local Development

1. **Clone the repository:**
```bash
git clone <repository-url>
cd mqtt-bridge
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```bash
cp .env.example .env
```

4. **Configure environment variables:**
```env
# MQTT Broker Credentials
MQTT_BROKER_URL=mqtts://your-broker.hivemq.cloud:8883
MQTT_USERNAME=your-mqtt-username
MQTT_PASSWORD=your-mqtt-password

# Google Cloud Configuration
GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Optional Settings
PORT=8080
NODE_ENV=development
LOG_LEVEL=info
```

5. **Run the service:**
```bash
npm start
```

---

## ⚙️ Configuration

### Environment Variables

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MQTT_BROKER_URL` | MQTT broker connection URL | `mqtts://broker.hivemq.cloud:8883` |
| `MQTT_USERNAME` | MQTT authentication username | `mqtt-bridge` |
| `MQTT_PASSWORD` | MQTT authentication password | `your-secure-password` |
| `GCP_PROJECT_ID` | Google Cloud project ID | `my-project-12345` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON | `/path/to/key.json` |

#### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `8080` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging verbosity | `info` |

### Hardcoded Configuration

These settings are optimized for 10-15 devices and can be modified in `index.js`:

```javascript
// Pub/Sub Topics
PUBSUB_TOPIC: 'iot-sensor-readings'
PUBSUB_DEVICE_REGISTRATION_TOPIC: 'iot-device-registration'
PUBSUB_DLQ_TOPIC: 'iot-failed-messages-dlq'

// Buffer Settings
BUFFER_INTERVAL_MS: 10000          // 10 seconds
MAX_BUFFER_SIZE: 200               // messages
BUFFER_FLUSH_THRESHOLD: 0.8        // 80%

// MQTT Settings
MQTT_KEEPALIVE: 120                // seconds
MQTT_RECONNECT_PERIOD: 5000        // milliseconds
QOS_SENSOR_DATA: 0                 // QoS level
QOS_REGISTRATION: 1                // QoS level

// Pub/Sub Batching
PUBSUB_MAX_MESSAGES: 500
PUBSUB_MAX_MILLIS: 50
PUBSUB_MAX_BYTES: 5242880          // 5 MB

// Memory Monitoring
MEMORY_CHECK_INTERVAL: 30000       // 30 seconds
MEMORY_WARNING_PERCENT: 85
MEMORY_CRITICAL_PERCENT: 95

// Graceful Shutdown
SHUTDOWN_GRACE_PERIOD: 8000        // 8 seconds
```

### Topic Mapping

MQTT topics are automatically mapped to Pub/Sub topics:

| MQTT Topic Pattern | Pub/Sub Topic | QoS |
|--------------------|---------------|-----|
| `device/sensordata/+` | `iot-sensor-readings` | 0 |
| `device/registration/+` | `iot-device-registration` | 1 |

**Note**: The `+` wildcard matches any device ID (e.g., `device/sensordata/ESP32_001`)

---

## 📦 Deployment

### Docker Deployment

#### Build the image:
```bash
docker build -t mqtt-bridge:latest .
```

#### Run locally:
```bash
docker run -d \
  --name mqtt-bridge \
  -p 8080:8080 \
  --env-file .env \
  mqtt-bridge:latest
```

### Google Cloud Run Deployment

#### 1. Build and push to Container Registry:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/mqtt-bridge
```

#### 2. Deploy to Cloud Run:
```bash
gcloud run deploy mqtt-bridge \
  --image gcr.io/YOUR_PROJECT_ID/mqtt-bridge \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 3 \
  --set-env-vars="GCP_PROJECT_ID=your-project-id,MQTT_BROKER_URL=mqtts://broker.url:8883,MQTT_USERNAME=username,MQTT_PASSWORD=password,NODE_ENV=production,LOG_LEVEL=info"
```

#### 3. Verify deployment:
```bash
curl https://mqtt-bridge-XXXXX.us-central1.run.app/health
```

### Cloud Run Configuration Recommendations

| Setting | Value | Reason |
|---------|-------|--------|
| **Memory** | 512Mi | Sufficient for buffering + Node.js runtime |
| **CPU** | 1 | Single-threaded Node.js process |
| **Min Instances** | 1 | Maintains warm connection to MQTT broker |
| **Max Instances** | 3 | Handles traffic spikes, MQTT clients are stateful |
| **Timeout** | 300s | Allows graceful shutdown to complete |
| **Concurrency** | 80 | Default, sufficient for HTTP endpoints |

---

## 🌐 API Endpoints

### GET `/health`

**Health check endpoint** for load balancers and monitoring systems.

**Response:**
```json
{
  "status": "healthy",          // "healthy", "degraded", or "unhealthy"
  "timestamp": "2025-11-06T06:30:00.000Z",
  "uptime": 125.5,
  "checks": {
    "mqtt": {
      "connected": true,
      "clientId": "mqtt_bridge_1730875800000_1"
    },
    "memory": {
      "heapUsed": "35MB",
      "heapTotal": "40MB",
      "rss": "95MB",
      "percent": 87
    },
    "buffers": {
      "iot-sensor-readings": {
        "messages": 12,
        "utilization": 6
      },
      "iot-device-registration": {
        "messages": 0,
        "utilization": 0
      }
    }
  },
  "metrics": {
    "received": 1250,
    "published": 1200,
    "failed": 5,
    "commands": 0,
    "flushes": 25,
    "messagesInDLQ": 5,
    "circuitBreakerOpen": false
  }
}
```

**Status Codes:**
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is degraded or unhealthy

**Health Criteria:**
- `healthy`: MQTT connected, memory < 85%, buffer < 80%
- `degraded`: Memory 85-95% or buffer > 80%
- `unhealthy`: MQTT disconnected or memory > 95%

---

### GET `/status`

**Simple status endpoint** for quick checks.

**Response:**
```json
{
  "uptime": 125.5,
  "memory": {
    "rss": 99614720,
    "heapTotal": 41820160,
    "heapUsed": 36428896,
    "external": 3713024,
    "arrayBuffers": 662356
  },
  "metrics": {
    "received": 1250,
    "published": 1200,
    "failed": 5,
    "commands": 0,
    "flushes": 25,
    "messagesInDLQ": 5,
    "circuitBreakerOpen": false
  },
  "buffers": {
    "iot-sensor-readings": 12,
    "iot-device-registration": 0
  },
  "mqtt": {
    "connected": true
  }
}
```

---

### GET `/metrics`

**Prometheus metrics endpoint** for monitoring systems.

**Response Format:** Prometheus text-based exposition format

**Sample Output:**
```
# HELP mqtt_message_latency_seconds End-to-end message processing latency
# TYPE mqtt_message_latency_seconds histogram
mqtt_message_latency_seconds_bucket{le="0.001",topic_type="telemetry"} 850
mqtt_message_latency_seconds_bucket{le="0.005",topic_type="telemetry"} 1200
mqtt_message_latency_seconds_bucket{le="0.01",topic_type="telemetry"} 1250
mqtt_message_latency_seconds_sum{topic_type="telemetry"} 2.5
mqtt_message_latency_seconds_count{topic_type="telemetry"} 1250

# HELP mqtt_buffer_utilization_percent Message buffer utilization percentage
# TYPE mqtt_buffer_utilization_percent gauge
mqtt_buffer_utilization_percent{topic="iot-sensor-readings"} 6

# HELP mqtt_publish_success_total Successful Pub/Sub publishes
# TYPE mqtt_publish_success_total counter
mqtt_publish_success_total{topic="iot-sensor-readings"} 1200

# HELP mqtt_circuit_breaker_open Circuit breaker status (1=open, 0=closed)
# TYPE mqtt_circuit_breaker_open gauge
mqtt_circuit_breaker_open 0
```

**Usage with Prometheus:**
```yaml
scrape_configs:
  - job_name: 'mqtt-bridge'
    static_configs:
      - targets: ['mqtt-bridge-url:8080']
    metrics_path: /metrics
    scrape_interval: 15s
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Monitor

#### 1. **Message Throughput**
- `mqtt_messages_buffered_total` - Total messages received
- `mqtt_publish_success_total` - Successfully published messages
- `mqtt_publish_failure_total` - Failed publishes (alert on spikes)

#### 2. **Latency**
- `mqtt_message_latency_seconds` - End-to-end processing time
  - **Target**: < 50ms for 95th percentile
  - **Alert**: > 200ms sustained

#### 3. **Buffer Health**
- `mqtt_buffer_utilization_percent` - Buffer fill level
  - **Target**: < 50% average
  - **Alert**: > 80% sustained

#### 4. **Circuit Breaker**
- `mqtt_circuit_breaker_open` - Circuit breaker state
  - **Alert**: Value = 1 (circuit open)

#### 5. **Memory Usage**
- `nodejs_heap_size_used_bytes` / `nodejs_heap_size_total_bytes`
  - **Target**: < 70%
  - **Alert**: > 85%

### Recommended Alerts

```yaml
# Prometheus Alert Rules
groups:
  - name: mqtt_bridge_alerts
    rules:
      # Circuit Breaker Open
      - alert: MQTTBridgeCircuitOpen
        expr: mqtt_circuit_breaker_open == 1
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MQTT Bridge circuit breaker is open"
          description: "Pub/Sub is unavailable or degraded"

      # High Buffer Utilization
      - alert: MQTTBridgeHighBuffer
        expr: mqtt_buffer_utilization_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Message buffer is above 80%"
          description: "Buffer at {{ $value }}% - may indicate Pub/Sub slowdown"

      # High Failure Rate
      - alert: MQTTBridgeHighFailures
        expr: rate(mqtt_publish_failure_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High message failure rate detected"
          description: "{{ $value }} failures/sec"

      # MQTT Disconnected
      - alert: MQTTBridgeDisconnected
        expr: up{job="mqtt-bridge"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MQTT Bridge is down"
          description: "Health check failing"
```

### Logging Best Practices

**Log Levels:**
- `DEBUG`: Message-level tracing (use sparingly in production)
- `INFO`: Connection events, buffer flushes, metrics
- `WARN`: Retries, high memory, buffer thresholds
- `ERROR`: Failed publishes, connection errors

**Production Logging:**
```bash
# Set log level in production
LOG_LEVEL=info

# View logs in Cloud Run
gcloud run services logs read mqtt-bridge --region us-central1 --limit 100
```

---

## 🔄 Message Flow

### 1. Device Publishes to MQTT

**Arduino/ESP32 Device:**
```cpp
// Sensor data
mqtt.publish("device/sensordata/ESP32_001", "{\"temp\":25.5,\"humidity\":60}");

// Device registration
mqtt.publish("device/registration/ESP32_001", "{\"deviceType\":\"ESP32\",\"version\":\"1.0\"}");
```

### 2. Bridge Receives Message

```javascript
handleMQTTMessage(topic, message)
├── Parse message payload (JSON)
├── Match topic pattern (device/sensordata/+)
├── Extract deviceId (ESP32_001)
├── Determine priority (normal/urgent)
├── Create message envelope
│   ├── data: Buffer(JSON)
│   ├── attributes:
│   │   ├── deviceId: "ESP32_001"
│   │   ├── topic: "device/sensordata/ESP32_001"
│   │   ├── timestamp: ISO timestamp
│   │   ├── correlationId: UUID
│   │   └── source: "mqtt-bridge"
│   └── priority: "normal" | "urgent"
└── addToBuffer(pubSubTopic, messageData)
```

### 3. Message Buffering

```javascript
addToBuffer(topicName, message)
├── Push to buffer array
├── Increment metrics.received
├── Check buffer utilization
│   ├── If >= 80%: Flush immediately
│   └── If total >= 200: Flush all buffers
└── Continue
```

### 4. Buffer Flushing (Periodic or Threshold)

```javascript
flushMessageBuffer(topicName)
├── Get messages from buffer
├── Split into chunks of 500
└── For each chunk:
    ├── Use circuit breaker
    ├── Exponential backoff retry
    │   ├── Attempt 1: immediate
    │   ├── Attempt 2: 100ms delay
    │   └── Attempt 3: 200ms delay
    ├── Publish to Pub/Sub
    │   ├── Success: Increment publishSuccess
    │   └── Failure: Move to DLQ after 3 attempts
    └── Clear buffer
```

### 5. Cloud Function Consumes Message

**Pub/Sub Subscription:**
```javascript
// Cloud Function triggered by iot-sensor-readings
exports.processSensorData = functions.pubsub
  .topic('iot-sensor-readings')
  .onPublish(async (message) => {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
    const deviceId = message.attributes.deviceId;
    
    // Store in Firestore
    await admin.firestore().collection('sensor_readings').add({
      deviceId,
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  });
```

---

## 🛡️ Error Handling

### Error Categories

#### 1. **Transient Errors** (Retryable)
- Network timeouts
- Pub/Sub quota exceeded
- Temporary broker disconnections

**Handling:**
- Exponential backoff (3 attempts)
- Circuit breaker protection
- Messages remain in buffer

#### 2. **Permanent Errors** (Non-retryable)
- Invalid message format
- Authentication failures
- Permission denied

**Handling:**
- Immediate failure
- Send to Dead Letter Queue
- Log error details

#### 3. **Resource Exhaustion**
- Memory > 95%
- Buffer overflow
- Connection pool exhausted

**Handling:**
- Memory: Force GC, log critical
- Buffer: Flush immediately
- Connections: Circuit breaker opens

### Dead Letter Queue (DLQ)

Failed messages are published to `iot-failed-messages-dlq` with metadata:

```json
{
  "data": {
    "original": "message payload"
  },
  "attributes": {
    "deviceId": "ESP32_001",
    "topic": "device/sensordata/ESP32_001",
    "timestamp": "2025-11-06T06:30:00.000Z",
    "correlationId": "uuid-here",
    "source": "mqtt-bridge",
    "originalError": "Error message",
    "failedAt": "2025-11-06T06:30:05.000Z",
    "retryCount": "3",
    "originalTopic": "iot-sensor-readings"
  }
}
```

**Analyzing DLQ:**
```bash
# Pull messages from DLQ
gcloud pubsub subscriptions pull iot-failed-messages-dlq-sub --limit=10 --auto-ack

# Count failed messages
gcloud pubsub subscriptions describe iot-failed-messages-dlq-sub --format="value(numMessagesInBacklog)"
```

---

## ⚡ Performance Tuning

### Scaling Guidelines

| Devices | Memory | CPU | Min Instances | Buffer Size | Flush Interval |
|---------|--------|-----|---------------|-------------|----------------|
| 1-10 | 256Mi | 1 | 1 | 100 | 10s |
| 10-50 | 512Mi | 1 | 1 | 200 | 10s |
| 50-100 | 1Gi | 2 | 2 | 500 | 5s |
| 100-500 | 2Gi | 2 | 2 | 1000 | 5s |

### Optimization Tips

#### 1. **Increase Buffer Size**
For high-throughput scenarios:
```javascript
MAX_BUFFER_SIZE: 1000          // From 200
BUFFER_FLUSH_THRESHOLD: 0.9    // From 0.8
```

#### 2. **Reduce Flush Interval**
For lower latency:
```javascript
BUFFER_INTERVAL_MS: 5000       // From 10000 (5 seconds)
```

#### 3. **Adjust Pub/Sub Batching**
For larger messages:
```javascript
PUBSUB_MAX_MESSAGES: 1000      // From 500
PUBSUB_MAX_BYTES: 10485760     // 10 MB (from 5 MB)
```

#### 4. **Tune Circuit Breaker**
For less sensitive failure detection:
```javascript
errorThresholdPercentage: 70   // From 50
resetTimeout: 60000            // 60 seconds (from 30)
```

### Benchmarking

**Expected Performance (512Mi, 1 CPU):**
- **Throughput**: 1000-2000 messages/second
- **Latency (p50)**: < 10ms
- **Latency (p95)**: < 50ms
- **Latency (p99)**: < 200ms

**Load Testing:**
```bash
# Using MQTT load generator
npm install -g mqtt-benchmark

mqtt-benchmark \
  --broker mqtt://your-broker:1883 \
  --topic device/sensordata/test \
  --count 10000 \
  --interval 10 \
  --qos 0 \
  --payload '{"temp":25.5,"humidity":60}'
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. **MQTT Connection Failing**

**Symptoms:**
- Health check shows `"connected": false`
- Logs: `MQTT error` or `MQTT connection closed`

**Solutions:**
```bash
# Check credentials
echo $MQTT_USERNAME
echo $MQTT_PASSWORD

# Test broker connectivity
mosquitto_sub -h broker.hivemq.cloud -p 8883 -t "test" \
  -u $MQTT_USERNAME -P $MQTT_PASSWORD \
  --capath /etc/ssl/certs/

# Verify firewall rules (allow outbound 8883)
```

#### 2. **Pub/Sub Permission Denied**

**Symptoms:**
- Logs: `Failed to publish` with `403 Forbidden`
- Metrics: High `mqtt_publish_failure_total`

**Solutions:**
```bash
# Verify service account has Publisher role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:mqtt-bridge@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Check credentials path
echo $GOOGLE_APPLICATION_CREDENTIALS
cat $GOOGLE_APPLICATION_CREDENTIALS | jq .project_id
```

#### 3. **High Memory Usage**

**Symptoms:**
- Health check shows `"status": "degraded"`
- Logs: `High memory usage warning`

**Solutions:**
```bash
# Increase Cloud Run memory
gcloud run services update mqtt-bridge \
  --memory 1Gi \
  --region us-central1

# Reduce buffer size (edit config)
MAX_BUFFER_SIZE: 100           # From 200

# Reduce flush interval (flush more frequently)
BUFFER_INTERVAL_MS: 5000       # From 10000
```

#### 4. **Messages Not Arriving**

**Symptoms:**
- Devices publish successfully
- No messages in Pub/Sub subscriptions

**Solutions:**
```bash
# Check MQTT topic pattern
# Device publishes to: device/sensordata/ESP32_001
# Bridge subscribes to: device/sensordata/+
# ✓ Match

# Check Pub/Sub topic exists
gcloud pubsub topics list | grep iot-sensor-readings

# Create missing topic
gcloud pubsub topics create iot-sensor-readings

# Check subscription
gcloud pubsub subscriptions list --filter="topic=iot-sensor-readings"

# Pull messages manually
gcloud pubsub subscriptions pull your-subscription --auto-ack --limit=1
```

#### 5. **Circuit Breaker Open**

**Symptoms:**
- Metrics: `mqtt_circuit_breaker_open = 1`
- Logs: `Circuit breaker OPEN - Pub/Sub unavailable`

**Solutions:**
```bash
# Check Pub/Sub quota
gcloud pubsub topics describe iot-sensor-readings

# Check Cloud Run logs for errors
gcloud run services logs read mqtt-bridge --region us-central1 --limit 50

# Wait for auto-recovery (30 seconds)
# Or restart service to force reset
gcloud run services update mqtt-bridge --region us-central1 --no-traffic
gcloud run services update mqtt-bridge --region us-central1 --to-latest
```

### Debug Mode

Enable verbose logging:
```bash
# Local development
LOG_LEVEL=debug npm start

# Cloud Run
gcloud run services update mqtt-bridge \
  --update-env-vars="LOG_LEVEL=debug" \
  --region us-central1
```

---

## 🛠️ Development

### Project Structure

```
mqtt-bridge/
├── index.js              # Main application code
├── package.json          # Dependencies and scripts
├── Dockerfile            # Container image definition
├── .env                  # Local environment variables (gitignored)
├── .env.example          # Template for environment variables
└── README.md             # This file
```

### Dependencies

**Production Dependencies:**
```json
{
  "@google-cloud/pubsub": "^5.2.0",      // GCP Pub/Sub client
  "compression": "^1.7.4",                // HTTP compression
  "dotenv": "^16.4.5",                    // Environment variables
  "exponential-backoff": "^3.1.1",        // Retry logic
  "express": "^4.19.2",                   // HTTP server
  "mqtt": "^5.3.0",                       // MQTT client
  "opossum": "^8.1.4",                    // Circuit breaker
  "pino": "^10.1.0",                      // Logger
  "pino-pretty": "^11.0.0",               // Log formatter
  "prom-client": "^15.1.3",               // Prometheus metrics
  "uuid": "^10.0.0"                       // UUID generation
}
```

### Scripts

```json
{
  "start": "node index.js",       // Production start
  "dev": "node index.js"          // Development start
}
```

### Testing Locally

#### 1. **Start the bridge:**
```bash
npm start
```

#### 2. **Publish test message:**
```bash
# Using mosquitto_pub
mosquitto_pub \
  -h 36965de434ff42a4a93a697c94a13ad7.s1.eu.hivemq.cloud \
  -p 8883 \
  -u mqtt-bridge \
  -P "Jaffmier@0924" \
  -t "device/sensordata/TEST_001" \
  -m '{"temp":25.5,"humidity":60}' \
  --capath /etc/ssl/certs/
```

#### 3. **Check logs:**
```bash
# Should see:
# INFO: Message buffered
# INFO: Flushing messages
# INFO: Published successfully
```

#### 4. **Verify in Pub/Sub:**
```bash
gcloud pubsub subscriptions pull iot-sensor-readings-sub --auto-ack --limit=1
```

### Code Modification Guide

#### Adding a New Topic Mapping

```javascript
// In TOPIC_MAPPINGS
const TOPIC_MAPPINGS = {
  'device/sensordata/+': CONFIG.PUBSUB_TOPIC,
  'device/registration/+': CONFIG.PUBSUB_DEVICE_REGISTRATION_TOPIC,
  'device/alerts/+': 'iot-device-alerts'  // ← New mapping
};
```

#### Adjusting Buffer Behavior

```javascript
// In addToBuffer function
const utilization = buffer.length / CONFIG.MAX_BUFFER_SIZE;
if (utilization >= 0.5) {  // ← Changed from 0.8 to 0.5 (50%)
  logger.info('Buffer at threshold, flushing');
  flushMessageBuffer(topicName);
}
```

#### Custom Retry Logic

```javascript
// In flushMessageBuffer function
await backOff(
  async () => {
    return await publishBreaker.fire(topic, chunk);
  },
  {
    numOfAttempts: 5,      // ← Changed from 3 to 5
    maxDelay: 10000,       // ← Changed from 5000 to 10000
    // ... other options
  }
);
```

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

---

## 📞 Support

For issues, questions, or contributions:

- **GitHub Issues**: [Create an issue](https://github.com/your-repo/mqtt-bridge/issues)
- **Email**: support@yourproject.com
- **Documentation**: [Full docs](https://docs.yourproject.com)

---

## 🎓 Additional Resources

- [MQTT Protocol Specification](https://mqtt.org/mqtt-specification/)
- [Google Cloud Pub/Sub Documentation](https://cloud.google.com/pubsub/docs)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/best-practices)

---

**Last Updated**: November 6, 2025  
**Version**: 2.0.0  
**Deployed**: [https://mqtt-bridge-8158575421.us-central1.run.app](https://mqtt-bridge-8158575421.us-central1.run.app)

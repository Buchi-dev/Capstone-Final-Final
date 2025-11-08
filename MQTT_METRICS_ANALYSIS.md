# MQTT Bridge Metrics Analysis & Optimization Report

**Date:** November 8, 2025  
**Purpose:** Identify unused metrics and optimize MQTT bridge for better performance

---

## 📊 Current Metrics in MQTT Bridge

### ✅ **USED METRICS** (Keep - Displayed in Admin Dashboard)

#### 1. **Core Message Metrics** ✅
- **`metrics.received`** - Total messages received from MQTT
  - **Used in:** DashboardSummary (LiveMetricIndicator), MetricsGrid
  - **Purpose:** Shows real-time incoming message throughput
  - **Status:** ✅ KEEP

- **`metrics.published`** - Total messages published to Pub/Sub
  - **Used in:** DashboardSummary (LiveMetricIndicator), MetricsGrid
  - **Purpose:** Shows real-time outgoing message throughput
  - **Status:** ✅ KEEP

- **`metrics.failed`** - Failed message publishes
  - **Used in:** MetricsGrid
  - **Purpose:** Shows publishing failures
  - **Status:** ✅ KEEP

#### 2. **Buffer Metrics** ✅
- **`metrics.flushes`** - Total buffer flush operations
  - **Used in:** MetricsGrid
  - **Purpose:** Tracks buffer flush frequency
  - **Status:** ✅ KEEP

- **`health.checks.buffers[topic].messages`** - Messages in each buffer
  - **Used in:** BufferMonitor
  - **Purpose:** Shows buffer fill level
  - **Status:** ✅ KEEP

- **`health.checks.buffers[topic].utilization`** - Buffer utilization %
  - **Used in:** BufferMonitor
  - **Purpose:** Shows buffer capacity usage
  - **Status:** ✅ KEEP

#### 3. **Circuit Breaker Metrics** ✅
- **`metrics.circuitBreakerOpen`** - Circuit breaker status (boolean)
  - **Used in:** MetricsGrid
  - **Purpose:** Shows if Pub/Sub is failing
  - **Status:** ✅ KEEP

#### 4. **Memory Metrics** ✅
- **`status.memory.rss`** - Resident Set Size (total RAM)
  - **Used in:** DashboardSummary, MemoryMonitor, SystemInfo
  - **Purpose:** Shows total RAM usage vs 256MB limit
  - **Status:** ✅ KEEP

- **`status.memory.heapUsed`** - Heap memory used
  - **Used in:** MemoryMonitor, SystemInfo, DashboardSummary
  - **Purpose:** Shows V8 heap usage
  - **Status:** ✅ KEEP

- **`status.memory.heapTotal`** - Total heap allocated
  - **Used in:** MemoryMonitor, SystemInfo, DashboardSummary
  - **Purpose:** Shows max heap allocation
  - **Status:** ✅ KEEP

- **`health.checks.memory.percent`** - Heap usage percentage
  - **Used in:** MemoryMonitor
  - **Purpose:** Quick health indicator
  - **Status:** ✅ KEEP

#### 5. **Connection Metrics** ✅
- **`health.checks.mqtt.connected`** - MQTT connection status
  - **Used in:** DashboardSummary, HealthOverview, SystemInfo
  - **Purpose:** Shows MQTT broker connection
  - **Status:** ✅ KEEP

- **`health.status`** - Overall health ('healthy', 'degraded', 'unhealthy')
  - **Used in:** DashboardSummary, HealthOverview
  - **Purpose:** Overall system status
  - **Status:** ✅ KEEP

#### 6. **Uptime Metrics** ✅
- **`status.uptime`** - Process uptime in seconds
  - **Used in:** SystemInfo
  - **Purpose:** Shows system stability
  - **Status:** ✅ KEEP

---

### ❌ **UNUSED METRICS** (Remove for Optimization)

#### 1. **`metrics.commands`** ❌
- **Location in Code:** Line 170 (`metrics.commands = 0`)
- **Displayed in:** MetricsGrid (Commands Processed card)
- **Problem:** Command subscription was removed (line 468) - this counter is NEVER incremented
- **Impact:** Displayed value is always 0
- **Action:** ❌ REMOVE - Delete metric tracking and UI display

#### 2. **`metrics.messagesInDLQ`** ❌
- **Location in Code:** Line 174 (`metrics.messagesInDLQ = 0`)
- **Displayed in:** MetricsGrid (Dead Letter Queue card)
- **Problem:** DLQ functionality removed (line 345) - metric NEVER incremented
- **Impact:** Displayed value is always 0
- **Action:** ❌ REMOVE - Delete metric tracking and UI display

#### 3. **`status.memory.external`** ❌
- **Location in Code:** Returned in `/status` endpoint
- **Displayed in:** SystemInfo (Memory Details)
- **Usage:** Only displayed in detailed view, not used in health calculations
- **Action:** ⚠️ OPTIONAL REMOVE - Low priority, provides minimal value

#### 4. **`status.memory.arrayBuffers`** ❌
- **Location in Code:** Returned in `/status` endpoint
- **Displayed in:** SystemInfo (Memory Details)
- **Usage:** Only displayed in detailed view, not used in health calculations
- **Action:** ⚠️ OPTIONAL REMOVE - Low priority, provides minimal value

#### 5. **Prometheus Metrics** ⚠️
- **All Prometheus metrics** (messageLatency, bufferUtilization, publishSuccess, etc.)
- **Problem:** Prometheus endpoint `/metrics` exists but is NEVER called by the dashboard
- **Usage:** Dashboard only uses `/health` and `/status` endpoints
- **Impact:** These metrics consume memory for tracking but provide no value to current system
- **Action:** ⚠️ CONSIDER REMOVING if no external monitoring (Grafana, Prometheus) is configured

---

## 🚀 Optimization Recommendations

### **Priority 1: Remove Dead Code (Immediate)**

#### ❌ Remove `metrics.commands`
**Impact:** Minimal memory savings (~100 bytes), improves code clarity

**Changes Required:**
1. **mqtt-bridge/index.js** (Line 172): Remove `commands: 0` from metrics object
2. **mqtt-bridge/index.js** (Line 556): Remove commands from `/health` response
3. **MetricsGrid.tsx** (Lines 120-135): Remove "Commands Processed" card

#### ❌ Remove `metrics.messagesInDLQ`
**Impact:** Minimal memory savings (~100 bytes), improves code clarity

**Changes Required:**
1. **mqtt-bridge/index.js** (Line 174): Remove `messagesInDLQ: 0` from metrics object
2. **mqtt-bridge/index.js** (Line 556): Remove messagesInDLQ from `/health` response
3. **MetricsGrid.tsx** (Lines 137-152): Remove "Dead Letter Queue" card

---

### **Priority 2: Optional Memory Optimizations**

#### ⚠️ Remove Unused Memory Fields
**Impact:** Negligible memory savings, reduces response payload

**Changes Required:**
1. **mqtt-bridge/index.js** (Line 599): Remove `external` and `arrayBuffers` from `/status` memory response
2. **SystemInfo.tsx** (Lines 100-105): Remove external and arrayBuffers display

---

### **Priority 3: Consider Removing Prometheus (If Not Used)**

If you're **NOT** using external monitoring (Grafana, Prometheus, Datadog):

**Impact:** 
- Save ~5-10MB memory (histogram buckets, counter maps)
- Reduce CPU overhead from metric updates
- Simplify codebase

**Changes Required:**
1. Remove all Prometheus imports and metric declarations (Lines 10, 95-134)
2. Remove metric updates throughout code:
   - `messageLatency.labels(...).observe(...)` (Line 403)
   - `messagesBuffered.labels(...).inc()` (Line 243)
   - `publishSuccess.labels(...).inc(...)` (Line 274)
   - `publishFailure.labels(...).inc(...)` (Line 279)
   - `circuitBreakerStatus.set(...)` (Lines 202, 208, 214)
3. Remove `/metrics` endpoint (Lines 586-593)
4. Uninstall `prom-client` package

---

## 📈 Summary Table

| Metric | Type | Status | Used By | Action |
|--------|------|--------|---------|--------|
| received | Counter | ✅ Used | DashboardSummary, MetricsGrid | KEEP |
| published | Counter | ✅ Used | DashboardSummary, MetricsGrid | KEEP |
| failed | Counter | ✅ Used | MetricsGrid | KEEP |
| flushes | Counter | ✅ Used | MetricsGrid | KEEP |
| circuitBreakerOpen | Boolean | ✅ Used | MetricsGrid | KEEP |
| **commands** | Counter | ❌ Unused | MetricsGrid (shows 0) | **REMOVE** |
| **messagesInDLQ** | Counter | ❌ Unused | MetricsGrid (shows 0) | **REMOVE** |
| memory.rss | Number | ✅ Used | DashboardSummary, MemoryMonitor | KEEP |
| memory.heapUsed | Number | ✅ Used | DashboardSummary, MemoryMonitor | KEEP |
| memory.heapTotal | Number | ✅ Used | DashboardSummary, MemoryMonitor | KEEP |
| memory.percent | Number | ✅ Used | MemoryMonitor | KEEP |
| memory.external | Number | ⚠️ Low Value | SystemInfo only | OPTIONAL |
| memory.arrayBuffers | Number | ⚠️ Low Value | SystemInfo only | OPTIONAL |
| buffers[].messages | Number | ✅ Used | BufferMonitor | KEEP |
| buffers[].utilization | Number | ✅ Used | BufferMonitor | KEEP |
| mqtt.connected | Boolean | ✅ Used | DashboardSummary, HealthOverview | KEEP |
| health.status | String | ✅ Used | DashboardSummary, HealthOverview | KEEP |
| uptime | Number | ✅ Used | SystemInfo | KEEP |
| **Prometheus metrics** | Various | ⚠️ Unused | None (no /metrics calls) | **CONSIDER REMOVING** |

---

## 🎯 Expected Benefits

### After Removing Dead Code (commands, messagesInDLQ):
- ✅ Cleaner codebase (less confusion)
- ✅ Slightly smaller response payloads
- ✅ No confusing "0" values in dashboard
- ✅ ~200 bytes memory savings

### After Removing Prometheus (if not used):
- ✅ 5-10MB memory savings
- ✅ Reduced CPU overhead on message processing
- ✅ Simpler maintenance
- ✅ Faster startup time

---

## 🛠️ Implementation Plan

### Phase 1: Remove Dead Metrics (15 minutes)
1. Update `mqtt-bridge/index.js` - remove commands, messagesInDLQ
2. Update `MetricsGrid.tsx` - remove cards
3. Test `/health` endpoint response
4. Verify dashboard displays correctly

### Phase 2: Optional Cleanup (10 minutes)
1. Remove external/arrayBuffers from memory tracking
2. Update SystemInfo.tsx display

### Phase 3: Prometheus Removal (30 minutes) - IF DECIDED
1. Remove all prom-client code
2. Remove /metrics endpoint
3. Remove all metric update calls
4. Test thoroughly

---

## ✅ Next Steps

1. **Review this analysis** with the team
2. **Decide on Prometheus** - Do you need external monitoring?
3. **Implement Priority 1 changes** (dead code removal)
4. **Test changes** in development environment
5. **Deploy to Cloud Run** with updated MQTT bridge
6. **Verify dashboard** shows correct metrics

---

**Created by:** GitHub Copilot  
**Project:** Capstone IoT Monitoring System  
**MQTT Bridge URL:** https://mqtt-bridge-8158575421.us-central1.run.app

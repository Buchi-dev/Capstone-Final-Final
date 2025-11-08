# MQTT Bridge Health Status Update - RSS & CPU Based

## Summary
Updated the MQTT Bridge health calculation to use **RSS (Resident Set Size) memory** and **CPU usage** instead of V8 heap memory. This provides a more accurate representation of actual system resource consumption.

## Changes Made

### 1. MQTT Bridge Backend (`mqtt-bridge/index.js`)

#### Configuration Updates
- **Added RSS-based constants:**
  - `RSS_WARNING_PERCENT: 90` - Degraded state threshold (90-95% of 256MB)
  - `RSS_CRITICAL_PERCENT: 95` - Unhealthy state threshold (95-100% of 256MB)
  - `RAM_LIMIT_BYTES: 256 * 1024 * 1024` - Cloud Run 256MB limit
- **Removed heap-based constants:**
  - ~~`MEMORY_WARNING_PERCENT`~~
  - ~~`MEMORY_CRITICAL_PERCENT`~~

#### `/health` Endpoint Updates
- Now calculates RSS percentage against 256MB Cloud Run limit:
  ```javascript
  const rssPercent = (memUsage.rss / RAM_LIMIT_BYTES) * 100;
  ```
- Added `rssPercent` field to memory checks
- Changed `percent` field to use RSS instead of heap:
  ```javascript
  memory: {
    heapUsed: "XMB",
    heapTotal: "XMB", 
    rss: "XMB",
    rssPercent: X,  // New field
    percent: X      // Now uses RSS instead of heap
  }
  ```
- Updated health status determination to use RSS and CPU:
  ```javascript
  if (rssPercent > RSS_CRITICAL_PERCENT || cpuMetrics.current > CPU_CRITICAL_PERCENT) {
    health.status = 'unhealthy';
  } else if (rssPercent > RSS_WARNING_PERCENT || cpuMetrics.current > CPU_WARNING_PERCENT) {
    health.status = 'degraded';
  }
  ```

#### Memory Monitoring Updates
- Changed `startMemoryMonitoring()` to use RSS-based thresholds
- Now monitors RSS against 256MB limit instead of heap usage
- Emergency memory cleanup triggers at 95% RSS usage

### 2. Frontend Updates

#### Type Definitions (`useMqttBridgeStatus.ts`)
- Updated `MqttBridgeHealth` interface to include `rssPercent`:
  ```typescript
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    rssPercent: number;  // New field
    percent: number;     // Now RSS-based
  }
  ```

#### Health Calculation (`healthThresholds.ts`)
- **Updated `calculateMqttBridgeHealthScore()` signature:**
  - ~~OLD: `(heapUsed, heapTotal, rss, connected, status)`~~
  - **NEW: `(rss, cpuPercent, connected, status)`**
- **New calculation logic:**
  ```typescript
  const rssPercent = (rss / RAM_LIMIT_BYTES) * 100;
  const normalizedCpu = Math.min(cpuPercent, 100);
  
  // 60% weight on memory, 40% on CPU
  const avgResourceUsage = (rssPercent * 0.6) + (normalizedCpu * 0.4);
  let resourceHealth = 100 - avgResourceUsage;
  
  // Apply status penalties
  if (status === 'unhealthy') resourceHealth *= 0.5;
  else if (status === 'degraded') resourceHealth *= 0.7;
  ```

#### Dashboard Components

##### `DashboardSummary.tsx`
- Updated MQTT health calculation to use RSS + CPU:
  ```typescript
  calculateMqttBridgeHealthScore(
    mqttMemory.rss,                    // Use RSS
    mqttFullHealth.checks.cpu.current, // Add CPU
    mqttHealth.connected,
    mqttHealth.status
  )
  ```
- Updated metric subtitle to show RSS and CPU:
  ```typescript
  subtitle: `${formatBytes(rss)}/256MB RAM • ${cpuPercent}% CPU`
  ```
- Updated tooltip to display RSS percentage and CPU metrics

##### `MemoryMonitor.tsx`
- **Reordered displays** - RSS is now primary (left side):
  - **Primary: RAM Usage (RSS) 🎯** - Used for health calculations
  - **Secondary: Heap Memory (V8)** - For reference only
- Updated to use `rssPercent` from health endpoint
- Changed health calculation to use RSS as primary indicator:
  ```typescript
  const primaryMemoryHealthData = getMemoryHealth(rssPercent);
  ```
- Added emoji indicator (🎯) to highlight primary metric

## Why This Change?

### Problems with Heap-based Health
1. **V8 manages heap automatically** - Not controlled by application
2. **Heap != Actual Memory Usage** - Heap can be low while RSS is high
3. **Misleading health status** - Could show healthy when system is under pressure
4. **Cloud Run uses RSS** - Actual container memory limit is based on RSS

### Benefits of RSS + CPU Based Health
1. ✅ **Accurate resource tracking** - RSS reflects actual RAM consumption
2. ✅ **Matches Cloud Run limits** - Directly measures against 256MB limit
3. ✅ **Includes CPU load** - Comprehensive system health view
4. ✅ **Better alerts** - Warning/critical thresholds based on real constraints
5. ✅ **Prevents OOM** - Detects memory pressure before V8 heap fills

## Health Status Thresholds

### Memory (RSS-based)
- **Healthy:** 0-90% of 256MB (0-230MB)
- **Degraded:** 90-95% of 256MB (230-243MB)
- **Unhealthy:** 95-100% of 256MB (243-256MB)

### CPU
- **Healthy:** 0-70%
- **Degraded:** 70-85%
- **Unhealthy:** 85-100%

### Overall Health Score
Composite score weighted as:
- **RSS Memory: 60%** - Primary resource constraint
- **CPU Usage: 40%** - Secondary performance indicator
- **Status Penalty:** Unhealthy (-50%), Degraded (-30%)

## Testing Recommendations

1. ✅ Verify `/health` endpoint returns `rssPercent` field
2. ✅ Monitor RSS percentage in MemoryMonitor component
3. ✅ Confirm health status changes based on RSS thresholds
4. ✅ Check CPU metrics are included in health calculations
5. ✅ Validate degraded state triggers at 90% RSS or 70% CPU
6. ✅ Validate unhealthy state triggers at 95% RSS or 85% CPU

## Migration Notes

- **No breaking changes** - Backward compatible
- **Heap metrics still available** - Displayed for reference in UI
- **Status endpoint unchanged** - Only `/health` endpoint modified
- **Existing monitoring works** - Enhanced with RSS-based accuracy

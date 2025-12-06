# DATA ASSESSMENT QUERIES
## MongoDB Queries for Pre-DSS Data Audit

**Purpose:** Execute these queries against your MongoDB instance to assess current data quality and readiness for DSS implementation.

---

## 1. COLLECTION INVENTORY

### 1.1 List All Collections
```javascript
db.getCollectionNames()
```

### 1.2 Document Counts
```javascript
db.devices.countDocuments()
db.sensorreadings.countDocuments()
db.alerts.countDocuments()
db.users.countDocuments()
db.reports.countDocuments()
```

### 1.3 Collection Size Analysis
```javascript
db.stats()
db.devices.stats()
db.sensorreadings.stats()
db.alerts.stats()
```

---

## 2. DEVICE DATA QUALITY

### 2.1 Device Registration Status
```javascript
db.devices.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      registered: { $sum: { $cond: ["$isRegistered", 1, 0] }},
      pending: { $sum: { $cond: [{ $eq: ["$registrationStatus", "pending"] }, 1, 0] }},
      online: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] }},
      offline: { $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] }},
      deleted: { $sum: { $cond: ["$isDeleted", 1, 0] }}
    }
  }
])
```

### 2.2 Device Metadata Completeness
```javascript
db.devices.aggregate([
  {
    $match: {
      isDeleted: false
    }
  },
  {
    $project: {
      deviceId: 1,
      name: 1,
      hasName: { $and: [{ $ne: ["$name", ""] }, { $ne: ["$name", null] }] },
      hasLocation: { $and: [{ $ne: ["$location", ""] }, { $ne: ["$location", null] }] },
      hasFirmware: { $and: [{ $ne: ["$firmwareVersion", ""] }, { $ne: ["$firmwareVersion", null] }] },
      hasMacAddress: { $and: [{ $ne: ["$macAddress", ""] }, { $ne: ["$macAddress", null] }] },
      hasIPAddress: { $and: [{ $ne: ["$ipAddress", ""] }, { $ne: ["$ipAddress", null] }] },
      hasSensors: { $gt: [{ $size: { $ifNull: ["$sensors", []] }}, 0] },
      hasMetadataBuilding: { $ne: ["$metadata.location.building", null] },
      hasMetadataFloor: { $ne: ["$metadata.location.floor", null] },
      registrationComplete: "$isRegistered",
      status: 1,
      lastSeen: 1
    }
  },
  {
    $addFields: {
      completenessScore: {
        $add: [
          { $cond: ["$hasName", 1, 0] },
          { $cond: ["$hasLocation", 1, 0] },
          { $cond: ["$hasFirmware", 1, 0] },
          { $cond: ["$hasMacAddress", 1, 0] },
          { $cond: ["$hasIPAddress", 1, 0] },
          { $cond: ["$hasSensors", 1, 0] },
          { $cond: ["$hasMetadataBuilding", 1, 0] },
          { $cond: ["$hasMetadataFloor", 1, 0] }
        ]
      },
      lastSeenRecent: {
        $gte: ["$lastSeen", new Date(Date.now() - 24*60*60*1000)]
      }
    }
  },
  {
    $group: {
      _id: null,
      totalDevices: { $sum: 1 },
      avgCompletenessScore: { $avg: "$completenessScore" },
      fullyComplete: { $sum: { $cond: [{ $eq: ["$completenessScore", 8] }, 1, 0] }},
      partiallyComplete: { $sum: { $cond: [{ $and: [{ $gt: ["$completenessScore", 0] }, { $lt: ["$completenessScore", 8] }] }, 1, 0] }},
      noMetadata: { $sum: { $cond: [{ $eq: ["$completenessScore", 0] }, 1, 0] }},
      activeDevices: { $sum: { $cond: ["$lastSeenRecent", 1, 0] }}
    }
  }
])
```

### 2.3 Location Consistency Check
```javascript
db.devices.aggregate([
  {
    $match: {
      isDeleted: false,
      location: { $ne: "" }
    }
  },
  {
    $group: {
      _id: "$location",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

### 2.4 Device Types Distribution
```javascript
db.devices.aggregate([
  {
    $match: { isDeleted: false }
  },
  {
    $group: {
      _id: "$type",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

### 2.5 Missing Critical Fields
```javascript
db.devices.find({
  isDeleted: false,
  $or: [
    { currentFilterType: { $exists: false } },
    { lastFilterChange: { $exists: false } },
    { installationDate: { $exists: false } },
    { totalOperatingHours: { $exists: false } }
  ]
}, {
  deviceId: 1,
  name: 1,
  location: 1,
  currentFilterType: 1,
  lastFilterChange: 1,
  installationDate: 1,
  totalOperatingHours: 1
})
```

---

## 3. SENSOR DATA QUALITY

### 3.1 Reading Count by Device (Last 30 Days)
```javascript
db.sensorreadings.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
      isDeleted: false
    }
  },
  {
    $group: {
      _id: "$deviceId",
      readingCount: { $sum: 1 },
      firstReading: { $min: "$timestamp" },
      lastReading: { $max: "$timestamp" }
    }
  },
  {
    $addFields: {
      daysCovered: {
        $divide: [
          { $subtract: ["$lastReading", "$firstReading"] },
          1000 * 60 * 60 * 24
        ]
      },
      avgReadingsPerDay: {
        $divide: [
          "$readingCount",
          {
            $divide: [
              { $subtract: ["$lastReading", "$firstReading"] },
              1000 * 60 * 60 * 24
            ]
          }
        ]
      }
    }
  },
  {
    $sort: { readingCount: -1 }
  }
])
```

### 3.2 Sensor Validity Analysis
```javascript
db.sensorreadings.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
      isDeleted: false
    }
  },
  {
    $group: {
      _id: "$deviceId",
      totalReadings: { $sum: 1 },
      validPH: { $sum: { $cond: ["$pH_valid", 1, 0] }},
      validTDS: { $sum: { $cond: ["$tds_valid", 1, 0] }},
      validTurbidity: { $sum: { $cond: ["$turbidity_valid", 1, 0] }},
      nullPH: { $sum: { $cond: [{ $eq: ["$pH", null] }, 1, 0] }},
      nullTDS: { $sum: { $cond: [{ $eq: ["$tds", null] }, 1, 0] }},
      nullTurbidity: { $sum: { $cond: [{ $eq: ["$turbidity", null] }, 1, 0] }},
      avgPH: { $avg: "$pH" },
      avgTDS: { $avg: "$tds" },
      avgTurbidity: { $avg: "$turbidity" }
    }
  },
  {
    $project: {
      deviceId: "$_id",
      totalReadings: 1,
      phValidityRate: { 
        $multiply: [
          { $divide: ["$validPH", "$totalReadings"] }, 
          100
        ] 
      },
      tdsValidityRate: { 
        $multiply: [
          { $divide: ["$validTDS", "$totalReadings"] }, 
          100
        ] 
      },
      turbidityValidityRate: { 
        $multiply: [
          { $divide: ["$validTurbidity", "$totalReadings"] }, 
          100
        ] 
      },
      phNullRate: { 
        $multiply: [
          { $divide: ["$nullPH", "$totalReadings"] }, 
          100
        ] 
      },
      tdsNullRate: { 
        $multiply: [
          { $divide: ["$nullTDS", "$totalReadings"] }, 
          100
        ] 
      },
      turbidityNullRate: { 
        $multiply: [
          { $divide: ["$nullTurbidity", "$totalReadings"] }, 
          100
        ] 
      },
      avgPH: { $round: ["$avgPH", 2] },
      avgTDS: { $round: ["$avgTDS", 2] },
      avgTurbidity: { $round: ["$avgTurbidity", 2] }
    }
  },
  {
    $sort: { totalReadings: -1 }
  }
])
```

### 3.3 Data Temporal Coverage
```javascript
db.sensorreadings.aggregate([
  {
    $match: { isDeleted: false }
  },
  {
    $group: {
      _id: "$deviceId",
      minTimestamp: { $min: "$timestamp" },
      maxTimestamp: { $max: "$timestamp" },
      readingCount: { $sum: 1 }
    }
  },
  {
    $addFields: {
      coverageDays: {
        $divide: [
          { $subtract: ["$maxTimestamp", "$minTimestamp"] },
          1000 * 60 * 60 * 24
        ]
      }
    }
  },
  {
    $project: {
      deviceId: "$_id",
      firstReading: "$minTimestamp",
      lastReading: "$maxTimestamp",
      coverageDays: { $round: ["$coverageDays", 1] },
      readingCount: 1
    }
  },
  {
    $sort: { coverageDays: -1 }
  }
])
```

### 3.4 Identify Data Gaps (Devices with >6hr gaps)
```javascript
// Note: This is a complex query; run per device
// Replace 'DEVICE_ID_HERE' with actual device ID
db.sensorreadings.aggregate([
  {
    $match: {
      deviceId: "DEVICE_ID_HERE",
      isDeleted: false
    }
  },
  {
    $sort: { timestamp: 1 }
  },
  {
    $group: {
      _id: "$deviceId",
      readings: { $push: { timestamp: "$timestamp", id: "$_id" }}
    }
  },
  {
    $unwind: { path: "$readings", includeArrayIndex: "idx" }
  },
  {
    $lookup: {
      from: "sensorreadings",
      let: { currentIdx: "$idx", allReadings: "$readings" },
      pipeline: [
        { $match: { $expr: { $eq: ["$deviceId", "$$currentDeviceId"] }}},
        { $sort: { timestamp: 1 }},
        { $skip: { $add: ["$$currentIdx", 1] }},
        { $limit: 1 }
      ],
      as: "nextReading"
    }
  }
  // This query is illustrative; actual gap detection requires application-level logic
])
```

### 3.5 Out-of-Range Values (Anomalies)
```javascript
db.sensorreadings.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) },
      isDeleted: false,
      $or: [
        { pH: { $lt: 0, $gt: 14 }},
        { turbidity: { $lt: 0 }},
        { tds: { $lt: 0 }}
      ]
    }
  },
  {
    $group: {
      _id: "$deviceId",
      invalidPH: { $sum: { $cond: [{ $or: [{ $lt: ["$pH", 0] }, { $gt: ["$pH", 14] }] }, 1, 0] }},
      negativeTurbidity: { $sum: { $cond: [{ $lt: ["$turbidity", 0] }, 1, 0] }},
      negativeTDS: { $sum: { $cond: [{ $lt: ["$tds", 0] }, 1, 0] }}
    }
  }
])
```

---

## 4. ALERT DATA ANALYSIS

### 4.1 Alert Distribution by Severity
```javascript
db.alerts.aggregate([
  {
    $match: {
      isDeleted: false,
      timestamp: { $gte: new Date(Date.now() - 90*24*60*60*1000) } // Last 90 days
    }
  },
  {
    $group: {
      _id: "$severity",
      count: { $sum: 1 }
    }
  },
  {
    $sort: { count: -1 }
  }
])
```

### 4.2 Alert Frequency by Device
```javascript
db.alerts.aggregate([
  {
    $match: {
      isDeleted: false,
      timestamp: { $gte: new Date(Date.now() - 90*24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: "$deviceId",
      totalAlerts: { $sum: 1 },
      criticalAlerts: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] }},
      warningAlerts: { $sum: { $cond: [{ $eq: ["$severity", "Warning"] }, 1, 0] }},
      advisoryAlerts: { $sum: { $cond: [{ $eq: ["$severity", "Advisory"] }, 1, 0] }},
      firstAlert: { $min: "$timestamp" },
      lastAlert: { $max: "$timestamp" }
    }
  },
  {
    $addFields: {
      avgAlertsPerDay: {
        $divide: [
          "$totalAlerts",
          {
            $divide: [
              { $subtract: ["$lastAlert", "$firstAlert"] },
              1000 * 60 * 60 * 24
            ]
          }
        ]
      }
    }
  },
  {
    $sort: { totalAlerts: -1 }
  }
])
```

### 4.3 Alert Response Time Analysis
```javascript
db.alerts.aggregate([
  {
    $match: {
      isDeleted: false,
      acknowledgedAt: { $exists: true },
      timestamp: { $gte: new Date(Date.now() - 90*24*60*60*1000) }
    }
  },
  {
    $addFields: {
      responseTimeMinutes: {
        $divide: [
          { $subtract: ["$acknowledgedAt", "$timestamp"] },
          1000 * 60
        ]
      }
    }
  },
  {
    $group: {
      _id: "$severity",
      avgResponseTime: { $avg: "$responseTimeMinutes" },
      minResponseTime: { $min: "$responseTimeMinutes" },
      maxResponseTime: { $max: "$responseTimeMinutes" },
      count: { $sum: 1 }
    }
  },
  {
    $project: {
      severity: "$_id",
      avgResponseTime: { $round: ["$avgResponseTime", 2] },
      minResponseTime: { $round: ["$minResponseTime", 2] },
      maxResponseTime: { $round: ["$maxResponseTime", 2] },
      count: 1
    }
  }
])
```

### 4.4 Unresolved Alerts
```javascript
db.alerts.find({
  isDeleted: false,
  status: { $ne: "Resolved" }
}, {
  alertId: 1,
  deviceId: 1,
  deviceName: 1,
  severity: 1,
  parameter: 1,
  message: 1,
  timestamp: 1,
  status: 1
}).sort({ timestamp: -1 }).limit(50)
```

---

## 5. CROSS-COLLECTION ANALYSIS

### 5.1 Devices Without Recent Sensor Data
```javascript
// Get all device IDs
const allDeviceIds = db.devices.distinct("deviceId", { 
  isDeleted: false, 
  isRegistered: true 
});

// Get devices with recent readings (last 24 hours)
const devicesWithRecentData = db.sensorreadings.distinct("deviceId", {
  timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) },
  isDeleted: false
});

// Find difference (devices without data)
const devicesWithoutData = allDeviceIds.filter(id => !devicesWithRecentData.includes(id));
print(`Devices without recent data: ${devicesWithoutData.length}`);
printjson(devicesWithoutData);
```

### 5.2 Devices with High Alert Rate but Good Sensor Data
```javascript
db.alerts.aggregate([
  {
    $match: {
      isDeleted: false,
      timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: "$deviceId",
      alertCount: { $sum: 1 }
    }
  },
  {
    $match: {
      alertCount: { $gte: 10 } // 10+ alerts in last 30 days
    }
  },
  {
    $lookup: {
      from: "devices",
      localField: "_id",
      foreignField: "deviceId",
      as: "device"
    }
  },
  {
    $unwind: "$device"
  },
  {
    $project: {
      deviceId: "$_id",
      deviceName: "$device.name",
      location: "$device.location",
      status: "$device.status",
      alertCount: 1
    }
  },
  {
    $sort: { alertCount: -1 }
  }
])
```

### 5.3 Data Volume Summary (All Collections)
```javascript
print("=== DATA VOLUME SUMMARY ===\n");

const collections = ["devices", "sensorreadings", "alerts", "users", "reports"];

collections.forEach(col => {
  const count = db[col].countDocuments();
  const size = db[col].stats().size;
  const avgDocSize = count > 0 ? size / count : 0;
  
  print(`${col}:`);
  print(`  Documents: ${count.toLocaleString()}`);
  print(`  Total Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
  print(`  Avg Doc Size: ${avgDocSize.toFixed(0)} bytes\n`);
});
```

---

## 6. DSS READINESS ASSESSMENT

### 6.1 Check for DSS-Required Fields (Will ALL Fail Currently)
```javascript
db.devices.find({
  isDeleted: false,
  currentFilterType: { $exists: true },
  lastFilterChange: { $exists: true },
  installationDate: { $exists: true },
  totalOperatingHours: { $exists: true, $gte: 100 }
}).count()

// Expected result: 0 (no devices have these fields yet)
```

### 6.2 Check for Maintenance Logs Collection
```javascript
try {
  db.maintenance_logs.countDocuments();
} catch (e) {
  print("✗ maintenance_logs collection does not exist");
}
```

### 6.3 Check for Device Runtime Collection
```javascript
try {
  db.device_runtime.countDocuments();
} catch (e) {
  print("✗ device_runtime collection does not exist");
}
```

### 6.4 Check for Filter Inventory Collection
```javascript
try {
  db.filter_inventory.countDocuments();
} catch (e) {
  print("✗ filter_inventory collection does not exist");
}
```

---

## 7. DATA EXPORT QUERIES (For DSS Development Later)

### 7.1 Export Device Master Data
```javascript
db.devices.find({
  isDeleted: false,
  isRegistered: true
}, {
  deviceId: 1,
  name: 1,
  type: 1,
  location: 1,
  firmwareVersion: 1,
  sensors: 1,
  status: 1,
  lastSeen: 1,
  createdAt: 1,
  metadata: 1
}).toArray()
```

### 7.2 Export Sensor Readings for Analysis (Sample)
```javascript
db.sensorreadings.find({
  isDeleted: false,
  timestamp: { 
    $gte: new Date('2024-01-01'),
    $lte: new Date('2024-12-31')
  },
  pH_valid: true,
  tds_valid: true,
  turbidity_valid: true
}, {
  deviceId: 1,
  pH: 1,
  turbidity: 1,
  tds: 1,
  timestamp: 1
}).sort({ timestamp: 1 }).limit(100000)
```

### 7.3 Export Alerts for Correlation Analysis
```javascript
db.alerts.find({
  isDeleted: false,
  timestamp: { 
    $gte: new Date('2024-01-01'),
    $lte: new Date('2024-12-31')
  }
}, {
  deviceId: 1,
  severity: 1,
  parameter: 1,
  value: 1,
  threshold: 1,
  timestamp: 1
}).sort({ timestamp: 1 })
```

---

## 8. INDEX PERFORMANCE ANALYSIS

### 8.1 Check Existing Indexes
```javascript
print("=== DEVICES INDEXES ===");
printjson(db.devices.getIndexes());

print("\n=== SENSOR READINGS INDEXES ===");
printjson(db.sensorreadings.getIndexes());

print("\n=== ALERTS INDEXES ===");
printjson(db.alerts.getIndexes());
```

### 8.2 Query Performance Test
```javascript
// Test deviceId + timestamp query performance
db.sensorreadings.find({
  deviceId: "DEV-001", // Replace with actual device ID
  timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
}).explain("executionStats")
```

---

## 9. DATA BACKUP VERIFICATION

### 9.1 Check Last Backup (If backup system implemented)
```javascript
try {
  db.backups.find().sort({ createdAt: -1 }).limit(1).pretty();
} catch (e) {
  print("✗ No backup system found");
}
```

---

## 10. EXECUTE ALL DIAGNOSTICS (Summary Script)

```javascript
// Run this comprehensive diagnostic
print("========================================");
print("     DATA AUDIT DIAGNOSTIC REPORT      ");
print("========================================\n");

// 1. Collection Counts
print("1. COLLECTION INVENTORY");
print("------------------------");
["devices", "sensorreadings", "alerts", "users", "reports"].forEach(col => {
  try {
    print(`${col}: ${db[col].countDocuments().toLocaleString()} documents`);
  } catch (e) {
    print(`${col}: DOES NOT EXIST`);
  }
});

// 2. Device Stats
print("\n2. DEVICE STATISTICS");
print("------------------------");
const deviceStats = db.devices.aggregate([
  {
    $group: {
      _id: null,
      total: { $sum: 1 },
      registered: { $sum: { $cond: ["$isRegistered", 1, 0] }},
      online: { $sum: { $cond: [{ $eq: ["$status", "online"] }, 1, 0] }},
      offline: { $sum: { $cond: [{ $eq: ["$status", "offline"] }, 1, 0] }}
    }
  }
]).toArray()[0];
printjson(deviceStats);

// 3. Sensor Data Coverage
print("\n3. SENSOR DATA (LAST 30 DAYS)");
print("------------------------");
const sensorStats = db.sensorreadings.aggregate([
  {
    $match: {
      timestamp: { $gte: new Date(Date.now() - 30*24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: null,
      totalReadings: { $sum: 1 },
      uniqueDevices: { $addToSet: "$deviceId" }
    }
  },
  {
    $project: {
      totalReadings: 1,
      uniqueDeviceCount: { $size: "$uniqueDevices" }
    }
  }
]).toArray()[0];
printjson(sensorStats);

// 4. DSS Readiness
print("\n4. DSS READINESS CHECK");
print("------------------------");
print("✗ maintenance_logs: NOT IMPLEMENTED");
print("✗ device_runtime: NOT IMPLEMENTED");
print("✗ filter_inventory: NOT IMPLEMENTED");
print("✗ Device filter tracking fields: NOT IMPLEMENTED");
print("\n⚠️  BLOCKER: Cannot proceed with DSS until data infrastructure is built");

print("\n========================================");
print("     END OF DIAGNOSTIC REPORT          ");
print("========================================");
```

---

## USAGE INSTRUCTIONS

### How to Run These Queries

**Option 1: MongoDB Shell (mongosh)**
```bash
# Connect to your MongoDB instance
mongosh "mongodb://your-connection-string"

# Switch to your database
use your_database_name

# Copy and paste any query from above
db.devices.countDocuments()
```

**Option 2: MongoDB Compass**
1. Connect to your MongoDB instance
2. Select your database
3. Open the "Aggregations" tab
4. Paste the aggregation pipeline
5. Click "Run"

**Option 3: Node.js Script**
```javascript
import mongoose from 'mongoose';

async function runAudit() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Run any query
  const result = await mongoose.connection.db.collection('devices')
    .aggregate([/* paste aggregation here */])
    .toArray();
  
  console.log(result);
  
  await mongoose.disconnect();
}

runAudit();
```

---

## NEXT STEPS AFTER RUNNING QUERIES

1. **Document Results**: Save output of all queries to a file
2. **Identify Issues**: Note any devices with missing/invalid data
3. **Quantify Gaps**: Count how many records are affected
4. **Prioritize Fixes**: Use findings to inform schema design
5. **Share Report**: Provide results to stakeholders before implementation

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Compatible With:** MongoDB 5.0+, Mongoose 7.0+

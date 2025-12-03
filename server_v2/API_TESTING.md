# API Testing Guide

Quick reference for testing all V2 endpoints with sample requests.

## Base URL
```
http://localhost:3000/api/v1
```

## Health Check
```bash
curl http://localhost:3000/health
```

---

## 🚨 Alerts API

### List all alerts
```bash
curl "http://localhost:3000/api/v1/alerts?page=1&limit=10"
```

### List alerts by severity
```bash
curl "http://localhost:3000/api/v1/alerts?severity=critical"
```

### Get alert by ID
```bash
curl "http://localhost:3000/api/v1/alerts/{alertId}"
```

### Acknowledge alert
```bash
curl -X PATCH "http://localhost:3000/api/v1/alerts/{alertId}/acknowledge" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-object-id", "notes": "Investigating the issue"}'
```

### Resolve alert
```bash
curl -X PATCH "http://localhost:3000/api/v1/alerts/{alertId}/resolve" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-object-id", "resolution": "Issue fixed"}'
```

### Get alert statistics
```bash
curl "http://localhost:3000/api/v1/alerts/statistics"
```

---

## 👥 Users API

### List all users
```bash
curl "http://localhost:3000/api/v1/users?page=1&limit=10"
```

### Get current user
```bash
curl "http://localhost:3000/api/v1/users/me" \
  -H "Authorization: Bearer {firebase-token}"
```

### Create user
```bash
curl -X POST "http://localhost:3000/api/v1/users" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "firebase-uid-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "staff",
    "phoneNumber": "+639123456789"
  }'
```

### Update user
```bash
curl -X PATCH "http://localhost:3000/api/v1/users/{userId}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phoneNumber": "+639987654321"
  }'
```

### Update user role (Admin only)
```bash
curl -X PATCH "http://localhost:3000/api/v1/users/{userId}/role" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "admin",
    "updatedBy": "admin-user-id"
  }'
```

### Update notification preferences
```bash
curl -X PATCH "http://localhost:3000/api/v1/users/me/preferences" \
  -H "Content-Type: application/json" \
  -d '{
    "alerts": true,
    "reports": false,
    "system": true,
    "channels": {
      "email": true,
      "push": true,
      "sms": false
    }
  }'
```

---

## 📱 Devices API

### List all devices
```bash
curl "http://localhost:3000/api/v1/devices?page=1&limit=10"
```

### Get online devices
```bash
curl "http://localhost:3000/api/v1/devices/online"
```

### Get pending registrations
```bash
curl "http://localhost:3000/api/v1/devices/pending"
```

### Register device
```bash
curl -X POST "http://localhost:3000/api/v1/devices/register" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "WQ-DEVICE-001",
    "name": "Arduino Water Sensor #1",
    "location": "Building A - Floor 1",
    "metadata": {
      "model": "Arduino Uno R4 WiFi",
      "firmwareVersion": "1.0.0",
      "location": {
        "latitude": 14.5995,
        "longitude": 120.9842
      }
    }
  }'
```

### Approve device registration
```bash
curl -X PATCH "http://localhost:3000/api/v1/devices/WQ-DEVICE-001/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBy": "admin-user-id"
  }'
```

### Send command to device
```bash
curl -X POST "http://localhost:3000/api/v1/devices/WQ-DEVICE-001/command" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "calibrate",
    "payload": {
      "parameter": "pH",
      "referenceValue": 7.0
    }
  }'
```

### Check offline devices
```bash
curl -X POST "http://localhost:3000/api/v1/devices/check-offline"
```

---

## 📊 Sensor Readings API

### List sensor readings
```bash
curl "http://localhost:3000/api/v1/sensor-readings?deviceId=WQ-DEVICE-001&page=1&limit=100"
```

### List readings with filters
```bash
curl "http://localhost:3000/api/v1/sensor-readings?deviceId=WQ-DEVICE-001&minPH=6.5&maxPH=8.5&startDate=2024-01-01T00:00:00Z"
```

### Get latest reading for device
```bash
curl "http://localhost:3000/api/v1/sensor-readings/WQ-DEVICE-001/latest"
```

### Create single reading
```bash
curl -X POST "http://localhost:3000/api/v1/sensor-readings" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "WQ-DEVICE-001",
    "pH": 7.2,
    "turbidity": 15.5,
    "tds": 250.0,
    "timestamp": "2024-01-15T12:30:00Z"
  }'
```

### Bulk insert readings
```bash
curl -X POST "http://localhost:3000/api/v1/sensor-readings/bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "readings": [
      {
        "deviceId": "WQ-DEVICE-001",
        "pH": 7.2,
        "turbidity": 15.5,
        "tds": 250.0,
        "timestamp": "2024-01-15T12:30:00Z"
      },
      {
        "deviceId": "WQ-DEVICE-001",
        "pH": 7.3,
        "turbidity": 16.0,
        "tds": 255.0,
        "timestamp": "2024-01-15T12:35:00Z"
      }
    ]
  }'
```

### Get statistics
```bash
curl "http://localhost:3000/api/v1/sensor-readings/statistics?deviceId=WQ-DEVICE-001&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z"
```

### Get aggregated data (hourly)
```bash
curl "http://localhost:3000/api/v1/sensor-readings/aggregated?deviceId=WQ-DEVICE-001&startDate=2024-01-15T00:00:00Z&endDate=2024-01-15T23:59:59Z&granularity=hour"
```

### Get reading count
```bash
curl "http://localhost:3000/api/v1/sensor-readings/count?deviceId=WQ-DEVICE-001"
```

---

## 📄 Reports API

### List all reports
```bash
curl "http://localhost:3000/api/v1/reports?page=1&limit=20"
```

### List my reports
```bash
curl "http://localhost:3000/api/v1/reports/my-reports" \
  -H "Authorization: Bearer {firebase-token}"
```

### Create report
```bash
curl -X POST "http://localhost:3000/api/v1/reports" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "water-quality",
    "title": "Weekly Water Quality Report",
    "description": "Water quality analysis for week 3",
    "format": "pdf",
    "parameters": {
      "deviceIds": ["WQ-DEVICE-001"],
      "startDate": "2024-01-15T00:00:00Z",
      "endDate": "2024-01-21T23:59:59Z",
      "includeCharts": true,
      "includeStatistics": true,
      "parameters": ["pH", "turbidity", "tds"]
    }
  }'
```

### Get report by ID
```bash
curl "http://localhost:3000/api/v1/reports/{reportId}"
```

### Download report
```bash
curl "http://localhost:3000/api/v1/reports/{reportId}/download" \
  -o report.pdf
```

### Delete report
```bash
curl -X DELETE "http://localhost:3000/api/v1/reports/{reportId}"
```

### Get report statistics
```bash
curl "http://localhost:3000/api/v1/reports/statistics"
```

### Delete expired reports (Admin only)
```bash
curl -X DELETE "http://localhost:3000/api/v1/reports/expired"
```

---

## 🧪 Testing Workflows

### Complete Device + Sensor + Alert Workflow
```bash
# 1. Register device
curl -X POST "http://localhost:3000/api/v1/devices/register" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TEST-001",
    "name": "Test Device",
    "location": "Lab"
  }'

# 2. Approve device
curl -X PATCH "http://localhost:3000/api/v1/devices/TEST-001/approve" \
  -H "Content-Type: application/json" \
  -d '{"approvedBy": "admin-id"}'

# 3. Send sensor reading (critical pH)
curl -X POST "http://localhost:3000/api/v1/sensor-readings" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "TEST-001",
    "pH": 5.0,
    "turbidity": 20.0,
    "tds": 300.0
  }'

# 4. Check alerts created
curl "http://localhost:3000/api/v1/alerts?deviceId=TEST-001"

# 5. Acknowledge alert
curl -X PATCH "http://localhost:3000/api/v1/alerts/{alertId}/acknowledge" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id", "notes": "Testing alert workflow"}'
```

---

## 📝 Notes

- Replace `{alertId}`, `{userId}`, `{deviceId}`, `{reportId}` with actual IDs from database
- Some endpoints require authentication (add when auth middleware is complete)
- Admin-only endpoints will be protected once auth is implemented
- Timestamps should be in ISO 8601 format (UTC)

## 🔐 Authentication (TODO)

Once auth middleware is implemented, add headers to protected routes:
```bash
-H "Authorization: Bearer {firebase-jwt-token}"
```

## ⚡ Performance Tips

- Use pagination (`?page=1&limit=100`) for large datasets
- Use filters to reduce data transfer
- Use aggregated endpoints for statistics instead of fetching all data
- Bulk insert sensor readings instead of individual inserts

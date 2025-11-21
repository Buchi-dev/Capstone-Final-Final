# 📋 Implementation Checklist

Use this checklist to systematically migrate from MQTT to HTTP architecture.

---

## ✅ Pre-Migration Checklist

Before starting, verify:

- [ ] You have access to Arduino IDE
- [ ] You have access to server machine
- [ ] You can connect to MongoDB
- [ ] You have physical access to devices (ESP32/Arduino R4)
- [ ] You understand rollback procedures
- [ ] You have read `MIGRATION_GUIDE.md`

**Estimated Time:** 1-2 hours  
**Difficulty:** Medium  
**Risk Level:** Low (easily reversible)

---

## 🖥️ Phase 1: Server Preparation

### Step 1.1: Generate API Key ⏱️ 5 minutes

**Using Node.js (Recommended):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Save the generated key:**
```
Your API Key: _________________________________
```

### Step 1.2: Update Server Configuration ⏱️ 2 minutes

- [ ] Open `server/.env` file
- [ ] Add this line (replace with your key):
  ```bash
  DEVICE_API_KEY=your_generated_api_key_here
  ```
- [ ] Save the file
- [ ] Verify no spaces or quotes around the key

### Step 1.3: Restart Server ⏱️ 1 minute

**PowerShell:**
```powershell
cd server
npm start
```

- [ ] Server starts without errors
- [ ] Note server IP address shown in logs
- [ ] Server accessible at `http://localhost:5000`

### Step 1.4: Test Health Endpoint ⏱️ 1 minute

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/health"
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  ...
}
```

- [ ] Health endpoint returns success
- [ ] Database shows as connected

### Step 1.5: Test API Endpoint ⏱️ 3 minutes

**PowerShell:**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "YOUR_API_KEY_HERE"  # Replace with your key
}

$body = @{
    deviceId = "test_device_migration"
    tds = 250.5
    ph = 7.2
    turbidity = 4.3
    temperature = 25.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/devices/readings" `
    -Method Post -Headers $headers -Body $body
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Sensor data processed successfully",
  ...
}
```

- [ ] API endpoint returns success
- [ ] Test device created in database
- [ ] No authentication errors

**✅ Phase 1 Complete!** Server is ready for device connections.

---

## 📡 Phase 2: ESP32 Device Update

### Step 2.1: Find Server IP Address ⏱️ 2 minutes

**PowerShell:**
```powershell
ipconfig | Select-String -Pattern "IPv4"
```

**Your Server IP:**
```
Server IP: _____________________ (e.g., 192.168.1.100)
```

### Step 2.2: Open Device Firmware ⏱️ 1 minute

- [ ] Open Arduino IDE
- [ ] Open `device_config/ESP32_Dev_Module.ino`
- [ ] IDE recognizes the file

### Step 2.3: Update Configuration ⏱️ 5 minutes

**Find these lines (around line 28-35):**
```cpp
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"
#define API_SERVER "http://your-server-ip:5000"
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "your_device_api_key_here"
#define DEVICE_ID "esp32_dev_002"
```

**Update with your values:**
```cpp
#define WIFI_SSID "Your_WiFi_Name"           // Your WiFi SSID
#define WIFI_PASSWORD "Your_WiFi_Password"   // Your WiFi password
#define API_SERVER "http://192.168.1.100:5000"  // Your server IP:PORT
#define API_ENDPOINT "/api/v1/devices/readings"  // Keep as is
#define API_KEY "your_actual_api_key"        // From server .env
#define DEVICE_ID "esp32_dev_001"            // Make unique per device
```

- [ ] WiFi SSID updated
- [ ] WiFi password updated
- [ ] API_SERVER updated with your server IP
- [ ] API_KEY updated with your generated key
- [ ] DEVICE_ID is unique
- [ ] No syntax errors shown

### Step 2.4: Verify Libraries ⏱️ 2 minutes

**Required libraries (should be built-in):**
- [ ] WiFi.h
- [ ] HTTPClient.h
- [ ] ArduinoJson.h (install if missing)

**To install ArduinoJson:**
- Tools → Manage Libraries
- Search "ArduinoJson"
- Install version 6.x or later

### Step 2.5: Configure Board ⏱️ 2 minutes

- [ ] Tools → Board → ESP32 Dev Module
- [ ] Tools → Port → Select your ESP32's COM port
- [ ] Tools → Upload Speed → 115200

### Step 2.6: Flash Firmware ⏱️ 2 minutes

- [ ] Connect ESP32 via USB
- [ ] Click Upload button (→)
- [ ] Wait for "Done uploading" message
- [ ] No compilation errors

### Step 2.7: Monitor Serial Output ⏱️ 3 minutes

- [ ] Tools → Serial Monitor
- [ ] Set baud rate to 115200
- [ ] Device resets and starts

**Expected Output:**
```
✓ WiFi connected!
IP address: 192.168.1.105
✓ Server responded with status code: 200
--- Reading Sensors ---
✓ HTTP POST successful: 200
```

- [ ] WiFi connects successfully
- [ ] Server connection successful (status 200)
- [ ] Sensor readings sent successfully
- [ ] No error messages

**✅ Phase 2 Complete!** ESP32 is now using HTTP!

---

## 🔌 Phase 3: Arduino UNO R4 Update

### Step 3.1: Open Device Firmware ⏱️ 1 minute

- [ ] Open Arduino IDE
- [ ] Open `device_config/Arduino_Uno_R4_Optimized.ino`
- [ ] IDE recognizes the file

### Step 3.2: Update Configuration ⏱️ 5 minutes

**Find these lines (around line 80-90):**
```cpp
#define WIFI_SSID "Yuzon Only"
#define WIFI_PASSWORD "Pldtadmin@2024"
#define API_SERVER "your-server-ip"
#define API_PORT 5000
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "your_device_api_key_here"
#define DEVICE_ID "arduino_uno_r4_002"
```

**Update with your values:**
```cpp
#define WIFI_SSID "Your_WiFi_Name"           // Your WiFi SSID
#define WIFI_PASSWORD "Your_WiFi_Password"   // Your WiFi password
#define API_SERVER "192.168.1.100"           // Your server IP (no http://)
#define API_PORT 5000                        // Your server PORT
#define API_ENDPOINT "/api/v1/devices/readings"  // Keep as is
#define API_KEY "your_actual_api_key"        // From server .env
#define DEVICE_ID "arduino_uno_r4_001"       // Make unique per device
```

- [ ] WiFi SSID updated
- [ ] WiFi password updated
- [ ] API_SERVER updated (without http://)
- [ ] API_PORT updated
- [ ] API_KEY updated with your generated key
- [ ] DEVICE_ID is unique
- [ ] No syntax errors shown

### Step 3.3: Install Required Library ⏱️ 3 minutes

**Install ArduinoHttpClient:**
- [ ] Tools → Manage Libraries
- [ ] Search "ArduinoHttpClient"
- [ ] Install "ArduinoHttpClient by Arduino"
- [ ] Version 0.4.0 or later

**Other libraries (should be built-in for R4):**
- [ ] WiFiS3.h
- [ ] ArduinoJson.h (install if missing)
- [ ] Arduino_LED_Matrix.h

### Step 3.4: Configure Board ⏱️ 2 minutes

- [ ] Tools → Board → Arduino UNO R4 WiFi
- [ ] Tools → Port → Select your Arduino's COM port
- [ ] Tools → Upload Speed → 115200

### Step 3.5: Flash Firmware ⏱️ 2 minutes

- [ ] Connect Arduino R4 via USB
- [ ] Click Upload button (→)
- [ ] Wait for "Done uploading" message
- [ ] No compilation errors

### Step 3.6: Monitor Serial Output ⏱️ 3 minutes

- [ ] Tools → Serial Monitor
- [ ] Set baud rate to 115200
- [ ] Device resets and starts

**Expected Output:**
```
=== Arduino UNO R4 Water Quality Monitor ===
Firmware: v5.0.0 - Direct HTTP Integration
✓ WiFi connected!
IP address: 192.168.1.106
✓ Server Connected! Switching to IDLE state (Cloud WiFi).
--- Reading Sensors ---
✓ Data published to server!
```

- [ ] WiFi connects successfully
- [ ] Server connection successful
- [ ] Sensor readings sent successfully
- [ ] LED Matrix shows Cloud icon (idle state)
- [ ] Heartbeat animation triggers every 2 seconds
- [ ] No error messages

**✅ Phase 3 Complete!** Arduino R4 is now using HTTP!

---

## 🔍 Phase 4: Verification & Testing

### Step 4.1: Check Server Logs ⏱️ 2 minutes

- [ ] Open `server/logs/combined.log`
- [ ] See incoming POST requests from devices
- [ ] No authentication errors
- [ ] Devices auto-registering

**Expected Log Entries:**
```
info: POST /api/v1/devices/readings 200 45ms
info: Device auto-registered: esp32_dev_001
info: Sensor data processed for device: esp32_dev_001
```

### Step 4.2: Check Dashboard ⏱️ 3 minutes

- [ ] Login to web dashboard
- [ ] Navigate to Devices page
- [ ] ESP32 device appears
- [ ] Arduino R4 device appears
- [ ] Both show status "online"
- [ ] "Last Seen" updates every ~2 seconds

### Step 4.3: Check Sensor Readings ⏱️ 3 minutes

**For ESP32 device:**
- [ ] Click on ESP32 device in dashboard
- [ ] Sensor readings visible
- [ ] TDS value updating
- [ ] pH value updating
- [ ] Turbidity value updating
- [ ] Temperature value showing

**For Arduino R4 device:**
- [ ] Click on Arduino R4 device in dashboard
- [ ] Sensor readings visible
- [ ] TDS value updating
- [ ] pH value updating
- [ ] Turbidity value updating
- [ ] Temperature value showing

### Step 4.4: Test Alert System ⏱️ 5 minutes

**Method 1: Modify threshold (temporary):**
- Edit `server/src/utils/constants.js`
- Lower pH threshold to trigger alert
- Wait for next reading
- Alert should appear in dashboard

**Method 2: Manual sensor test:**
- Disconnect pH sensor to get extreme reading
- Alert should trigger
- Check Alerts page in dashboard

- [ ] Alert created when threshold exceeded
- [ ] Alert shows correct severity
- [ ] Alert shows correct device
- [ ] Email notification sent (if configured)

### Step 4.5: Check Database ⏱️ 2 minutes

**Using MongoDB Compass or CLI:**
```javascript
// Check devices
db.devices.find()

// Check sensor readings (last 10)
db.sensorreadings.find().sort({timestamp: -1}).limit(10)

// Check alerts
db.alerts.find()
```

- [ ] Devices collection has entries
- [ ] SensorReadings collection growing
- [ ] Readings have all fields (tds, ph, turbidity, temperature)
- [ ] Alerts collection has entries (if thresholds exceeded)

### Step 4.6: Monitor for 10 Minutes ⏱️ 10 minutes

**Watch for:**
- [ ] Consistent data every 2 seconds
- [ ] No connection drops
- [ ] No authentication errors
- [ ] Devices stay "online"
- [ ] Arduino LED Matrix responds correctly

**If any issues occur:**
1. Check serial monitor for errors
2. Check server logs
3. Verify API key matches
4. Verify network connectivity

**✅ Phase 4 Complete!** All systems verified and working!

---

## 🗑️ Phase 5: Cleanup (Optional)

### Step 5.1: Remove MQTT-Bridge ⏱️ 1 minute

**⚠️ Only do this AFTER Phase 4 is successful!**

**PowerShell:**
```powershell
cd "C:\Users\Administrator\Desktop\Capstone-Final-Final"
Remove-Item -Path "mqtt-bridge" -Recurse -Force
```

- [ ] mqtt-bridge folder deleted
- [ ] Confirm deletion

### Step 5.2: Cancel Cloud Services ⏱️ 10 minutes

**HiveMQ Cloud:**
- [ ] Login to HiveMQ Cloud console
- [ ] Navigate to your cluster
- [ ] Delete cluster or cancel subscription
- [ ] Confirm cancellation

**Google Cloud Pub/Sub:**
- [ ] Login to Google Cloud Console
- [ ] Navigate to Pub/Sub
- [ ] Delete topics:
  - [ ] iot-sensor-readings
  - [ ] iot-device-registration
  - [ ] iot-failed-messages-dlq
- [ ] Disable Pub/Sub API (optional)

### Step 5.3: Update Documentation ⏱️ 5 minutes

- [ ] Update project README (if needed)
- [ ] Remove MQTT references from docs
- [ ] Add note about HTTP architecture
- [ ] Update deployment instructions

### Step 5.4: Commit Changes ⏱️ 2 minutes

**PowerShell:**
```powershell
git add .
git commit -m "Migrated from MQTT to HTTP architecture"
git push
```

- [ ] Changes committed to repository
- [ ] Migration guide committed
- [ ] Device configs committed

**✅ Phase 5 Complete!** Migration fully complete and documented!

---

## 📊 Final Verification Checklist

After 24-48 hours of operation:

### System Health
- [ ] No devices showing "offline"
- [ ] Sensor data continuously flowing
- [ ] No gaps in sensor readings
- [ ] Alerts triggering correctly
- [ ] Email notifications working (if configured)

### Performance
- [ ] Response time < 200ms per request
- [ ] No HTTP errors (4xx, 5xx)
- [ ] Database not overloaded
- [ ] Server CPU < 50%
- [ ] Server memory < 70%

### Data Quality
- [ ] Sensor readings look realistic
- [ ] No null/undefined values
- [ ] Timestamps accurate
- [ ] Device IDs correct
- [ ] All fields present

### Cost Verification
- [ ] No HiveMQ charges on credit card
- [ ] No Google Cloud Pub/Sub charges
- [ ] Cloud Run charges stopped
- [ ] Monthly savings confirmed: $55-110

**✅ Migration Successful!** 🎉

---

## 🆘 Rollback Procedure (If Needed)

If something goes wrong:

### Quick Rollback ⏱️ 15 minutes

1. **Restore MQTT-Bridge:**
   ```powershell
   git checkout HEAD -- mqtt-bridge/
   ```

2. **Restore Device Firmware:**
   ```powershell
   git checkout HEAD -- device_config/
   ```

3. **Flash Old Firmware:**
   - Open old ESP32 firmware (with MQTT)
   - Flash to devices
   - Verify MQTT connection

4. **Restart MQTT-Bridge:**
   ```powershell
   cd mqtt-bridge
   npm install
   npm start
   ```

5. **Verify Operation:**
   - Check devices reconnect to MQTT
   - Check bridge receives messages
   - Check data reaches server

---

## 📞 Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| **401 API Key Error** | Verify API key matches in device and server .env |
| **WiFi Won't Connect** | Check SSID/password, ensure 2.4GHz network |
| **Server Not Found** | Verify server IP, check firewall, ensure server running |
| **Device Offline** | Check serial monitor, verify network connectivity |
| **No Data Saving** | Check MongoDB connection, verify database permissions |
| **Arduino Won't Upload** | Check correct board/port selected, try different USB cable |
| **LED Matrix Not Working** | Update to latest firmware, check LED_Matrix library installed |
| **Temperature Missing** | Update to latest firmware (v4.0.0+ ESP32, v5.0.0+ R4) |

---

## ✨ Success Metrics

You'll know the migration is successful when:

✅ **All devices online** - Dashboard shows green status  
✅ **Real-time data** - Readings update every 2 seconds  
✅ **Zero errors** - No authentication or connection failures  
✅ **Alerts working** - Thresholds trigger notifications  
✅ **Cost savings** - No more cloud service charges  
✅ **Better performance** - < 100ms latency  
✅ **Simpler debugging** - Easy to test with curl/Postman  
✅ **Team confidence** - Everyone understands the new architecture  

---

**Implementation Date:** _______________  
**Completed By:** _______________  
**Time Taken:** _______________  
**Issues Encountered:** _______________  
**Status:** [ ] Success  [ ] Partial  [ ] Rolled Back

---

**Good luck with your migration! 🚀**

For help, refer to:
- `MIGRATION_GUIDE.md` - Detailed step-by-step guide
- `DEVICE_SETUP_GUIDE.md` - Device configuration reference
- `ARCHITECTURE_COMPARISON.md` - Visual architecture diagrams
- `MIGRATION_SUMMARY.md` - Complete change summary

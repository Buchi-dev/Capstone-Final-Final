# Device Configuration Quick Reference

## 🚀 Quick Setup Checklist

### Server Setup
- [ ] Add `DEVICE_API_KEY` to `server/.env`
- [ ] Start server: `npm start`
- [ ] Verify endpoint: `http://localhost:5000/health`

### Device Configuration
- [ ] Update `API_SERVER` with your server IP
- [ ] Update `API_KEY` with your `DEVICE_API_KEY`
- [ ] Update `DEVICE_ID` (must be unique per device)
- [ ] Flash firmware to device
- [ ] Monitor serial output for connection success

---

## 📡 ESP32 Dev Module Configuration

```cpp
// WiFi
#define WIFI_SSID "Your_WiFi_Name"
#define WIFI_PASSWORD "Your_WiFi_Password"

// API Server (UPDATE THESE!)
#define API_SERVER "http://192.168.1.100:5000"  // ← Your server IP:PORT
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "your_device_api_key_here"      // ← From server .env

// Device (MAKE UNIQUE!)
#define DEVICE_ID "esp32_dev_001"               // ← Change for each device
#define DEVICE_NAME "Water Quality Monitor ESP32"
#define DEVICE_TYPE "ESP32 Dev Module"
```

**Required Libraries:**
- WiFi (built-in)
- HTTPClient (built-in)
- ArduinoJson (install from Library Manager)

**Serial Monitor:** 115200 baud

---

## 🔧 Arduino UNO R4 WiFi Configuration

```cpp
// WiFi
#define WIFI_SSID "Your_WiFi_Name"
#define WIFI_PASSWORD "Your_WiFi_Password"

// API Server (UPDATE THESE!)
#define API_SERVER "192.168.1.100"              // ← Your server IP (no http://)
#define API_PORT 5000                           // ← Your server PORT
#define API_ENDPOINT "/api/v1/devices/readings"
#define API_KEY "your_device_api_key_here"      // ← From server .env

// Device (MAKE UNIQUE!)
#define DEVICE_ID "arduino_uno_r4_001"          // ← Change for each device
#define DEVICE_NAME "Water Quality Monitor R4"
#define DEVICE_TYPE "Arduino UNO R4 WiFi"
```

**Required Libraries:**
- WiFiS3 (built-in for R4)
- ArduinoHttpClient (install from Library Manager)
- ArduinoJson (install from Library Manager)
- Arduino_LED_Matrix (built-in for R4)

**Serial Monitor:** 115200 baud

---

## 🌐 Finding Your Server IP Address

### Windows (PowerShell):
```powershell
# Get local IP
ipconfig | Select-String -Pattern "IPv4"

# Example output: 192.168.1.100
```

### Linux/Mac:
```bash
# Get local IP
ip addr show | grep inet

# Or
ifconfig | grep inet
```

### Important Notes:
- Use **local network IP** (192.168.x.x or 10.0.x.x) for devices on same network
- Use **public IP or domain** for remote devices
- Ensure devices and server are on the same network for testing

---

## 🔑 Generating Secure API Key

### Method 1: Node.js (Recommended)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Method 2: PowerShell
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### Method 3: Online Generator
- Visit: https://www.uuidgenerator.net/
- Or: https://randomkeygen.com/

**Example API Key:**
```
7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b
```

---

## 📊 Expected Data Format

The devices send this JSON payload every 2 seconds:

```json
{
  "deviceId": "esp32_dev_001",
  "tds": 245.5,
  "ph": 7.2,
  "turbidity": 3.8,
  "temperature": 25.0,
  "timestamp": 1234567890
}
```

**Field Ranges:**
- `tds`: 0 - 1000 ppm (parts per million)
- `ph`: 0 - 14 (pH scale)
- `turbidity`: 0+ NTU (Nephelometric Turbidity Units)
- `temperature`: -10 to 50°C
- `timestamp`: Device uptime in milliseconds

---

## ✅ Testing Device Connection

### 1. Check Serial Monitor Output

**ESP32 Success:**
```
✓ WiFi connected!
IP address: 192.168.1.105
✓ Server responded with status code: 200
--- Reading Sensors ---
✓ HTTP POST successful: 200
```

**Arduino R4 Success:**
```
=== Arduino UNO R4 Water Quality Monitor ===
✓ WiFi connected!
IP address: 192.168.1.106
✓ Server Connected! Switching to IDLE state (Cloud WiFi).
--- Reading Sensors ---
✓ Data published to server!
```

### 2. Test API Endpoint Manually

**PowerShell:**
```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:5000/health"

# Test sensor data endpoint
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "your_device_api_key_here"
}

$body = @{
    deviceId = "test_device"
    tds = 250.5
    ph = 7.2
    turbidity = 4.3
    temperature = 25.0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/v1/devices/readings" `
    -Method Post -Headers $headers -Body $body
```

---

## 🐛 Common Issues & Solutions

### Issue: "API key is required"
**Solution:** 
- Verify `x-api-key` header is being sent
- Check API_KEY in device code matches server .env

### Issue: "WiFi connection failed"
**Solution:**
- Verify WiFi SSID and password are correct
- Check if WiFi is 2.4GHz (ESP32/Arduino don't support 5GHz)
- Ensure WiFi network allows IoT devices

### Issue: "Server not connected"
**Solution:**
- Verify server is running (`npm start`)
- Check firewall isn't blocking port 5000
- Ensure device and server are on same network
- Ping server IP from another device to test connectivity

### Issue: "Device shows offline in dashboard"
**Solution:**
- Check device serial monitor for errors
- Verify data is reaching server (check server logs)
- Refresh dashboard page
- Check MongoDB connection

### Issue: Temperature validation error
**Solution:**
- Update firmware to latest version (includes temperature field)
- ESP32: v4.0.0 or later
- Arduino R4: v5.0.0 or later

---

## 📝 Device ID Naming Convention

**Recommended format:** `{deviceType}_{location}_{number}`

**Examples:**
```cpp
// ESP32 devices
#define DEVICE_ID "esp32_lab_001"
#define DEVICE_ID "esp32_tank_a_001"
#define DEVICE_ID "esp32_pond_north_001"

// Arduino R4 devices
#define DEVICE_ID "r4_lab_001"
#define DEVICE_ID "r4_tank_b_001"
#define DEVICE_ID "r4_pond_south_001"
```

**Rules:**
- Use lowercase
- Use underscores (not spaces or dashes)
- Keep it 3-50 characters
- Make it unique per device
- Make it descriptive

---

## 🔄 Updating Firmware

1. Open device .ino file in Arduino IDE
2. Make configuration changes
3. Select correct board:
   - ESP32: `Tools → Board → ESP32 Dev Module`
   - Arduino R4: `Tools → Board → Arduino UNO R4 WiFi`
4. Select correct port: `Tools → Port → COM[X]`
5. Click Upload button
6. Monitor serial output to verify changes

---

## 📈 Performance Settings

Both devices are configured for real-time monitoring:

```cpp
#define SENSOR_READ_INTERVAL 2000    // Read every 2 seconds
#define MQTT_PUBLISH_INTERVAL 2000   // Send every 2 seconds
```

**To adjust update frequency:**
- Increase value for less frequent updates (saves power)
- Decrease value for more frequent updates (uses more power)
- Minimum recommended: 1000ms (1 second)

---

## 🎨 Arduino R4 LED Matrix States

The built-in 12x8 LED matrix shows connection status:

| State | Animation | Meaning |
|-------|-----------|---------|
| **CONNECTING** | WiFi Search | Attempting to connect |
| **IDLE** | Cloud WiFi Icon | Connected, waiting |
| **HEARTBEAT** | ECG Pulse | Reading sensors |

**Visual Feedback:**
- Startup → WiFi search animation
- Connected → Static cloud icon
- Every 2 seconds → Heartbeat pulse → Back to cloud

---

## 📞 Support Checklist

Before asking for help, verify:

- [ ] Server is running and accessible
- [ ] API key in device matches server .env
- [ ] Device ID is unique
- [ ] WiFi credentials are correct
- [ ] Server IP address is correct
- [ ] Firewall allows port 5000
- [ ] Serial monitor shows no errors
- [ ] Latest firmware version flashed

---

## 🎯 Success Indicators

You know it's working when:

✅ Serial monitor shows `✓ HTTP POST successful: 200`  
✅ Device appears in dashboard as "online"  
✅ "Last Seen" timestamp updates every 2 seconds  
✅ Sensor readings appear in device details  
✅ Alerts are created when thresholds exceeded  
✅ Arduino R4 LED shows cloud icon (idle state)  

---

**Last Updated:** November 21, 2025  
**Firmware Version:** ESP32 v4.0.0 | Arduino R4 v5.0.0

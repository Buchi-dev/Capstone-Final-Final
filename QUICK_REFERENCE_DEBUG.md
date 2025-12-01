# Quick Reference - Debug Logs for PDF Generation Issues

## 🚨 Quick Troubleshooting Guide

### Problem: Report generation fails

#### Step 1: Check Frontend Console
Open Browser DevTools (F12) → Console tab

**Look for:**
```
[AdminReports] DEBUG - Selected devices with readings
```

**What to check:**
- ✅ Are devices selected? (deviceCount > 0)
- ✅ Do devices have `hasReadings: true`?
- ✅ Are `latestReading` values present?

**If NO devices or NO readings:**
→ Problem is with device selection or data availability in frontend

---

#### Step 2: Check API Request
**Look for:**
```
[ReportsService] DEBUG - Sending request to backend
```

**What to check:**
- ✅ Is `deviceIds` array populated?
- ✅ Is date range valid (start < end)?
- ✅ Are dates in correct format (YYYY-MM-DD)?

**If request looks wrong:**
→ Problem is in request preparation

---

#### Step 3: Check Backend Logs
Server console or `server/logs/` directory

**Look for:**
```
[Report Controller] DEBUG - Incoming request
```

**What to check:**
- ✅ Did backend receive the request?
- ✅ Are deviceIds present in requestBody?
- ✅ Are dates parsed correctly?

**If request not received or malformed:**
→ Check API endpoint, network, or authentication

---

#### Step 4: Check Device Reading Status
**Look for:**
```
[Report Controller] DEBUG - Device reading status
```

**What to check for EACH device:**
- ✅ `totalReadings > 0`?
- ✅ Does `latestReading` exist?
- ✅ Do pH, turbidity, TDS values look valid?

**If totalReadings = 0 for all devices:**
→ No data in database for these devices

**If latestReading timestamp is old:**
→ Devices haven't reported recently

---

#### Step 5: Check Aggregation Results
**Look for:**
```
[Report Controller] DEBUG - Aggregation details
```

**What to check:**
- ✅ Are there results for each device?
- ✅ Is `count > 0` for each result?
- ✅ Are avg values reasonable?

**If no aggregation results:**
→ No readings in the specified date range

---

#### Step 6: Check Pre-PDF Validation
**Look for:**
```
[Report Controller] DEBUG - Pre-PDF validation
```

**What to check:**
- ✅ `hasDevices: true`
- ✅ `hasDevicesWithData: true`
- ✅ `totalReadings > 0`

**If any are false:**
→ Error will be thrown, check error message

---

#### Step 7: Check PDF Generation
**Look for:**
```
[PDF Generator] Data validation passed
```

**Or look for errors:**
```
[PDF Generator] CRITICAL ERROR
```

**What to check:**
- ✅ Did validation pass?
- ✅ What was the error message if failed?

---

#### Step 8: Check PDF Buffer
**Look for:**
```
[Report Controller] DEBUG - PDF buffer generated
```

**What to check:**
- ✅ `bufferSize > 1024` (at least 1KB)
- ✅ `isBuffer: true`
- ✅ `isEmpty: false`

**If buffer is empty or too small:**
→ PDF generation failed, check earlier logs

---

#### Step 9: Check Response
**Frontend console:**
```
[ReportsService] DEBUG - Response from backend
```

**What to check:**
- ✅ `success: true`
- ✅ `hasPdfBlob: true`
- ✅ `pdfBlobSize > 0`

**If no PDF blob:**
→ Check backend GridFS storage logs

---

## 🔍 Error Messages Reference

### Frontend Errors
| Error Message | Cause | Solution |
|--------------|-------|----------|
| "No devices selected" | No deviceIds in request | Select at least one device |
| "Invalid date range" | End date before start date | Fix date selection |

### Backend Errors
| Error Message | Cause | Solution |
|--------------|-------|----------|
| "No sensor readings found in the specified date range" | No data in DB for dates | Choose different date range or check data collection |
| "No devices have valid sensor readings" | All devices have null parameters | Check device connectivity and data reporting |
| "Generated PDF buffer is empty" | PDF generation failed | Check PDF Generator logs for specific error |
| "Generated PDF is too small (X bytes)" | Corrupt or incomplete PDF | Check data availability and PDF generation |

### PDF Generator Errors
| Error Message | Cause | Solution |
|--------------|-------|----------|
| "reportData is null or undefined" | Missing input data | Check controller data preparation |
| "No devices data available" | Empty devices array | Verify devices exist in database |
| "No devices have valid sensor readings" | No devices with metrics | Check sensor reading collection |
| "Summary data is missing" | Missing summary object | Check summary calculation in controller |
| "Summary shows zero total readings" | Invalid summary | Check reading aggregation |
| "Output buffer is empty" | PDF conversion failed | Check jsPDF library and document structure |

---

## 📊 What "Good" Logs Look Like

### Frontend Console (Successful)
```
[AdminReports] DEBUG - Selected devices with readings: [...]
  deviceCount: 2

[ReportsService] DEBUG - Sending request to backend:
  startDate: "2025-11-30"
  endDate: "2025-12-10"
  deviceIds: ["WQ-ESP32-001", "WQ-ESP32-002"]
  deviceCount: 2

[ReportsService] DEBUG - Response from backend:
  success: true
  hasPdfBlob: true
  pdfBlobSize: 123456
```

### Backend Logs (Successful)
```
[Report Controller] DEBUG - Incoming request
  deviceIds: ["WQ-ESP32-001", "WQ-ESP32-002"]

[Report Controller] DEBUG - Device reading status
  deviceId: "WQ-ESP32-001"
  totalReadings: 150
  latestReading: { pH: 7.2, turbidity: 3.5, tds: 420 }

[Report Controller] DEBUG - Aggregation details
  count: 150
  avgPH: 7.15
  avgTurbidity: 3.45
  avgTDS: 415.5

[Report Controller] DEBUG - Pre-PDF validation
  hasDevices: true
  hasDevicesWithData: true
  totalReadings: 150

[PDF Generator] Data validation passed
  totalDevices: 2
  devicesWithReadings: 2
  totalReadings: 150

[PDF Generator] PDF generation completed
  bufferSize: 45678
  pageCount: 3

[Report Controller] DEBUG - PDF buffer generated
  bufferSize: 45678
  isBuffer: true
  isEmpty: false
```

---

## 🛠️ Common Fixes

### No Data in Date Range
**Solution 1:** Adjust date range to include recent data
**Solution 2:** Check device data collection is working
**Solution 3:** Verify devices are actually reporting

### Device Not Reporting
**Solution 1:** Check device power and connectivity
**Solution 2:** Verify MQTT connection
**Solution 3:** Check device firmware is running

### PDF Generation Fails
**Solution 1:** Check server has enough memory
**Solution 2:** Verify jsPDF dependencies installed
**Solution 3:** Check for data type mismatches

### Empty PDF Buffer
**Solution 1:** Check all validations passed
**Solution 2:** Verify reportData structure
**Solution 3:** Look for exceptions in PDF generator

---

## 📝 Log Levels

- **INFO** - Normal operation tracking
- **DEBUG** - Detailed diagnostic information
- **WARN** - Potential issues (continues execution)
- **ERROR** - Errors that stop current operation

Filter logs by level to focus on specific issues.

---

## 🎯 Key Metrics to Monitor

1. **Device Reading Count** - Should be > 0 for all selected devices
2. **Total Readings** - Should match sum of device readings
3. **PDF Buffer Size** - Should be > 1KB (typically 20-100KB)
4. **Page Count** - Should be > 0 (typically 2-5 pages)
5. **Response Time** - Should complete in < 30 seconds

---

## 📞 When to Escalate

Report an issue if:
- ❌ Devices show readings in admin panel but not in report logs
- ❌ Aggregation shows 0 results but devices have data
- ❌ PDF buffer is generated but is empty
- ❌ All validations pass but still no PDF
- ❌ Consistent failures across multiple attempts

Include in bug report:
1. Full frontend console log
2. Full backend server log
3. Selected date range
4. Selected device IDs
5. Screenshots of error messages

---

## 📚 Related Documentation

- `DEBUG_LOGGING_GUIDE.md` - Complete debug log reference
- `DEBUG_FLOW_DIAGRAM.md` - Visual flow of debug logs
- `CHANGES_SUMMARY.md` - Summary of all changes made

---

**Remember:** Debug logs are your friend! They show exactly where and why things fail.

# Debug Logging Guide - PDF Generation & Sensor Data Tracking

## Overview
This document describes the comprehensive debug logging system added to track sensor readings data from frontend to backend and validate PDF generation.

## Purpose
- Track sensor readings data flow from client to server
- Validate data at each step of the report generation process
- Identify and throw errors when generated PDFs are empty or missing data
- Provide detailed diagnostic information for troubleshooting

---

## Debug Logs Added

### 1. Frontend - AdminReports Component
**File:** `client/src/pages/admin/AdminReports/AdminReports.tsx`

#### Before API Call
```typescript
console.log('[AdminReports] DEBUG - Selected devices with readings:', selectedDevices);
console.log('[AdminReports] DEBUG - Total devices available:', devicesWithReadings.length);
```

**What it logs:**
- All selected devices with their IDs and names
- Whether each device has readings (`hasReadings`)
- The latest reading for each device
- Total number of available devices

#### After API Response
```typescript
console.log('[AdminReports] DEBUG - Response received:', {
  success: response.success,
  hasPdfBlob: !!response.pdfBlob,
  pdfBlobSize: response.pdfBlob?.length,
  hasGridFsFileId: !!response.data?.gridFsFileId,
  reportData: response.data,
});
```

**What it logs:**
- Whether the request was successful
- If PDF blob was included in response
- Size of the PDF blob (base64 string length)
- If GridFS file ID exists
- Complete report data from backend

---

### 2. Frontend - Reports Service
**File:** `client/src/services/reports.Service.ts`

#### Request Logging
```typescript
console.log('[ReportsService] DEBUG - Sending request to backend:', {
  endpoint: REPORT_ENDPOINTS.WATER_QUALITY,
  startDate: request.startDate,
  endDate: request.endDate,
  deviceIds: request.deviceIds,
  deviceCount: request.deviceIds?.length || 0,
});
```

**What it logs:**
- API endpoint being called
- Date range for the report
- Device IDs included in request
- Number of devices

#### Response Logging
```typescript
console.log('[ReportsService] DEBUG - Response from backend:', {
  success: response.data.success,
  message: response.data.message,
  hasPdfBlob: !!response.data.pdfBlob,
  pdfBlobSize: response.data.pdfBlob?.length,
  hasData: !!response.data.data,
  summary: response.data.data?.summary,
});
```

**What it logs:**
- Success status
- Server message
- PDF blob presence and size
- Report data availability
- Summary statistics

---

### 3. Backend - Report Controller
**File:** `server/src/reports/report.Controller.js`

#### Initial Request Logging
```javascript
logger.info('[Report Controller] DEBUG - Incoming request:', {
  reportId,
  requestBody: {
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    deviceIds: req.body.deviceIds,
  },
  parsedDates: {
    start: start.toISOString(),
    end: end.toISOString(),
  },
  userId: req.user._id,
});
```

**What it logs:**
- Report ID
- Raw request body
- Parsed date range (ISO format)
- User ID who requested the report

#### Device Reading Status
```javascript
logger.info('[Report Controller] DEBUG - Device reading status:', {
  reportId,
  deviceId,
  totalReadings: deviceReadingCount,
  latestReading: { /* ... */ },
});
```

**What it logs (per device):**
- Device ID
- Total number of readings available
- Latest reading with pH, turbidity, TDS values

#### Aggregation Details
```javascript
logger.info('[Report Controller] DEBUG - Aggregation details:', {
  reportId,
  aggregationResults: [ /* ... */ ],
});
```

**What it logs:**
- Aggregated results for each device
- Average pH, turbidity, TDS values
- Reading count per device

#### Pre-PDF Validation
```javascript
logger.info('[Report Controller] DEBUG - Pre-PDF validation:', {
  reportId: report.reportId,
  hasDevices: deviceReports.length > 0,
  hasDevicesWithData: devicesWithData.length > 0,
  totalReadings: summary.totalReadings,
  summaryData: { /* ... */ },
});
```

**What it logs:**
- Whether devices exist
- Whether any devices have actual data
- Total readings count
- Presence of summary metrics

#### PDF Buffer Validation
```javascript
logger.info('[Report Controller] DEBUG - PDF buffer generated:', {
  reportId: report.reportId,
  bufferSize: pdfBuffer?.length || 0,
  bufferType: pdfBuffer?.constructor?.name || 'unknown',
  isBuffer: Buffer.isBuffer(pdfBuffer),
  isEmpty: !pdfBuffer || pdfBuffer.length === 0,
});
```

**What it logs:**
- PDF buffer size
- Buffer type
- Whether it's a valid Buffer object
- Whether it's empty

#### GridFS Storage Verification
```javascript
logger.info('[Report Controller] DEBUG - GridFS storage verification:', {
  reportId: report.reportId,
  storedSuccessfully: !!gridFSResult.fileId,
  fileId: gridFSResult.fileId,
  originalSize: pdfBuffer.length,
  storedSize: gridFSResult.size,
  sizesMatch: pdfBuffer.length === gridFSResult.size,
  checksum: checksum,
});
```

**What it logs:**
- Whether storage was successful
- GridFS file ID
- Original vs stored file size
- Whether sizes match
- MD5 checksum

#### Base64 Encoding Validation
```javascript
logger.info('[Report Controller] DEBUG - Base64 encoding validation:', {
  reportId: report.reportId,
  originalBufferSize: pdfBuffer.length,
  base64StringLength: base64Size,
  expectedBase64Size: expectedBase64Size,
  encodingValid: Math.abs(base64Size - expectedBase64Size) < 10,
});
```

**What it logs:**
- Original buffer size
- Base64 string length
- Expected base64 size
- Whether encoding is valid

#### Final Report Data
```javascript
logger.info('[Report Controller] DEBUG - Final report data:', {
  reportId: report.reportId,
  hasGridFsFileId: !!report.gridFsFileId,
  hasError: !!report.error,
  status: report.status,
  summary: { /* ... */ },
  metadata: report.metadata,
});
```

**What it logs:**
- Final report status
- Summary statistics
- Metadata including processing time

---

### 4. Backend - PDF Generator
**File:** `server/src/utils/pdfGenerator.js`

#### Initial Data Validation
```javascript
logger.info('[PDF Generator] Starting PDF generation with data validation');
```

Multiple validation checks with detailed error logging:

#### Validation Errors (Will Throw)
1. **No report data:**
   ```javascript
   Error: 'PDF Generation Error: reportData is null or undefined'
   ```

2. **No devices data:**
   ```javascript
   Error: 'PDF Generation Error: No devices data available'
   ```

3. **No sensor readings:**
   ```javascript
   Error: 'PDF Generation Error: No devices have valid sensor readings'
   ```

4. **Missing summary:**
   ```javascript
   Error: 'PDF Generation Error: Summary data is missing'
   ```

5. **Zero readings:**
   ```javascript
   Error: 'PDF Generation Error: Summary shows zero total readings'
   ```

6. **Empty buffer:**
   ```javascript
   Error: 'PDF Generation Error: Output buffer is empty'
   ```

#### Success Validation
```javascript
logger.info('[PDF Generator] Data validation passed:', {
  totalDevices: reportData.devices.length,
  devicesWithReadings: devicesWithReadings.length,
  totalReadings: totalReadings,
  hasValidData: true,
});
```

#### PDF Completion
```javascript
logger.info('[PDF Generator] PDF generation completed:', {
  reportId,
  bufferSize: pdfBuffer.length,
  pageCount: doc.internal.getNumberOfPages(),
  hasContent: pdfBuffer.length > 0,
  minSizeCheck: pdfBuffer.length > 1024,
});
```

**What it logs:**
- Final PDF buffer size
- Number of pages generated
- Content verification
- Minimum size check (>1KB)

---

## Error Handling

### Controller Level Validations

#### 1. No Sensor Readings in Date Range
```javascript
if (totalReadings === 0) {
  throw new Error('Cannot generate PDF: No sensor readings found in the specified date range');
}
```

**When thrown:** Before PDF generation starts if no readings exist

#### 2. No Devices Have Valid Data
```javascript
if (devicesWithData.length === 0) {
  throw new Error('Cannot generate PDF: No devices have valid sensor readings');
}
```

**When thrown:** Before PDF generation if all devices have null parameters

#### 3. Empty PDF Buffer
```javascript
if (!pdfBuffer || pdfBuffer.length === 0) {
  throw new Error('PDF Generation Error: Generated PDF buffer is empty');
}
```

**When thrown:** After PDF generation if buffer is empty

#### 4. PDF Too Small
```javascript
if (pdfBuffer.length < minPdfSize) {
  throw new Error(`PDF Generation Error: Generated PDF is too small (${pdfBuffer.length} bytes)`);
}
```

**When thrown:** If PDF is less than 1KB (likely corrupt)

---

## How to Use These Logs

### For Debugging Frontend Issues
1. **Check browser console** for:
   - `[AdminReports]` logs - verify device selection
   - `[ReportsService]` logs - verify request/response
   - `[API Request/Response]` logs - verify HTTP communication

### For Debugging Backend Issues
1. **Check server logs** for:
   - `[Report Controller]` logs - verify data processing
   - `[PDF Generator]` logs - verify PDF creation
   - Look for `DEBUG` prefix for detailed diagnostic info
   - Look for `ERROR` or `CRITICAL ERROR` for failures

### Common Issues to Look For

#### No Data Reaching Backend
- Check `[ReportsService] DEBUG - Sending request` log
- Verify deviceIds array is not empty
- Check date range is valid

#### Backend Has No Readings
- Check `[Report Controller] DEBUG - Device reading status` logs
- Verify each device has `totalReadings > 0`
- Check `latestReading` timestamps match expected date range

#### PDF Generation Fails
- Check `[Report Controller] DEBUG - Pre-PDF validation` log
- Verify `hasDevicesWithData` is `true`
- Verify `totalReadings > 0`
- Check for validation errors in `[PDF Generator]` logs

#### Empty PDF
- Check `[Report Controller] DEBUG - PDF buffer generated` log
- Verify `bufferSize > 1024`
- Check `[PDF Generator] PDF generation completed` log
- Verify `pageCount > 0`

---

## Testing the Debug Logs

### Test Scenario 1: Normal Report Generation
1. Select devices with recent readings
2. Select date range that includes readings
3. Generate report
4. **Expected logs:** All DEBUG logs show valid data, no errors

### Test Scenario 2: No Data in Date Range
1. Select valid devices
2. Select date range with NO readings (e.g., future dates)
3. Generate report
4. **Expected:** Error thrown with message about no sensor readings

### Test Scenario 3: Invalid Devices
1. Select devices with no data
2. Generate report
3. **Expected:** Error thrown about no valid sensor readings

---

## Log Location

- **Frontend logs:** Browser DevTools Console (F12)
- **Backend logs:** 
  - Console output (if running with `npm run dev`)
  - Log files in `server/logs/` directory

---

## Summary

This comprehensive debug logging system provides complete visibility into:
1. ✅ Data flow from frontend to backend
2. ✅ Sensor readings availability and values
3. ✅ PDF generation validation at every step
4. ✅ Early error detection for missing/empty data
5. ✅ Detailed diagnostics for troubleshooting

All errors related to empty or missing data will now be caught and logged with specific details about what's missing.

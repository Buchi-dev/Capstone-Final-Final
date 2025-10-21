# 📧 Email Alert Testing Guide

## Quick Start - Testing Email Notifications

I've added two test endpoints to help you verify the email notification system is working correctly.

---

## 🔧 Prerequisites

### 1. Configure Email Credentials

First, make sure your email is configured in Firebase Functions:

```powershell
# Check current configuration
firebase functions:config:get

# Set email configuration (use Gmail App Password)
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-16-char-app-password"
```

### 2. Deploy the Functions

```powershell
cd functions
firebase deploy --only functions
```

---

## 🧪 Test Endpoints

### Endpoint 1: Check Email Configuration

**Purpose:** Verify that email credentials are properly configured

**URL:** `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/testEmailConfig`

**Method:** GET

**Example:**
```powershell
# PowerShell
curl https://us-central1-your-project.cloudfunctions.net/testEmailConfig

# Or use Invoke-WebRequest
Invoke-WebRequest -Uri "https://us-central1-your-project.cloudfunctions.net/testEmailConfig" -Method GET
```

**Expected Response:**
```json
{
  "configured": true,
  "emailUser": "your-email@gmail.com",
  "hasPassword": true,
  "message": "Email is configured correctly",
  "note": "Check Firebase Functions configuration with: firebase functions:config:get"
}
```

---

### Endpoint 2: Test Alert Email

**Purpose:** Send a test alert email to verify the complete notification system

**URL:** `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/testAlertEmail`

**Method:** POST

**Body Parameters:**
- `email` (required): Email address to receive the test alert
- `deviceId` (optional): Device ID for test alert (default: "TEST_DEVICE")
- `parameter` (optional): "tds", "ph", or "turbidity" (default: "tds")
- `severity` (optional): "Advisory", "Warning", or "Critical" (default: "Warning")

**Example 1 - Basic Test:**
```powershell
# PowerShell
$body = @{
    email = "your-email@example.com"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://us-central1-your-project.cloudfunctions.net/testAlertEmail" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Example 2 - Critical pH Alert:**
```powershell
# PowerShell
$body = @{
    email = "your-email@example.com"
    parameter = "ph"
    severity = "Critical"
    deviceId = "DEVICE_001"
} | ConvertTo-Json

Invoke-WebRequest -Uri "https://us-central1-your-project.cloudfunctions.net/testAlertEmail" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

**Example 3 - Using curl (if available):**
```bash
curl -X POST https://us-central1-your-project.cloudfunctions.net/testAlertEmail \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "parameter": "tds",
    "severity": "Warning"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test alert created successfully",
  "alertId": "abc123xyz",
  "emailSent": true,
  "notificationsSent": ["test_user"],
  "details": {
    "email": "your-email@example.com",
    "deviceId": "TEST_DEVICE",
    "parameter": "tds",
    "severity": "Warning",
    "testAlertData": { ... }
  },
  "note": "Email notification sent successfully!"
}
```

---

## 🎯 Finding Your Function URLs

### Method 1: Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** in the left sidebar
4. Copy the URLs for `testEmailConfig` and `testAlertEmail`

### Method 2: Firebase CLI
```powershell
firebase functions:list
```

### Method 3: After Deployment
The URLs are shown in the deployment output:
```
✔  functions[us-central1-testEmailConfig(us-central1)] https://us-central1-yourproject.cloudfunctions.net/testEmailConfig
✔  functions[us-central1-testAlertEmail(us-central1)] https://us-central1-yourproject.cloudfunctions.net/testAlertEmail
```

---

## 🔍 Troubleshooting

### Check Function Logs
```powershell
# View all logs
firebase functions:log

# View specific function logs
firebase functions:log --only testAlertEmail

# Stream logs in real-time
firebase functions:log --follow
```

### Common Issues

#### 1. Email Not Configured
**Error:** `"configured": false`

**Solution:**
```powershell
firebase functions:config:set email.user="your-email@gmail.com" email.password="your-app-password"
firebase deploy --only functions
```

#### 2. Gmail App Password Required
Gmail requires an App Password (not your regular password) for nodemailer.

**Steps to create:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already enabled)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Select "Mail" and your device
5. Generate password (16 characters)
6. Use this password in your config

#### 3. Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check Firebase Functions logs for errors
- Ensure notification preferences document exists (the test endpoint creates this automatically)

#### 4. Function Not Found (404)
- Ensure functions are deployed: `firebase deploy --only functions`
- Check function URL is correct
- Verify region matches (default: us-central1)

---

## 📝 Manual Testing (Without Endpoints)

### Option 1: Create Test Reading
Add a document to the `readings` collection with values that exceed thresholds:

```javascript
// In Firebase Console > Firestore
Collection: readings
Add Document:
{
  deviceId: "DEVICE_001",
  tds: 1200,        // Exceeds critical threshold (1000)
  ph: 7.0,
  turbidity: 2.5,
  timestamp: [current timestamp],
  receivedAt: [server timestamp]
}
```

### Option 2: Add Test Alert Directly
Add a document to the `alerts` collection:

```javascript
// In Firebase Console > Firestore
Collection: alerts
Add Document:
{
  deviceId: "DEVICE_001",
  deviceName: "Test Device",
  parameter: "tds",
  alertType: "threshold",
  severity: "Critical",
  status: "Active",
  currentValue: 1200,
  thresholdValue: 1000,
  message: "TDS has reached critical level: 1200 ppm",
  recommendedAction: "Immediate action required...",
  createdAt: [server timestamp],
  notificationsSent: []
}
```

Then manually trigger notifications by calling the processNotifications function.

---

## 🎨 What the Test Email Looks Like

When you receive a test alert email, it will include:

- **Severity Badge** (color-coded: Red=Critical, Orange=Warning, Blue=Advisory)
- **Device Information** (Device name and ID)
- **Parameter Details** (TDS, pH, or Turbidity)
- **Current Value vs Threshold**
- **Alert Message**
- **Recommended Action**
- **Timestamp**

Example subject: `[Critical] Water Quality Alert - TDS (Total Dissolved Solids)`

---

## ✅ Testing Checklist

- [ ] Check email configuration: `firebase functions:config:get`
- [ ] Deploy functions: `firebase deploy --only functions`
- [ ] Test email config endpoint (GET request)
- [ ] Send test alert email (POST request)
- [ ] Check email inbox (including spam folder)
- [ ] Verify alert appears in Firestore `alerts` collection
- [ ] Check Firebase Functions logs for any errors
- [ ] Test with different severity levels (Advisory, Warning, Critical)
- [ ] Test with different parameters (tds, ph, turbidity)

---

## 🚀 Production Testing

Once basic testing is complete, test the real flow:

1. **Create a real device reading** that exceeds thresholds:
   ```powershell
   # This will trigger the monitorSensorReadings function
   # Add a reading via your MQTT bridge or directly to Firestore
   ```

2. **Set up real notification preferences** for admin users:
   ```javascript
   // Firestore > notificationPreferences collection
   {
     userId: "admin_user_id",
     email: "admin@yourcompany.com",
     emailNotifications: true,
     alertSeverities: ["Warning", "Critical"],
     parameters: ["tds", "ph", "turbidity"],
     devices: [],  // Empty = all devices
     quietHoursEnabled: false
   }
   ```

3. **Monitor in real-time:**
   - Watch Firebase Functions logs
   - Check Firestore `alerts` collection
   - Check email delivery

---

## 📞 Need Help?

If emails still aren't working:

1. **Check logs:** `firebase functions:log --only monitorSensorReadings`
2. **Verify credentials:** Make sure Gmail App Password is correct
3. **Test nodemailer directly:** Check if your email service allows less secure apps
4. **Check Firebase quota:** Ensure you haven't hit function execution limits
5. **Consider alternatives:** Use SendGrid, AWS SES, or other email services

---

**Happy Testing! 🎉**

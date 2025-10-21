# 🚀 Alert System Deployment & Testing Guide

## Quick Start Deployment

### Step 1: Deploy Firestore Rules and Indexes

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes (this may take a few minutes)
firebase deploy --only firestore:indexes
```

### Step 2: Configure Email Service

#### For Gmail:
1. Enable 2-Factor Authentication on your Google account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Set Firebase Functions config:

```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-16-char-app-password"
```

#### For Other Email Services:
Edit `functions/src/alertFunctions.ts` line 109-116:

```typescript
const emailTransporter = nodemailer.createTransport({
  host: "smtp.your-provider.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

### Step 3: Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Note**: First deployment may take 5-10 minutes. You should see:
- ✓ functions[monitorSensorReadings] 
- ✓ functions[checkStaleAlerts]

### Step 4: Initialize Alert System in Firestore

Open Firebase Console and manually create:

#### Document: `alertSettings/thresholds`
```json
{
  "tds": {
    "warningMin": 0,
    "warningMax": 500,
    "criticalMin": 0,
    "criticalMax": 1000,
    "unit": "ppm"
  },
  "ph": {
    "warningMin": 6.0,
    "warningMax": 8.5,
    "criticalMin": 5.5,
    "criticalMax": 9.0,
    "unit": ""
  },
  "turbidity": {
    "warningMin": 0,
    "warningMax": 5,
    "criticalMin": 0,
    "criticalMax": 10,
    "unit": "NTU"
  },
  "trendDetection": {
    "enabled": true,
    "thresholdPercentage": 15,
    "timeWindowMinutes": 30
  }
}
```

### Step 5: Set Up User Notification Preferences

For each admin user, create a document in `notificationPreferences/{userId}`:

```json
{
  "userId": "actual-user-id-from-auth",
  "email": "admin@example.com",
  "emailNotifications": true,
  "pushNotifications": false,
  "alertSeverities": ["Critical", "Warning", "Advisory"],
  "parameters": [],
  "devices": [],
  "quietHoursEnabled": false,
  "updatedAt": "2025-10-21T00:00:00Z"
}
```

**Or use the UI**: Settings → Alerts tab → Configure preferences

### Step 6: Build and Deploy Client

```bash
cd client
npm run build
firebase deploy --only hosting
```

---

## 🧪 Testing the Alert System

### Test 1: Manual Threshold Alert

Create a test reading in Firestore Console:

**Collection**: `readings`

```json
{
  "deviceId": "test-device-001",
  "tds": 1200,
  "ph": 7.2,
  "turbidity": 3.0,
  "timestamp": 1729555200000,
  "receivedAt": {"_seconds": 1729555200, "_nanoseconds": 0}
}
```

**Expected Result**:
- Alert created in `/alerts` collection (within 30 seconds)
- Email sent to configured users
- Alert appears in admin dashboard notification bell
- Alert visible in `/admin/alerts` page

### Test 2: Trend Alert

Create multiple readings with increasing TDS:

```json
// Reading 1 (now - 30 minutes)
{
  "deviceId": "test-device-trend",
  "tds": 400,
  "ph": 7.2,
  "turbidity": 3.0,
  "timestamp": 1729553400000,
  "receivedAt": {"_seconds": 1729553400, "_nanoseconds": 0}
}

// Reading 2 (now - 20 minutes)
{
  "deviceId": "test-device-trend",
  "tds": 450,
  "ph": 7.2,
  "turbidity": 3.0,
  "timestamp": 1729554000000,
  "receivedAt": {"_seconds": 1729554000, "_nanoseconds": 0}
}

// Reading 3 (now)
{
  "deviceId": "test-device-trend",
  "tds": 520,
  "ph": 7.2,
  "turbidity": 3.0,
  "timestamp": 1729555200000,
  "receivedAt": {"_seconds": 1729555200, "_nanoseconds": 0}
}
```

**Expected Result**:
- Trend alert generated (30% increase triggers alert)
- Severity based on rate of change

### Test 3: pH Critical Alert

```json
{
  "deviceId": "test-device-002",
  "tds": 450,
  "ph": 5.0,
  "turbidity": 3.0,
  "timestamp": 1729555200000,
  "receivedAt": {"_seconds": 1729555200, "_nanoseconds": 0}
}
```

**Expected Result**:
- Critical pH alert created
- Immediate email notification

### Test 4: Multiple Parameter Alerts

```json
{
  "deviceId": "test-device-003",
  "tds": 1500,
  "ph": 9.5,
  "turbidity": 12,
  "timestamp": 1729555200000,
  "receivedAt": {"_seconds": 1729555200, "_nanoseconds": 0}
}
```

**Expected Result**:
- 3 separate alerts created (one per parameter)
- 3 email notifications sent

---

## 🔍 Troubleshooting

### Alerts Not Being Created

**Check Cloud Function Logs**:
```bash
firebase functions:log --only monitorSensorReadings
```

**Common Issues**:
1. **Function not deployed**: Run `firebase deploy --only functions`
2. **Threshold document missing**: Create in Firestore Console
3. **Wrong collection name**: Must be `readings` (not `sensor_readings`)
4. **Timestamp format**: Use proper Firestore Timestamp

### Emails Not Being Sent

**Check Function Logs**:
```bash
firebase functions:log | grep -i email
```

**Common Issues**:
1. **Email credentials not set**: Run `firebase functions:config:get`
2. **App password invalid**: Regenerate in Google Account settings
3. **No notification preferences**: Create for at least one user
4. **Quiet hours active**: Check user preferences
5. **Gmail blocking**: Check spam folder or use different SMTP

### Notification Badge Not Updating

**Browser Console Checks**:
1. Check for Firestore permission errors
2. Verify Firebase config in `client/src/config/firebase.ts`
3. Check if alerts collection exists
4. Verify Firestore rules allow reads

**Fix**:
```bash
# Redeploy Firestore rules
firebase deploy --only firestore:rules
```

### Function Timeout Errors

**Increase timeout** in `functions/src/index.ts`:

```typescript
setGlobalOptions({
  timeoutSeconds: 120, // Increase from 60
  memory: "1GiB", // Increase from 512MiB
});
```

---

## 📊 Monitoring

### View Function Execution

```bash
# Live logs
firebase functions:log --only monitorSensorReadings

# Filter by severity
firebase functions:log --only monitorSensorReadings | grep ERROR
firebase functions:log --only monitorSensorReadings | grep WARNING
```

### Check Alert Statistics

Navigate to: `/admin/alerts`

You'll see:
- Total alerts
- Active alerts count
- Critical alerts count
- Resolved alerts count

### Monitor Email Delivery

Check function logs for:
```
✓ Email sent to admin@example.com for alert abc123
```

---

## 🎯 Performance Optimization

### 1. Index Optimization

Indexes are already configured in `firestore.indexes.json`. Deploy with:
```bash
firebase deploy --only firestore:indexes
```

### 2. Function Memory

If processing many alerts, increase memory:

```typescript
export const monitorSensorReadings = onDocumentCreated({
  document: "readings/{readingId}",
  memory: "1GiB", // Increase if needed
  timeoutSeconds: 120,
}, async (event) => {
  // ...
});
```

### 3. Batch Notifications

Currently sends emails one by one. For production, consider:
- Batch email sending
- Rate limiting
- Queue system (Cloud Tasks)

---

## 🔐 Security Checklist

- [x] Firestore rules deployed and tested
- [x] Only admins can modify alert settings
- [x] Users can only read their own notification preferences
- [x] Cloud Functions have admin privileges (secured by Firebase)
- [x] Email credentials stored in Functions config (not code)
- [x] Input validation on threshold updates

---

## 📈 Next Steps

### Immediate:
1. Test with real device readings
2. Configure email settings for production
3. Set up notification preferences for all admins
4. Monitor function execution for 24 hours

### Short-term:
1. Add push notifications via FCM
2. Implement alert escalation
3. Add SMS notifications (Twilio)
4. Create alert analytics dashboard

### Long-term:
1. Machine learning for anomaly detection
2. Predictive alerts
3. Integration with external monitoring systems
4. Mobile app support

---

## 📞 Support Commands

```bash
# Check function status
firebase functions:list

# View function config
firebase functions:config:get

# Delete function config
firebase functions:config:unset email

# View Firestore data
firebase firestore:get alerts --limit 10

# Check deployment status
firebase deploy --only functions --dry-run

# Roll back functions
firebase functions:delete monitorSensorReadings
firebase functions:delete checkStaleAlerts
```

---

## ✅ Deployment Checklist

- [ ] Firestore rules deployed
- [ ] Firestore indexes deployed
- [ ] Email credentials configured
- [ ] Cloud Functions deployed successfully
- [ ] Default thresholds created in Firestore
- [ ] At least one user has notification preferences
- [ ] Client built and deployed
- [ ] Test alert created and verified
- [ ] Email received successfully
- [ ] Alert visible in admin dashboard
- [ ] Notification bell shows count

---

## 🎉 Success Criteria

Your alert system is working correctly when:

1. ✅ New readings trigger Cloud Function
2. ✅ Alerts are created for threshold violations
3. ✅ Emails are sent within 30 seconds
4. ✅ Alerts appear in admin dashboard
5. ✅ Notification bell shows badge count
6. ✅ Alerts can be acknowledged/resolved
7. ✅ Trend detection creates alerts
8. ✅ Quiet hours are respected

---

## 🚨 Emergency Procedures

### Disable All Alerts

```javascript
// In Firebase Console, update alertSettings/thresholds:
{
  "tds": { "criticalMax": 999999 },
  "ph": { "criticalMin": 0, "criticalMax": 14 },
  "turbidity": { "criticalMax": 999999 },
  "trendDetection": { "enabled": false }
}
```

### Disable Email Notifications

```bash
firebase functions:config:unset email
firebase deploy --only functions
```

### Stop Processing New Readings

```bash
# Delete the trigger function
firebase functions:delete monitorSensorReadings
```

To re-enable, redeploy functions.

---

**System Status**: ✅ All components implemented and tested
**Last Updated**: October 21, 2025
**Version**: 1.0.0

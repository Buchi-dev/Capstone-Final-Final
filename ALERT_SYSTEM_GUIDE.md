# Water Quality Alert System - Implementation Guide

## Overview

A comprehensive real-time alert system for water quality monitoring that automatically detects and notifies users when TDS, pH, or turbidity readings reach warning or dangerous levels, or show concerning trends.

## Features Implemented

### ✅ Core Features
- **Real-time Monitoring**: Automatically monitors all sensor readings as they arrive
- **Threshold Detection**: Detects when parameters exceed warning or critical thresholds
- **Trend Analysis**: Identifies abnormal increasing/decreasing trends in water quality
- **Multi-level Severity**: Classifies alerts as Advisory, Warning, or Critical
- **Email Notifications**: Sends automated email alerts using Nodemailer
- **Alert Management**: View, acknowledge, and resolve alerts through admin interface
- **Notification Center**: Real-time alert dropdown in admin header
- **Customizable Thresholds**: Configure warning and critical levels for each parameter
- **User Preferences**: Customize which alerts to receive and when
- **Alert History**: Complete audit trail of all alerts and actions

## Architecture

### Backend (Cloud Functions)

#### 1. **monitorSensorReadings** (Firestore Trigger)
- **Trigger**: Automatically runs when a new reading document is created
- **Function**: Analyzes reading against thresholds and trends
- **Output**: Creates alert documents and sends notifications

```typescript
// Triggered on: /readings/{readingId}
// Checks: TDS, pH, Turbidity thresholds and trends
// Creates: Alert documents in /alerts collection
// Sends: Email notifications via Nodemailer
```

#### 2. **checkStaleAlerts** (Scheduled Function)
- **Schedule**: Runs every 1 hour
- **Function**: Finds unresolved critical alerts older than 2 hours
- **Output**: Logs warnings for stale alerts (can be extended for escalation)

### Frontend (React + Ant Design)

#### 1. **ManageAlerts Page** (`/admin/alerts`)
- **Location**: `client/src/pages/admin/ManageAlerts/ManageAlerts.tsx`
- **Features**:
  - View all alerts in sortable, filterable table
  - Real-time updates via Firestore listeners
  - Filter by severity, status, parameter, device
  - Acknowledge and resolve alerts
  - Detailed alert drawer with full information
  - Statistics dashboard

#### 2. **AlertNotificationCenter Component**
- **Location**: `client/src/components/AlertNotificationCenter.tsx`
- **Features**:
  - Bell icon in admin header with badge count
  - Dropdown showing 10 most recent active alerts
  - Real-time updates
  - Click to navigate to full alerts page

#### 3. **AlertConfiguration Component**
- **Location**: `client/src/pages/admin/Settings/AlertConfiguration.tsx`
- **Features**:
  - Configure threshold values for each parameter
  - Enable/disable trend detection
  - Set notification preferences
  - Configure quiet hours

## Configuration

### Default Thresholds (WHO Standards)

```typescript
TDS (ppm):
  Warning: 0 - 500
  Critical: 0 - 1000

pH:
  Warning: 6.0 - 8.5
  Critical: 5.5 - 9.0

Turbidity (NTU):
  Warning: 0 - 5
  Critical: 0 - 10

Trend Detection:
  Enabled: true
  Threshold: 15% change
  Time Window: 30 minutes
```

### Email Configuration

Set environment variables in Firebase Functions:

```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
```

Or edit in `functions/src/alertFunctions.ts`:

```typescript
const emailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "your-email@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "your-app-password",
  },
});
```

## Firestore Collections

### `/alerts` Collection
```typescript
{
  alertId: string;
  deviceId: string;
  deviceName: string;
  parameter: 'tds' | 'ph' | 'turbidity';
  alertType: 'threshold' | 'trend';
  severity: 'Advisory' | 'Warning' | 'Critical';
  status: 'Active' | 'Acknowledged' | 'Resolved';
  currentValue: number;
  thresholdValue?: number;
  trendDirection?: 'increasing' | 'decreasing';
  message: string;
  recommendedAction: string;
  createdAt: Timestamp;
  acknowledgedAt?: Timestamp;
  resolvedAt?: Timestamp;
  notificationsSent: string[];
}
```

### `/alertSettings/thresholds` Document
```typescript
{
  tds: {
    warningMin: number;
    warningMax: number;
    criticalMin: number;
    criticalMax: number;
    unit: "ppm";
  };
  ph: { ... };
  turbidity: { ... };
  trendDetection: {
    enabled: boolean;
    thresholdPercentage: number;
    timeWindowMinutes: number;
  };
}
```

### `/notificationPreferences/{userId}` Document
```typescript
{
  userId: string;
  email: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  alertSeverities: ('Critical' | 'Warning' | 'Advisory')[];
  parameters: ('tds' | 'ph' | 'turbidity')[];
  devices: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd functions
npm install nodemailer @types/nodemailer

# Frontend (already installed with Ant Design)
cd ../client
npm install
```

### 2. Initialize Alert Thresholds

Run once to set up default thresholds in Firestore:

```typescript
import { initializeAlertThresholds } from './functions/src/alertFunctions';
import { db } from './functions/src/index';

await initializeAlertThresholds(db);
```

Or manually create document in Firestore:
- Collection: `alertSettings`
- Document ID: `thresholds`
- Data: Copy from `DEFAULT_THRESHOLDS` in `client/src/types/alerts.ts`

### 3. Configure Email Service

#### Option A: Gmail (Recommended for Development)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Set in Firebase Functions config:

```bash
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-password"
```

#### Option B: Other Email Services

Modify `emailTransporter` in `functions/src/alertFunctions.ts`:

```typescript
const emailTransporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

### 4. Deploy Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### 5. Set Up User Notification Preferences

Each user should configure their preferences:
1. Go to Settings → Alert Configuration
2. Enable email notifications
3. Select which severities to receive (Critical, Warning, Advisory)
4. Optionally configure quiet hours

## Usage

### For Administrators

#### Viewing Alerts
1. Navigate to **Alerts** in the sidebar
2. View all alerts with filtering options
3. Click bell icon in header for recent alerts

#### Acknowledging Alerts
1. Open alert details
2. Click "Acknowledge" button
3. Status changes to "Acknowledged"

#### Resolving Alerts
1. Open alert details
2. Add resolution notes (optional)
3. Click "Mark as Resolved"

#### Configuring Thresholds
1. Go to Settings → Alert Configuration
2. Modify threshold values
3. Enable/disable trend detection
4. Save changes

#### Managing Notification Recipients
1. Each user configures their own preferences in Settings
2. Users can choose:
   - Which severity levels to receive
   - Which parameters to monitor
   - Specific devices to monitor
   - Quiet hours when notifications are paused

### For Staff Users
- Receive email notifications based on preferences
- View alerts (if given access)
- Cannot modify thresholds (admin only)

## Testing

### Test Alert Generation

1. **Manual Test**: Insert a test reading that exceeds thresholds

```typescript
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config/firebase';

await addDoc(collection(db, 'readings'), {
  deviceId: 'test-device-001',
  tds: 1200, // Exceeds critical threshold (1000)
  ph: 7.0,
  turbidity: 2.5,
  timestamp: Date.now(),
  receivedAt: Timestamp.now(),
});
```

2. **Check Results**:
   - Alert should be created in `/alerts` collection
   - Email should be sent to configured recipients
   - Alert appears in notification center

### Test Trend Detection

Insert multiple readings with increasing values:

```typescript
// Reading 1
{ tds: 400, ph: 7.0, turbidity: 2.0 }

// Reading 2 (30 minutes later, +20% increase)
{ tds: 480, ph: 7.0, turbidity: 2.0 }
```

Should trigger trend alert if increase > 15%.

## Customization

### Modify Alert Messages

Edit `generateAlertContent` function in `functions/src/alertFunctions.ts`:

```typescript
function generateAlertContent(
  parameter: WaterParameter,
  value: number,
  severity: AlertSeverity,
  alertType: AlertType,
  trendDirection?: TrendDirection
): { message: string; recommendedAction: string } {
  // Customize messages here
}
```

### Modify Email Template

Edit `sendEmailNotification` function in `functions/src/alertFunctions.ts`:

```typescript
const mailOptions = {
  // Customize HTML template here
  html: `...`
};
```

### Add More Parameters

1. Update types in `client/src/types/alerts.ts`:

```typescript
export type WaterParameter = 'tds' | 'ph' | 'turbidity' | 'temperature';
```

2. Add thresholds in `DEFAULT_THRESHOLDS`
3. Update Cloud Function to check new parameter

## Performance Considerations

- **Real-time Updates**: Uses Firestore listeners for instant updates
- **Batch Processing**: Scheduled functions process in batches
- **Indexing**: Create indexes for alert queries:
  ```
  - Collection: alerts
  - Fields: status (ASC), createdAt (DESC)
  - Fields: deviceId (ASC), createdAt (DESC)
  - Fields: severity (ASC), status (ASC)
  ```

## Security

- **Function Security**: Cloud Functions run with admin privileges
- **Client Security**: Protected routes ensure only authenticated admins access alert management
- **Data Validation**: Input validation on threshold updates
- **Email Privacy**: Notification preferences stored per user

## Monitoring

### Cloud Functions Logs

```bash
firebase functions:log
```

### Alert Statistics

View in ManageAlerts page:
- Total alerts
- Active alerts
- Critical count
- Resolution rate

## Troubleshooting

### Alerts Not Generated

1. Check Cloud Function is deployed: `firebase functions:list`
2. Check function logs: `firebase functions:log --only monitorSensorReadings`
3. Verify threshold document exists in Firestore
4. Ensure reading has correct field names (tds, ph, turbidity)

### Emails Not Sending

1. Verify email credentials in function config
2. Check function logs for email errors
3. Verify user has notification preferences enabled
4. Check spam/junk folder
5. Verify email service allows SMTP

### Notification Center Not Updating

1. Check Firestore security rules allow reads on `/alerts`
2. Verify Firebase config is correct in `client/src/config/firebase.ts`
3. Check browser console for errors
4. Verify collection name is 'alerts' (not 'alert')

## Future Enhancements

- [ ] Push notifications via Firebase Cloud Messaging
- [ ] SMS notifications via Twilio
- [ ] Alert escalation workflows
- [ ] Custom alert rules builder
- [ ] Machine learning for anomaly detection
- [ ] Alert analytics and reporting
- [ ] Integration with external monitoring systems
- [ ] Mobile app support
- [ ] Multi-language support

## Support

For issues or questions:
1. Check Firestore security rules
2. Review Cloud Function logs
3. Verify all collections exist with correct names
4. Check browser console for frontend errors

## License

Part of PureTrack Water Quality Monitoring System

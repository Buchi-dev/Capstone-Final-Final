# Soft Delete and Google Drive Backup Setup Guide

## Overview

This guide covers the implementation of two critical features:
1. **Soft Delete with 30-day Recovery Window**
2. **Automated Google Drive Backups**

---

## Soft Delete Implementation

### Features

- **Soft Delete**: Devices, alerts, and sensor readings are marked as deleted but remain recoverable for 30 days
- **Cascade Delete**: Deleting a device automatically soft-deletes all related sensor readings and alerts
- **Recovery API**: Admin can restore soft-deleted devices and their data within the 30-day window
- **Automatic Cleanup**: A daily cron job (2:00 AM) permanently deletes records past their recovery window

### Database Changes

All three models now include soft delete fields:

```typescript
{
  isDeleted: Boolean (default: false, indexed)
  deletedAt: Date
  deletedBy: ObjectId (reference to user)
  scheduledPermanentDeletionAt: Date (deletedAt + 30 days, indexed)
}
```

### API Endpoints

#### 1. Soft Delete Device
```
DELETE /api/v1/devices/:id
```
- **Access**: Admin only
- **Behavior**: Sets `isDeleted=true`, cascades to related data
- **Response**: "Device soft-deleted, recoverable for 30 days"

#### 2. Recover Device
```
POST /api/v1/devices/:id/recover
```
- **Access**: Admin only
- **Behavior**: Restores device and all related data if within 30-day window
- **Response**: "Device and all historical data restored"

#### 3. List Deleted Devices
```
GET /api/v1/devices/deleted?page=1&limit=50
```
- **Access**: Admin only
- **Returns**: List of soft-deleted devices with countdown timers
- **Format**:
```json
{
  "data": [
    {
      "id": "...",
      "deviceId": "ESP32-001",
      "name": "Lab Sensor",
      "deletedAt": "2025-12-01T10:30:00Z",
      "scheduledPermanentDeletionAt": "2025-12-31T10:30:00Z",
      "remainingDays": 25,
      "remainingDaysMessage": "25 days remaining until permanent deletion"
    }
  ],
  "pagination": { ... }
}
```

### Query Filtering

All GET queries automatically exclude soft-deleted records:

```typescript
// Before (hard delete)
Device.find({ status: 'online' })

// After (soft delete filter applied)
Device.find({ status: 'online', isDeleted: { $ne: true } })
```

Modified services:
- `device.service.ts`: `getAllDevices()`, `getDeviceById()`, `getDeviceByDeviceId()`
- `alert.service.ts`: `getAllAlerts()`, `checkCooldown()`
- `sensorReading.service.ts`: `getReadings()`, `getLatestReading()`, `getStatistics()`

### Permanent Deletion Job

**Schedule**: Daily at 2:00 AM (`0 2 * * *`)

**Behavior**:
- Queries: `{ isDeleted: true, scheduledPermanentDeletionAt: { $lt: new Date() } }`
- Permanently deletes devices, alerts, and sensor readings older than 30 days
- Logs all deletions for audit trail

**Manual Trigger** (testing only):
```typescript
import { triggerPermanentDeletion } from '@feature/jobs';
await triggerPermanentDeletion();
```

---

## Google Drive Backup Implementation

### Features

- **Automated Backups**: Daily (3:00 AM), Weekly (Sunday 3:00 AM), Monthly (1st @ 3:00 AM)
- **Compression**: GZIP compression reduces backup size
- **Encryption**: AES-256-CBC encryption with IV prepended to backup file
- **Google Drive Integration**: Uploads to organized folder structure
- **Retention Policies**: 
  - Daily: 7 days
  - Weekly: 28 days
  - Monthly: 365 days
- **Verification**: Downloads and verifies file integrity after upload
- **Retry Logic**: 3 attempts with exponential backoff on failures

### Setup Instructions

#### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project: **PureTrack Backups**
3. Enable Google Drive API:
   - Navigate to **APIs & Services** > **Library**
   - Search for "Google Drive API"
   - Click **Enable**

#### 2. Create Service Account

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in details:
   - **Name**: `puretrack-backup-service`
   - **Description**: "Service account for automated backups"
4. Click **Create and Continue**
5. Grant role: **Editor** (or custom role with Drive write permissions)
6. Click **Done**

#### 3. Generate Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Click **Create** (downloads JSON file)

#### 4. Share Google Drive Folder (Optional)

1. Create folder in Google Drive: **PureTrack_Backups**
2. Right-click > **Share**
3. Add service account email: `puretrack-backup-service@your-project.iam.gserviceaccount.com`
4. Grant **Editor** permissions

#### 5. Configure Environment Variables

Add to `.env`:

```bash
# Google Drive Backup Configuration
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"puretrack-backup-service@your-project.iam.gserviceaccount.com",...}

# Backup encryption key (generate with: openssl rand -hex 32)
BACKUP_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Keep local backups after uploading (optional)
KEEP_LOCAL_BACKUPS=false
```

**Generate Encryption Key**:
```bash
# Linux/Mac
openssl rand -hex 32

# Windows (PowerShell)
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Backup File Structure

Google Drive folder organization:

```
PureTrack_Backups/
├── Daily/
│   ├── backup_2025-12-04T03-00-00Z_daily.gz
│   ├── backup_2025-12-05T03-00-00Z_daily.gz
│   └── ... (last 7 days)
├── Weekly/
│   ├── backup_2025-12-01T03-00-00Z_weekly.gz
│   └── ... (last 4 weeks)
└── Monthly/
    ├── backup_2025-12-01T03-00-00Z_monthly.gz
    └── ... (last 12 months)
```

### Backup Contents

Each backup includes:

```json
{
  "devices": [...],          // All devices (including soft-deleted)
  "users": [...],           // All users
  "sensorReadings": [...],  // Last 90 days + all soft-deleted
  "alerts": [...],          // Last 90 days + all soft-deleted
  "config": {
    "apiVersion": "v2",
    "environment": "production"
  },
  "metadata": {
    "timestamp": "2025-12-04T03:00:00Z",
    "version": "v2",
    "environment": "production",
    "collections": {
      "devices": 15,
      "users": 8,
      "sensorReadings": 45231,
      "alerts": 892
    },
    "size": 2457600,
    "encrypted": true
  }
}
```

### API Endpoints

#### 1. Trigger Manual Backup
```
POST /api/v1/backups/trigger
Content-Type: application/json

{
  "type": "manual"  // or "daily", "weekly", "monthly"
}
```
- **Access**: Admin only
- **Response**: Backup triggered asynchronously

#### 2. List Backups
```
GET /api/v1/backups
```
- **Access**: Admin only
- **Returns**: List of all backups from Google Drive

#### 3. Get Backup Status
```
GET /api/v1/backups/status
```
- **Access**: Admin only
- **Returns**:
```json
{
  "lastBackup": {
    "id": "...",
    "filename": "backup_2025-12-04T03-00-00Z_daily.gz",
    "type": "daily",
    "size": 2457600,
    "createdAt": "2025-12-04T03:00:00Z"
  },
  "nextScheduled": {
    "daily": "3:00 AM (next day)",
    "weekly": "3:00 AM (next Sunday)",
    "monthly": "3:00 AM (1st of next month)"
  },
  "totalBackups": 42,
  "status": "OK"
}
```

#### 4. Restore from Backup
```
POST /api/v1/backups/:backupId/restore
```
- **Access**: Admin only
- **WARNING**: Replaces all data in database
- **Use Case**: Disaster recovery only

#### 5. Delete Backup
```
DELETE /api/v1/backups/:backupId
```
- **Access**: Admin only
- **Behavior**: Deletes backup from Google Drive

### Backup Schedule

| Job | Schedule | Cron Expression | Purpose |
|-----|----------|----------------|---------|
| Daily Backup | 3:00 AM Daily | `0 3 * * *` | Daily snapshots |
| Weekly Backup | 3:00 AM Sunday | `0 3 * * 0` | Weekly archives |
| Monthly Backup | 3:00 AM 1st | `0 3 1 * *` | Monthly archives |
| Cleanup | 4:00 AM Daily | `0 4 * * *` | Remove expired backups |

**Why 3:00 AM?**
- After permanent deletion job (2:00 AM)
- Low system usage
- Backup completes before business hours

### Security Considerations

#### Encryption

- **Algorithm**: AES-256-CBC
- **Key Management**: Store `BACKUP_ENCRYPTION_KEY` in environment variables, **NOT** in code or Google Drive
- **IV**: Randomly generated 16-byte IV prepended to each backup
- **Key Rotation**: Change encryption key periodically (requires re-encrypting old backups)

#### Access Control

- Service account has minimal permissions (Drive write only)
- Backup API endpoints require Admin role
- Restore endpoint has additional confirmation (implement in frontend)

#### Google Drive Quota

- Free tier: 15 GB
- Monitor storage usage: `GET /api/v1/backups/status`
- Implement alerts when storage > 90% full
- Retention policies auto-clean old backups

### Error Handling

#### Upload Failures

1. **Retry Logic**: 3 attempts with exponential backoff (2s, 4s, 8s)
2. **Fallback**: Keep local backup if upload fails
3. **Alert**: Send email to admins on repeated failures
4. **Manual Recovery**: Upload local backup manually

#### Network Issues

- Backup service checks for Google Drive connectivity
- Falls back to local storage if Google Drive unavailable
- Attempts to upload on next scheduled backup

### Monitoring

#### Logs

All backup operations are logged:

```
✅ Backup completed in 23.45s
  filename: backup_2025-12-04T03-00-00Z_daily.gz
  size: 2.34 MB
  googleDriveFileId: 1a2b3c4d5e6f7g8h9i0j
```

#### Health Check

Add to system health monitor:

```json
{
  "backup": {
    "lastBackup": "2025-12-04T03:00:00Z",
    "nextBackup": "2025-12-05T03:00:00Z",
    "storageUsed": "1.2 GB / 15 GB",
    "status": "OK"
  }
}
```

---

## Testing

### Soft Delete Testing

```bash
# 1. Soft delete device
curl -X DELETE http://localhost:5000/api/v1/devices/{deviceId} \
  -H "Authorization: Bearer {admin-token}"

# 2. Verify device is excluded from normal queries
curl http://localhost:5000/api/v1/devices \
  -H "Authorization: Bearer {token}"

# 3. List deleted devices
curl http://localhost:5000/api/v1/devices/deleted \
  -H "Authorization: Bearer {admin-token}"

# 4. Recover device
curl -X POST http://localhost:5000/api/v1/devices/{deviceId}/recover \
  -H "Authorization: Bearer {admin-token}"
```

### Backup Testing

```bash
# 1. Trigger manual backup
curl -X POST http://localhost:5000/api/v1/backups/trigger \
  -H "Authorization: Bearer {admin-token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"manual"}'

# 2. Check backup status
curl http://localhost:5000/api/v1/backups/status \
  -H "Authorization: Bearer {admin-token}"

# 3. List all backups
curl http://localhost:5000/api/v1/backups \
  -H "Authorization: Bearer {admin-token}"

# 4. Restore from backup (CAUTION!)
curl -X POST http://localhost:5000/api/v1/backups/{backupId}/restore \
  -H "Authorization: Bearer {admin-token}"
```

### Manual Job Triggers (Development Only)

```typescript
// In Node.js console or test script
import { triggerPermanentDeletion } from '@feature/jobs';
import { triggerManualBackup } from '@feature/jobs';
import { BackupType } from '@feature/backups';

// Trigger permanent deletion
await triggerPermanentDeletion();

// Trigger backup
await triggerManualBackup(BackupType.MANUAL);
```

---

## Troubleshooting

### Google Drive Issues

**Problem**: "Google Drive credentials not found"
- **Solution**: Set `GOOGLE_DRIVE_CREDENTIALS` in `.env`

**Problem**: "Insufficient permissions"
- **Solution**: Ensure service account has Editor role

**Problem**: "Quota exceeded"
- **Solution**: Delete old backups or upgrade Google Drive storage

### Backup Failures

**Problem**: "Backup failed to upload"
- **Solution**: Check network connectivity, verify service account permissions

**Problem**: "Backup file too large"
- **Solution**: Reduce retention period for sensor readings in backup service

**Problem**: "Encryption key invalid"
- **Solution**: Generate new 64-character hex key: `openssl rand -hex 32`

### Soft Delete Issues

**Problem**: "Cannot recover device - window expired"
- **Solution**: Device was permanently deleted. Restore from backup.

**Problem**: "Soft-deleted devices still appearing in queries"
- **Solution**: Verify `{ isDeleted: { $ne: true } }` filter is applied in query

---

## Migration Guide

### Existing Database Migration

If you have existing data, you need to add soft delete fields:

```javascript
// Run this migration script once
db.devices.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isDeleted: false, deletedAt: null, deletedBy: null, scheduledPermanentDeletionAt: null } }
);

db.alerts.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isDeleted: false, deletedAt: null, deletedBy: null, scheduledPermanentDeletionAt: null } }
);

db.sensorReadings.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isDeleted: false, deletedAt: null, deletedBy: null, scheduledPermanentDeletionAt: null } }
);
```

Or use the provided migration script:
```bash
node MIGRATION_ADD_SOFT_DELETE_FIELDS.js
```

---

## Production Deployment Checklist

### Soft Delete
- [ ] Run database migration to add soft delete fields
- [ ] Verify all GET endpoints exclude soft-deleted records
- [ ] Test soft delete and recovery flows
- [ ] Update frontend delete confirmation modals
- [ ] Add deleted devices tab to admin panel
- [ ] Document recovery procedures for support team

### Google Drive Backup
- [ ] Create Google Cloud project
- [ ] Enable Google Drive API
- [ ] Create service account and download credentials
- [ ] Generate encryption key (store securely!)
- [ ] Configure environment variables
- [ ] Test manual backup trigger
- [ ] Verify backup uploads to Google Drive
- [ ] Test backup verification
- [ ] Schedule retention policy cleanup
- [ ] Document restore procedures
- [ ] Add backup monitoring to health dashboard

---

## Support

For issues or questions:
- Check logs: `server_v2/logs/`
- Review error messages in console
- Verify environment variables are set correctly
- Consult API documentation

## License

Proprietary - Water Quality Monitoring System

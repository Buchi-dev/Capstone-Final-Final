# Quick Start Guide: Soft Delete & Backups

## 🚀 Installation (5 minutes)

### Step 1: Install Dependencies
```bash
cd server_v2
npm install
```

This installs the `googleapis` package needed for Google Drive integration.

### Step 2: Run Database Migration
```bash
node MIGRATION_ADD_SOFT_DELETE_FIELDS.js
```

**Output should show:**
```
✅ Updated X devices
✅ Updated X alerts
✅ Updated X sensor readings
```

### Step 3: Update Environment Variables

**Option A: Reuse Firebase Service Account (Easiest!)**

1. Enable Google Drive API in your Firebase project:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your Firebase project
   - Navigate to **APIs & Services** > **Library**
   - Search for "Google Drive API" and click **Enable**

2. Your `.env` already has Firebase credentials, so just add the encryption key:

```bash
# Existing Firebase config - no changes needed!
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json

# Just add these two lines:
BACKUP_ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
KEEP_LOCAL_BACKUPS=false
```

**Option B: Use JSON String in .env**

Copy the entire contents of `serviceAccountKey.json` into `.env`:

```bash
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...entire JSON content...}
BACKUP_ENCRYPTION_KEY=generate-with-openssl-rand-hex-32
KEEP_LOCAL_BACKUPS=false
```

**Generate encryption key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Windows PowerShell
-join ((48..57) + (97..102) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

### Step 4: Start Server
```bash
npm run dev
```

**Look for these startup messages:**
```
✅ Permanent Deletion Job: Started (runs daily at 2:00 AM)
✅ Daily Backup Job: Started (runs daily at 3:00 AM)
✅ Weekly Backup Job: Started (runs every Sunday at 3:00 AM)
✅ Monthly Backup Job: Started (runs on 1st of each month at 3:00 AM)
✅ Backup Cleanup Job: Started (runs daily at 4:00 AM)
```

---

## ✅ Quick Test

### Test Soft Delete

1. **Delete a device:**
```bash
curl -X DELETE http://localhost:5000/api/v1/devices/{deviceId} \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected: `"Device soft-deleted, recoverable for 30 days"`

2. **View deleted devices:**
```bash
curl http://localhost:5000/api/v1/devices/deleted \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected: List with countdown timer

3. **Recover device:**
```bash
curl -X POST http://localhost:5000/api/v1/devices/{deviceId}/recover \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Expected: `"Device and all historical data restored"`

### Test Backup (if Google Drive configured)

1. **Trigger manual backup:**
```bash
curl -X POST http://localhost:5000/api/v1/backups/trigger \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"manual"}'
```

2. **Check backup status:**
```bash
curl http://localhost:5000/api/v1/backups/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📝 What's Working Now

### ✅ Backend Features (100% Complete)
- Soft delete with 30-day recovery
- Cascade delete to related data
- Recovery endpoint
- Permanent deletion cron job (2:00 AM daily)
- Google Drive backup service
- Automated backups (daily/weekly/monthly)
- Backup retention policies
- Backup encryption (AES-256)
- All admin API endpoints

### ⏳ Frontend Features (To Be Implemented)
- Deleted devices tab in admin panel
- Restore device button
- Updated delete confirmation modal
- Backup management UI
- Backup status dashboard

---

## 🔧 Configuration Options

### Skip Google Drive (Local Backups Only)

Don't set `GOOGLE_DRIVE_CREDENTIALS` in `.env`. Backups will be saved to `server_v2/backups/` folder.

### Customize Backup Schedule

Edit `server_v2/src/feature/jobs/backupScheduler.job.ts`:

```typescript
// Change from 3:00 AM to 1:00 AM
dailyBackupJob = cron.schedule('0 1 * * *', async () => {
  await performDailyBackup();
});
```

### Adjust Retention Policies

Edit `server_v2/src/feature/backups/backup.service.ts`:

```typescript
const retentionDays = {
  [BackupType.DAILY]: 14,    // Change from 7 to 14 days
  [BackupType.WEEKLY]: 56,   // Change from 28 to 56 days
  [BackupType.MONTHLY]: 730, // Change from 365 to 730 days
};
```

---

## 🆘 Troubleshooting

### "Google Drive credentials not found"
- **Solution**: Either add credentials to `.env` OR ignore if using local backups only

### "Cannot find module 'googleapis'"
- **Solution**: Run `npm install`

### Migration fails
- **Solution**: Check MongoDB connection string in `.env`

### Backups not uploading
- **Solution**: Check service account permissions in Google Cloud Console

---

## 📚 Full Documentation

- **Complete Setup Guide**: `SOFT_DELETE_AND_BACKUP_SETUP.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`

---

## ✨ You're Done!

Your system now has:
- ✅ Soft delete with 30-day recovery window
- ✅ Automated Google Drive backups
- ✅ Data protection and disaster recovery

**Next Step**: Implement frontend UI for soft delete and backup management.

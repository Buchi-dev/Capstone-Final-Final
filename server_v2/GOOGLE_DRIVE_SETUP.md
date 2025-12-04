# Google Drive Backup Setup Guide

## Problem: Can't See Backup Folders

If you can't see the `PureTrack_Backups` folder in your Google Drive, it's because **service accounts create files in their own Google Drive space**, separate from your personal Google Drive.

## Solution: Share the Folder with Your Account

### Option 1: Automatic Sharing (For New Installations)

1. **Add your email to the `.env` file**:
   ```bash
   GOOGLE_DRIVE_OWNER_EMAIL=yourname@gmail.com
   ```

2. **Delete the existing backup folder** (one-time only):
   - Go to: https://drive.google.com/drive/u/0/trash
   - Find `PureTrack_Backups` if it exists
   - Permanently delete it

3. **Restart the server**:
   ```bash
   npm run dev
   ```

4. **Check your email** - you should receive a sharing notification from Google Drive

5. **Open the link** in the email or go to "Shared with me" in Google Drive

### Option 2: Share Existing Folder (If Already Created)

Since the folder is already created, you have two options:

#### Method A: Use the API to Share (Coming Soon)
We can add an admin endpoint to trigger folder sharing.

#### Method B: Manual Service Account Setup

1. **Enable Google Drive API** in your Firebase project:
   - Go to: https://console.cloud.google.com/
   - Select your Firebase project
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

2. **Find your service account email**:
   - Open `serviceAccountKey.json`
   - Look for `client_email` - it will look like: `firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com`

3. **Manual sharing** (requires folder ID):
   - Unfortunately, you can't access the service account's drive directly
   - The folder exists but is in the service account's private space

### Option 3: Start Fresh (Recommended)

1. **Add your email to `.env`**:
   ```bash
   GOOGLE_DRIVE_OWNER_EMAIL=yourname@gmail.com
   ```

2. **In the server code**, the folder will be automatically shared when created

3. **Create a new backup** to test:
   - The folder will be created and shared automatically
   - You'll receive an email notification
   - The folder will appear in "Shared with me"

## Verify Setup

After setup, you should see:
- ✅ Folder `PureTrack_Backups` in "Shared with me" 
- ✅ Subfolders: Daily, Weekly, Monthly, Manual
- ✅ Backup files uploaded successfully

## Important Notes

- **Service Account Limitation**: Service accounts don't have a visible "My Drive" - they operate in a separate space
- **Sharing is Required**: You must share the folder to see it in your personal Google Drive
- **Email Notifications**: Google will send you an email when the folder is shared
- **Permissions**: The shared folder will have "Editor" access so you can download and manage backups

## Troubleshooting

### "Folder already exists" but I can't see it
- The folder exists in the service account's space
- You need to share it (see Option 2 above)
- Or delete and recreate (Option 3)

### "Permission denied" error
- Make sure Google Drive API is enabled in your project
- Check that `serviceAccountKey.json` is valid
- Verify the email address in `GOOGLE_DRIVE_OWNER_EMAIL` is correct

### Still can't see the folder
1. Check server logs for sharing confirmation
2. Check your email (including spam) for Google Drive sharing notification
3. Look in "Shared with me" section of Google Drive
4. Make sure you're logged into the correct Google account

## Next Steps

Want me to add an admin API endpoint to manually trigger folder sharing for existing folders?

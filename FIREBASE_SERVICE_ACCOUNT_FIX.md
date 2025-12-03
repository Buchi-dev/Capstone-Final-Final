# 🔥 FIREBASE SERVICE ACCOUNT FIX GUIDE

## Problem Description

You're experiencing **401 Unauthorized errors** with the following symptoms:

- ✗ Users can login but are immediately redirected back to login
- ✗ Backend logs show: `"Invalid JWT Signature"` or `"invalid_grant"` errors
- ✗ Error message: `"Credential implementation provided to initializeApp() via the "credential" property failed to fetch a valid Google OAuth2 access token"`

## Root Cause

**Your Firebase service account credentials have expired or been revoked.**

The backend cannot verify Firebase tokens from the client, causing all authenticated requests to fail with 401 errors.

---

## 🚀 SOLUTION: Generate New Firebase Service Account

### Step 1: Access Firebase Console

1. Go to: https://console.firebase.google.com/
2. Select your project: **smupuretrack**

### Step 2: Navigate to Service Accounts

1. Click on **⚙️ Project Settings** (gear icon in sidebar)
2. Click on **Service accounts** tab
3. You should see: "Firebase Admin SDK"

### Step 3: Generate New Private Key

1. Click **"Generate new private key"** button
2. Click **"Generate key"** in the confirmation dialog
3. A JSON file will be downloaded (e.g., `smupuretrack-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`)
4. **IMPORTANT:** Keep this file secure - it contains sensitive credentials

### Step 4: Update Backend Configuration

#### Option A: Using Environment Variable (Render.com - RECOMMENDED)

1. Go to Render.com dashboard
2. Select your backend service: **puretrack-api**
3. Go to **Environment** tab
4. Find the variable: `FIREBASE_SERVICE_ACCOUNT`
5. Open the downloaded JSON file in a text editor
6. **Copy the ENTIRE JSON content** (it should be one line or properly formatted JSON)
7. **Replace** the value of `FIREBASE_SERVICE_ACCOUNT` with the new JSON
8. Click **"Save Changes"**
9. Render will automatically restart your service

**CRITICAL:** Make sure the JSON is properly formatted. It should look like:
```json
{"type":"service_account","project_id":"smupuretrack","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

#### Option B: Using File Path (Local Development)

1. Copy the downloaded JSON file to your server directory:
   ```
   server/firebase-service-account.json
   ```
2. Update your `.env` file:
   ```
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
   ```
3. Restart the server:
   ```powershell
   cd server
   npm run dev
   ```

### Step 5: Verify the Fix

1. Wait for the backend to restart (30-60 seconds on Render)
2. Clear your browser cache and cookies for the application
3. Try logging in again
4. Check the backend logs - you should see:
   - ✓ `[Firebase] Initialized ✓`
   - ✓ No more "Invalid JWT Signature" errors
   - ✓ `[Auth] Token verified successfully`

---

## 🔒 Security Best Practices

### DO:
- ✅ Keep the service account JSON file **secure and private**
- ✅ Add `firebase-service-account.json` to `.gitignore`
- ✅ Use environment variables for production (Render, Heroku, etc.)
- ✅ Rotate service accounts periodically (every 6-12 months)
- ✅ Limit service account permissions to only what's needed

### DON'T:
- ❌ Commit service account files to Git/GitHub
- ❌ Share service account credentials publicly
- ❌ Use the same service account for multiple environments
- ❌ Leave old service account keys active after generating new ones

---

## 🔍 Verification Checklist

After applying the fix, verify:

- [ ] Backend starts without Firebase errors
- [ ] Users can login successfully
- [ ] Users can access admin/staff dashboards
- [ ] Users are NOT redirected to login after a few seconds
- [ ] Backend logs show successful token verification
- [ ] No "Invalid JWT Signature" errors in logs

---

## 🐛 Troubleshooting

### Issue: "Still getting 401 errors"

**Possible causes:**
1. **JSON format error:** Make sure the entire JSON is copied correctly
2. **Old cached tokens:** Clear browser cache and cookies
3. **Service account not activated:** Wait 2-3 minutes after generating
4. **Wrong project:** Verify you're using the correct Firebase project

**Solution:**
```powershell
# On Render.com, check logs:
# - Go to your service > Logs tab
# - Look for "[Firebase] Initialized ✓" message
# - If you see errors, the JSON might be malformed

# Test locally first:
cd server
# Update .env with FIREBASE_SERVICE_ACCOUNT_PATH
npm run dev
# Check console for Firebase initialization
```

### Issue: "Render keeps failing to start"

**Cause:** Malformed JSON in environment variable

**Solution:**
1. Open the downloaded JSON in VS Code or text editor
2. Use a JSON validator: https://jsonlint.com/
3. Ensure it's **one continuous line** with no line breaks in strings
4. The `private_key` field should have `\n` for newlines, not actual newlines

### Issue: "Service account permissions error"

**Error:** `"serviceusage.services.use" permission required`

**Solution:**
1. Go to: https://console.cloud.google.com/iam-admin/iam
2. Select project: **smupuretrack**
3. Find your service account email
4. Click **Edit** (pencil icon)
5. Add roles:
   - **Firebase Admin SDK Administrator Service Agent**
   - **Service Usage Consumer**
6. Click **Save**
7. Wait 2-3 minutes for propagation
8. Restart backend

---

## 📞 Need More Help?

If you're still experiencing issues after following this guide:

1. **Check backend logs** on Render.com for specific error messages
2. **Check browser console** (F12) for client-side errors
3. **Verify Firebase project** settings are correct
4. **Test locally first** before deploying to Render

---

## ✅ Summary

The fix is simple:
1. **Generate new Firebase service account key** from Firebase Console
2. **Copy the JSON content** 
3. **Update `FIREBASE_SERVICE_ACCOUNT` environment variable** on Render
4. **Restart the backend service**
5. **Clear browser cache** and try logging in

This should resolve the 401 errors and login redirect loop.

# Admin User Management - 401 Unauthorized Error - Troubleshooting Guide

## Problem Summary

When navigating to the Admin User Management page (`/admin/users`), the application fails to load user data with a **401 Unauthorized** error, even though the user is successfully authenticated with Firebase.

### Error Symptoms:
- ✅ User successfully logged in to Firebase
- ✅ Token is attached to HTTP requests
- ❌ Backend returns `401 Unauthorized` 
- ❌ Error message: "Authentication required"
- 🔄 Token refresh attempts also fail

## Root Causes Identified

### 1. **Firebase Service Account Permissions**
The Firebase Admin SDK might lack required IAM permissions to verify tokens.

### 2. **User Not Found in MongoDB**
The Firebase UID doesn't have a corresponding user in the MongoDB database.

### 3. **User Status Issues**
User status is 'pending' or 'suspended', blocking access.

### 4. **Token Verification Failures**
- Expired tokens
- Invalid tokens
- Network issues between server and Firebase

## Solutions Implemented

### 1. Enhanced Authentication Middleware
**File**: `server/src/auth/auth.Middleware.js`

- ✅ Added detailed logging for each authentication step
- ✅ Better error messages with specific failure reasons
- ✅ Token expiration detection
- ✅ Empty token validation
- ✅ Development mode error details

**What it does:**
- Logs every authentication attempt with user details
- Identifies exactly where authentication fails
- Provides actionable error messages

### 2. Firebase Config Improvements
**File**: `server/src/configs/firebase.Config.js`

- ✅ Enhanced error logging for token verification
- ✅ Detects service account permission issues
- ✅ Shows detailed Firebase error codes

**What it does:**
- Alerts you if service account lacks permissions
- Shows which IAM roles are needed
- Logs detailed Firebase error information

### 3. Diagnostic Utilities
**Files**: 
- `server/src/utils/diagnostics.js`
- `client/src/utils/authDiagnostics.ts`

- ✅ New `/health/diagnose-auth` endpoint
- ✅ Client-side diagnostic runner
- ✅ Step-by-step authentication verification

**What it does:**
- Checks authorization header
- Verifies Firebase token validity
- Checks user exists in database
- Validates user status
- Provides detailed report

### 4. Debug Button in Admin UI
**File**: `client/src/pages/admin/AdminUserManagement/AdminUserManagement.tsx`

- ✅ "Debug Auth" button (development mode only)
- ✅ Runs diagnostics and prints to console
- ✅ Easy access to troubleshooting

## How to Use the Diagnostic Tools

### Method 1: Using the Debug Button (Easiest)

1. Navigate to `/admin/users` page
2. Click the **"Debug Auth"** button in the page header
3. Open browser console (F12)
4. Review the detailed diagnostic output

### Method 2: Using Browser Console

```javascript
// In browser console
await window.authDiagnostics.print()
```

### Method 3: Using curl/Postman

```bash
# Get your Firebase token first from browser (Application > Storage > Firebase Auth)
POST http://localhost:5000/health/diagnose-auth
Headers:
  Authorization: Bearer YOUR_FIREBASE_TOKEN
```

## Diagnostic Output Explained

The diagnostic tool checks these steps:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 AUTHENTICATION DIAGNOSTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Headers:
  Authorization: Present
  Token Length: 1234

🔥 Firebase Token:
  UID: abc123...
  Email: user@example.com
  Email Verified: true
  Expires: 2025-11-22T01:35:00.000Z
  Is Expired: false

👤 User Account:
  ID: 6739...
  Email: user@example.com
  Role: admin
  Status: active
  Department: IT Department
  Profile Complete: Yes

❌ Issues Found:
  (None - authentication should work!)

📊 Summary:
  Can Authenticate: ✅ Yes
  Total Issues: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Common Issues & Fixes

### Issue 1: Firebase Service Account Permission Error

**Symptom:**
```
Error: "serviceusage.services.use" permission denied
```

**Solution:**
1. Go to [Google Cloud Console IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find your service account email
3. Add these roles:
   - `Service Account Token Creator`
   - `Firebase Admin SDK Administrator Service Agent`
   - `Service Usage Consumer`
4. Wait 2-3 minutes for propagation
5. Restart the server

### Issue 2: User Not Found in Database

**Symptom:**
```
Diagnostic shows:
  Firebase Token: ✅ Valid
  User Account: ❌ Not found
```

**Solution:**
This means the user exists in Firebase but not in MongoDB. This happens when:
- User registered but account wasn't created in DB
- Database was reset/migrated
- User deleted from DB but not Firebase

**Fix:**
1. Check if user exists in MongoDB:
   ```javascript
   // In MongoDB Compass or shell
   db.users.findOne({ firebaseUid: "THE_FIREBASE_UID" })
   ```
2. If missing, you need to:
   - Delete the user from Firebase and re-register, OR
   - Manually create user document in MongoDB

### Issue 3: User Status is Pending/Suspended

**Symptom:**
```
Diagnostic shows:
  Status: pending
  Issues: Account pending approval
```

**Solution:**
1. Admin needs to approve the account
2. Or manually update in MongoDB:
   ```javascript
   db.users.updateOne(
     { _id: ObjectId("USER_ID") },
     { $set: { status: "active" } }
   )
   ```

### Issue 4: Token Expired

**Symptom:**
```
Firebase Token:
  Is Expired: true
```

**Solution:**
- This should auto-refresh
- Try logging out and back in
- Clear browser cache
- Check system time is correct

### Issue 5: Missing Authorization Header

**Symptom:**
```
Headers:
  Authorization: Missing
```

**Solution:**
- Firebase user not signed in
- Check `auth.currentUser` exists
- Log out and log back in

## Server Logs to Check

When authentication fails, check server logs for:

```
[Auth Middleware] Authentication successful
  userId: 6739...
  email: user@example.com
  role: admin
  status: active
```

If you see errors instead:
```
[Auth Middleware] No authorization header
[Auth Middleware] Firebase token verification failed
[Auth Middleware] User not found in database
[Auth Middleware] Pending user access attempt
[Auth Middleware] Suspended user access attempt
```

## Quick Verification Checklist

- [ ] Server is running without errors
- [ ] MongoDB is connected
- [ ] Firebase Admin SDK initialized successfully
- [ ] User is logged into Firebase (check `auth.currentUser`)
- [ ] User exists in MongoDB database
- [ ] User status is "active" (not "pending" or "suspended")
- [ ] User role is "admin" for admin pages
- [ ] Firebase token is not expired
- [ ] Service account has required permissions

## Testing the Fix

1. **Restart the server** (already done)
2. **Clear browser cache** and reload
3. **Log out and log back in**
4. **Click "Debug Auth"** button
5. **Check browser console** for diagnostic output
6. **Review server logs** for authentication details

## Environment Variables to Verify

```env
# These must be set correctly
FIREBASE_PROJECT_ID=smupuretrack
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
MONGO_URI=mongodb+srv://...
CLIENT_URL=http://localhost:5173
```

## Need More Help?

If authentication still fails after running diagnostics:

1. Run diagnostics and copy the output
2. Check server logs around the time of the error
3. Verify Firebase service account JSON file is valid
4. Check MongoDB user document structure
5. Review browser network tab for request/response details

The enhanced logging should now pinpoint exactly where authentication is failing.

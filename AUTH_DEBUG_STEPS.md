# Authentication Debugging Guide

## Current Status
- ✅ Frontend is sending Firebase ID tokens correctly
- ✅ Token is being added to Authorization header
- ✅ Backend server is running (confirmed via /health endpoint)
- ❌ Backend is rejecting all tokens with "Authentication required"

## Issues Fixed
### 1. Form Warning in UserActionsDrawer ✅
**Fixed**: Restructured the Form component to be the direct wrapper instead of nested in a div.

**Action Required**: Refresh the page to see the fix take effect.

### 2. Infinite 401 Error Loop ✅  
**Fixed**: Added error handling in `useUsers.ts` to stop polling on 401 errors.

## Root Cause Analysis

The backend's Firebase Admin SDK is failing to verify tokens. Possible causes:

### 1. **Firebase Admin SDK Not Properly Initialized**
The service account may have issues or missing permissions.

### 2. **Token Verification Failing**
Check backend logs after restart for detailed error messages.

### 3. **Project ID Mismatch**
Both should be using: `smupuretrack`

## Next Steps to Fix

### Step 1: Restart Backend Server
The enhanced logging has been added but requires restart:

```powershell
# In the server terminal
# Press Ctrl+C to stop
# Then restart with:
npm run dev
```

### Step 2: Check Backend Logs
After restart, look for these log entries when the 401 error occurs:

```
[Firebase] Verifying ID token
[Auth Middleware] Attempting to verify token
[Firebase] Token verification failed
```

The error message will tell us exactly why verification is failing.

### Step 3: Common Fixes

#### If error is "Invalid token format":
The token might be malformed. Check that it's a proper JWT.

#### If error is "Token expired":
Client and server clocks might be out of sync.

#### If error is "Project ID mismatch":
Ensure both client and server use same Firebase project.

#### If error mentions permissions:
Firebase service account needs these IAM roles:
- Firebase Admin SDK Administrator Service Agent
- Service Account Token Creator  
- Service Usage Consumer

### Step 4: Verify Firebase Service Account

```powershell
cd server
node -e "const admin = require('firebase-admin'); const sa = require('./firebase-service-account.json'); console.log('Project:', sa.project_id); console.log('Client Email:', sa.client_email);"
```

Should show:
- Project: `smupuretrack`
- Client Email: `firebase-adminsdk-...@smupuretrack.iam.gserviceaccount.com`

### Step 5: Test Token Manually

Create a test script to verify tokens:

```javascript
// server/test-token.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Paste a token from the browser console
const testToken = 'PASTE_TOKEN_HERE';

admin.auth().verifyIdToken(testToken)
  .then(decoded => {
    console.log('✅ Token valid:', decoded.uid, decoded.email);
  })
  .catch(error => {
    console.error('❌ Token invalid:', error.message);
    console.error('Error code:', error.code);
  });
```

## Quick Fix Attempt

If the issue persists, try this immediate workaround:

### Option A: Force Token Refresh on Client

Add this to `api.config.ts` request interceptor (line 38):

```typescript
const idToken = await currentUser.getIdToken(true); // true = force refresh
```

### Option B: Check Token Validity Period

Tokens expire after 1 hour. If your session has been open longer, try:
1. Sign out
2. Clear browser cache
3. Sign in again
4. Test the user management page

## Monitoring

After making changes, watch for these logs:

**Frontend (Browser Console):**
```
[API] Added token for user: your-email@smu.edu.ph
[API Request] GET /api/v1/users
[API Response] /api/v1/users {success: true, ...}
```

**Backend (Server Console):**
```
[Auth Middleware] Token verified successfully
[Auth Middleware] Authentication successful
```

## Files Modified

1. ✅ `client/src/pages/admin/AdminUserManagement/components/UserActionsDrawer.tsx`
   - Fixed Form component structure

2. ✅ `client/src/hooks/useUsers.ts`
   - Added 401 error handling to prevent infinite loops

3. ✅ `server/src/auth/auth.Middleware.js`
   - Enhanced logging for token verification

4. ✅ `server/src/configs/firebase.Config.js`
   - Enhanced logging for Firebase operations

## Contact Support

If issue persists after following all steps:

1. Copy the backend error logs (especially the Firebase verification failure)
2. Check the Firebase Console for service account status
3. Verify IAM permissions in Google Cloud Console
4. Consider regenerating the service account key

---

**Last Updated**: November 21, 2025
**Status**: Awaiting backend restart for enhanced logging

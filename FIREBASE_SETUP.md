# Firebase Authentication Setup Guide

## Quick Summary

**Issue Fixed:** The authentication system was missing Firebase client SDK integration. The auth service now properly implements Firebase Authentication with Google Sign-In.

**Changes Made:**
1. ✅ Added Firebase SDK to client (`npm install firebase`)
2. ✅ Created Firebase configuration (`client/src/config/firebase.config.ts`)
3. ✅ Updated auth service with `loginWithGoogle()` and `checkAuthStatus()` methods
4. ✅ Updated API client to auto-inject Firebase ID tokens
5. ✅ Added Firebase environment variables to `.env`

---

## Firebase Console Setup (REQUIRED)

You need to get the Firebase Web App credentials from the Firebase Console:

### Step 1: Go to Firebase Console
Visit: https://console.firebase.google.com/project/smupuretrack

### Step 2: Add Web App (if not already added)
1. Click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. If no web app exists, click "Add app" → Select Web (</>) icon
5. Register app with nickname: "SMU PureTrack Web"

### Step 3: Copy Firebase Configuration
You'll see a config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "smupuretrack.firebaseapp.com",
  projectId: "smupuretrack",
  storageBucket: "smupuretrack.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### Step 4: Update `.env` File
Copy the values to `client/.env`:

```bash
# Firebase Client Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=smupuretrack.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smupuretrack
VITE_FIREBASE_STORAGE_BUCKET=smupuretrack.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

### Step 5: Enable Google Sign-In
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Toggle **Enable**
4. Set support email: `hed-jmendoza@smu.edu.ph`
5. Click **Save**

### Step 6: Configure Authorized Domains
1. Still in Authentication → **Settings** → **Authorized domains**
2. Ensure these domains are added:
   - `localhost` (for development)
   - Your production domain when deploying

---

## How Authentication Works Now

### Authentication Flow:

```
User clicks "Sign in with Google"
       ↓
Firebase Auth → Google OAuth
       ↓
User authenticates with Google
       ↓
Firebase returns ID Token
       ↓
Client sends token to Express backend
POST /auth/verify-token
       ↓
Express verifies token with Firebase Admin SDK
       ↓
Express creates/updates user in MongoDB
       ↓
Express returns user profile
       ↓
Client stores user in AuthContext
       ↓
All API calls include Firebase token in Authorization header
```

### Code Structure:

**Client Side:**
- `config/firebase.config.ts` - Firebase initialization
- `services/auth.Service.ts` - Auth methods (loginWithGoogle, logout, etc.)
- `config/api.config.ts` - Auto-injects Firebase token in API requests
- `contexts/AuthContext.tsx` - Global auth state management

**Server Side:**
- `configs/firebase.Config.js` - Firebase Admin SDK
- `auth/auth.Routes.js` - Auth endpoints
- `auth/auth.Middleware.js` - Token verification middleware

---

## Testing Authentication

### 1. Start Both Servers

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
```

### 2. Test Login Flow

1. Navigate to `http://localhost:5173/login`
2. Click "Sign in with Google"
3. Select your Google account
4. You should be redirected to appropriate dashboard based on your role

### 3. Check Console Logs

**Client console should show:**
```
[API Request] POST /auth/verify-token
[API Response] /auth/verify-token { success: true, user: {...} }
```

**Server console should show:**
```
[Auth] New user created { userId: '...', email: '...' }
```
or
```
[Auth] User logged in { userId: '...', email: '...' }
```

---

## Troubleshooting

### Error: "Firebase config is missing"
**Solution:** Copy Firebase config from Firebase Console to `.env` file

### Error: "auth/unauthorized-domain"
**Solution:** Add your domain to Authorized domains in Firebase Console

### Error: "Token verification failed"
**Solution:** 
- Check server has correct `firebase-service-account.json`
- Ensure `FIREBASE_PROJECT_ID=smupuretrack` in server `.env`

### Error: "authService.loginWithGoogle is not a function"
**Solution:** ✅ FIXED - Updated auth service with proper methods

### Error: "authService.checkAuthStatus is not a function"  
**Solution:** ✅ FIXED - Added checkAuthStatus() method as alias

---

## User Roles & Access

After first login, users are created with:
- **Role:** `staff` (default)
- **Status:** `pending` (needs admin approval)

### User Journey:

1. **New User Login** → Status: `pending` → Redirected to `/auth/account-completion`
   - Must complete profile (department, phone number)
   
2. **After Profile Completion** → Redirected to `/auth/pending-approval`
   - Waiting for admin to activate account

3. **Admin Activates User** → Status: `active`
   - Staff: Access to `/staff/dashboard`
   - Admin: Access to `/admin/dashboard`

### Admin Access:
To make yourself an admin:
```javascript
// In MongoDB or use admin panel
db.users.updateOne(
  { email: "your-email@smu.edu.ph" },
  { $set: { role: "admin", status: "active" } }
)
```

---

## API Token Flow

### All authenticated requests now include:

```http
Authorization: Bearer <Firebase-ID-Token>
```

The token is automatically refreshed by Firebase SDK and injected by the API client interceptor.

### Token Lifespan:
- Firebase ID tokens expire after 1 hour
- Automatically refreshed by Firebase SDK
- No manual token management needed

---

## Environment Variables Summary

### Client (`client/.env`)
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=smupuretrack.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=smupuretrack
VITE_FIREBASE_STORAGE_BUCKET=smupuretrack.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Server (`server/.env`)
```bash
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
FIREBASE_PROJECT_ID=smupuretrack
```

---

## Next Steps

1. ✅ Install Firebase: `npm install firebase` (DONE)
2. ⚠️ **Get Firebase Web App credentials from Firebase Console**
3. ⚠️ **Update `client/.env` with actual Firebase config values**
4. ⚠️ **Enable Google Sign-In in Firebase Console**
5. ✅ Test login flow
6. ✅ Create first admin user

---

## Files Modified

1. ✅ `client/package.json` - Added firebase dependency
2. ✅ `client/src/config/firebase.config.ts` - NEW FILE
3. ✅ `client/src/services/auth.Service.ts` - Added Firebase methods
4. ✅ `client/src/config/api.config.ts` - Auto-inject Firebase tokens
5. ✅ `client/.env` - Added Firebase variables (NEEDS VALUES)
6. ✅ `client/.env.example` - Template with Firebase config

---

## Security Notes

- ✅ Firebase credentials in `.env` are public (for client-side apps)
- ✅ Sensitive operations use Firebase ID token verification on server
- ✅ Server validates all tokens with Firebase Admin SDK
- ✅ MongoDB user roles control access to features
- ✅ `.env` file is in `.gitignore` (never commit sensitive data)

---

**Status:** ✅ Code changes complete. Waiting for Firebase Console configuration.

**Estimated Time:** 5-10 minutes to get Firebase credentials and enable Google Sign-In.

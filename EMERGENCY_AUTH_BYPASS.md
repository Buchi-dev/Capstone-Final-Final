# 🚨 EMERGENCY AUTHENTICATION BYPASS MODE

## ⚠️ WARNING: UNSAFE MODE - USE ONLY TEMPORARILY

This guide enables **UNSAFE MODE** to bypass JWT verification when the backend server has clock sync issues or expired Firebase credentials. This allows your system to work immediately but **reduces security**.

---

## 🎯 When to Use This

Use this emergency bypass **ONLY** if:
- ✅ Backend server clock is out of sync with Google's servers
- ✅ Firebase service account credentials expired and you can't update them immediately
- ✅ You need the system working **RIGHT NOW** for critical operations
- ✅ You understand this is a **temporary workaround** with security implications

---

## 🚀 STEP 1: Enable Bypass Mode on Backend

### For Render.com (Production)

1. Go to: https://dashboard.render.com/
2. Select your service: **puretrack-api**
3. Go to **Environment** tab
4. Click **"Add Environment Variable"**
5. Add:
   - **Key:** `BYPASS_JWT_VERIFICATION`
   - **Value:** `true`
6. Click **"Save Changes"**
7. Render will automatically restart your service (wait 30-60 seconds)

### For Local Development

1. Open: `server/.env`
2. Add this line:
   ```
   BYPASS_JWT_VERIFICATION=true
   ```
3. Restart your server:
   ```powershell
   cd server
   npm run dev
   ```

---

## ✅ STEP 2: Test the System

1. Clear browser cache and cookies
2. Go to your application
3. Try logging in with your @smu.edu.ph account
4. You should now be able to access the dashboard without 401 errors

---

## 🔍 What This Does

When bypass mode is enabled:

### Client Side:
- ✅ Uses Firebase authentication (still secure)
- ✅ Falls back to client-side user data if backend fails
- ✅ Validates @smu.edu.ph domain restriction
- ✅ All UI features work normally

### Backend Side:
- ⚠️ **Decodes JWT tokens WITHOUT cryptographic verification**
- ⚠️ Trusts the token contents without validating signature
- ⚠️ Still checks domain (@smu.edu.ph)
- ⚠️ Still checks user status (active/suspended/pending)

### Security Implications:
- 🔴 **Anyone with basic knowledge could forge tokens**
- 🔴 **No protection against token tampering**
- 🟡 Still protected by Firebase client-side auth (harder to exploit)
- 🟡 Domain validation still enforced
- 🟡 Network should be secured (HTTPS, firewall)

---

## 🛡️ Mitigation Steps (Use While in Bypass Mode)

While running in bypass mode, implement these additional protections:

### 1. Network-Level Security
- Ensure your API is only accessible via HTTPS
- Use firewall rules to restrict access
- Consider IP whitelisting if possible

### 2. Application-Level Security
- Keep domain validation (@smu.edu.ph) enabled
- Monitor logs for suspicious activity
- Limit critical operations (user deletion, role changes)

### 3. Monitoring
Check logs regularly:
```powershell
# On Render.com, go to Logs tab and look for:
# "⚠️ RUNNING IN UNSAFE MODE"
```

---

## 🔧 PERMANENT FIX (Do This ASAP!)

### Option A: Fix Firebase Service Account (RECOMMENDED)

Follow the guide in `FIREBASE_SERVICE_ACCOUNT_FIX.md`:

1. Generate new Firebase service account key
2. Update `FIREBASE_SERVICE_ACCOUNT` environment variable
3. Remove `BYPASS_JWT_VERIFICATION=true`
4. Restart server

### Option B: Sync Server Clock (If on VPS/Dedicated Server)

If you have SSH access to your server:

```bash
# For Ubuntu/Debian
sudo apt-get install ntp
sudo systemctl start ntp
sudo systemctl enable ntp
sudo ntpdate -s time.google.com

# For CentOS/RHEL
sudo yum install ntp
sudo systemctl start ntpd
sudo systemctl enable ntpd
sudo ntpdate -u time.google.com

# Verify time
date
timedatectl
```

For Render.com or other PaaS, you **cannot** sync the clock. You **must** fix the Firebase credentials instead.

---

## ❌ DISABLE Bypass Mode (After Fix)

Once you've fixed the root cause, **immediately disable bypass mode**:

### On Render.com:
1. Go to Environment variables
2. **Delete** the `BYPASS_JWT_VERIFICATION` variable
3. Save and let it restart

### On Local:
1. Open `server/.env`
2. **Remove** or set to `false`:
   ```
   BYPASS_JWT_VERIFICATION=false
   ```
3. Restart server

---

## 📊 Verification Checklist

After applying the fix and disabling bypass mode:

- [ ] Backend starts without errors
- [ ] No "UNSAFE MODE" warnings in logs
- [ ] Users can still login successfully
- [ ] No 401 errors when accessing dashboards
- [ ] Backend logs show "Token verified" (not "decoded without verification")

---

## 🆘 Troubleshooting

### "Still getting 401 errors even with bypass enabled"

**Check:**
1. Is the environment variable actually set? (Check Render dashboard)
2. Did the server restart? (Check deployment logs)
3. Is the token being sent? (Check browser console)

**Solution:**
```powershell
# Check backend logs for:
"⚠️ RUNNING IN UNSAFE MODE"

# If you don't see it, the variable isn't set correctly
```

### "Getting 403 Forbidden errors"

**This is different from 401** - means:
- User is authenticated but lacks permissions
- Check user role (admin vs staff)
- Check user status (active vs pending/suspended)

**Solution:**
Check user in MongoDB and update status/role if needed.

### "System works but logs show warnings"

**This is expected** when bypass mode is enabled. The warnings remind you to fix the root cause.

---

## 📞 Summary

### Quick Start (Emergency):
1. **Add:** `BYPASS_JWT_VERIFICATION=true` to backend environment
2. **Restart** backend server
3. **Test** login - should work now
4. **Fix** Firebase credentials or clock sync ASAP
5. **Remove:** `BYPASS_JWT_VERIFICATION` variable
6. **Restart** again

### Remember:
- 🔴 This is a **temporary workaround**, not a permanent solution
- 🔴 Reduces security significantly
- 🔴 Must be disabled once the root cause is fixed
- ✅ Allows system to work immediately during emergencies
- ✅ Client-side Firebase auth still provides some protection

---

## 🎓 Understanding the Problem

The issue occurs because:

1. **JWT tokens have timestamps** (issued at, expires at)
2. **Firebase validates these timestamps** against its servers
3. **If your server clock is wrong**, timestamps don't match
4. **Result:** "Invalid JWT Signature" error

**Normal flow:**
```
Client → Firebase (gets token) → Backend (verifies with Firebase) → ✅ Authenticated
```

**With bypass mode:**
```
Client → Firebase (gets token) → Backend (trusts token without verification) → ⚠️ Authenticated (unsafely)
```

---

**Need help? Check the main fix guide:** `FIREBASE_SERVICE_ACCOUNT_FIX.md`

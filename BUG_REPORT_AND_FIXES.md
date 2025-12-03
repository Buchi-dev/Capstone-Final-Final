# 🐛 Bug Report & Security Issues - Login Flow Analysis

**Analysis Date**: December 3, 2025  
**System**: SMU PureTrack Authentication System  
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 📊 Executive Summary

After analyzing the complete authentication flow, I've identified **11 significant issues** ranging from critical security vulnerabilities to logic bugs that could break the user experience.

**Critical Issues**: 3  
**High Priority**: 4  
**Medium Priority**: 3  
**Low Priority**: 1

---

## 🔴 CRITICAL ISSUES

### 1. 🔴 **Backend Middleware Not Enforcing Authentication**

**File**: `server/src/auth/auth.Middleware.js`  
**Severity**: CRITICAL 🔴  
**Impact**: All protected routes are effectively public

**Problem**:
```javascript
// Current implementation - NO AUTHENTICATION CHECK!
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  // ... decodes token but ALWAYS calls next()
  next(); // ❌ Always proceeds regardless of user existence
});

const ensureAdmin = ensureRole(); // ❌ Returns pass-through
const ensureRole = () => (req, res, next) => next(); // ❌ No role check
```

**Why This Is Dangerous**:
- Anyone can call backend APIs without authentication
- Admin endpoints are not protected
- User deletion, status changes, role changes are all unprotected
- Malicious actors could manipulate MongoDB directly via API

**Current Flow**:
```
Request → Middleware tries to decode token → ALWAYS proceeds → No check if user exists
```

**What Should Happen**:
```
Request → Middleware decodes token → Check if user exists → Return 401 if not → Proceed if valid
```

**Proof of Concept Attack**:
```bash
# Anyone can delete users without authentication
curl -X DELETE http://puretrack-api.onrender.com/api/v1/users/USER_ID

# Anyone can make themselves admin
curl -X PATCH http://puretrack-api.onrender.com/api/v1/users/USER_ID/role \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

**Fix Required**: ✅ See Fix #1 below

---

### 2. 🔴 **Profile Completion Check Missing in Backend**

**File**: `server/src/users/user.Controller.js` line 173  
**Severity**: CRITICAL 🔴  
**Impact**: Users can bypass profile completion

**Problem**:
```javascript
const completeUserProfile = asyncHandler(async (req, res) => {
  // User can only complete their own profile
  if (loggedInUserId !== targetUserId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only complete your own profile',
    });
  }
  // ❌ BUT req.user might be undefined/null because middleware doesn't enforce it!
```

**Why This Is Dangerous**:
- `req.user` may be undefined if middleware fails to attach it
- No check for `req.user` existence before accessing `req.user._id`
- Will throw `Cannot read property '_id' of undefined` error
- Profile completion will fail silently

**Fix Required**: ✅ See Fix #2 below

---

### 3. 🔴 **Race Condition in Login Flow**

**File**: `client/src/pages/auth/AuthLogin/AuthLogin.tsx` lines 95-115  
**Severity**: CRITICAL 🔴  
**Impact**: Users may see wrong page or get stuck on login

**Problem**:
```typescript
// After login, code waits for Firebase auth state
await new Promise<void>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      unsubscribe();
      resolve();
    }
  });
  
  // ⚠️ 5 second timeout - what if Firebase takes longer?
  setTimeout(() => {
    unsubscribe();
    resolve(); // ❌ Resolves even if firebaseUser is null!
  }, 5000);
});

// Then waits 500ms more
await new Promise(resolve => setTimeout(resolve, 500));

// ❌ RACE CONDITION: What if AuthContext hasn't updated yet?
await refetchUser();

// ❌ Then checks isAuthenticated, which might still be false!
if (!isAuthenticated) {
  // Manually navigate based on response
  // But this creates duplicate navigation logic!
}
```

**Why This Is Dangerous**:
- Timeout resolves even if Firebase isn't ready
- Multiple navigation attempts (useEffect + manual)
- AuthContext update might not be complete
- User sees flash of wrong page
- Possible infinite redirect loops

**Observed Behavior**:
```
User clicks login → Backend verifies → Firebase updates → 
AuthContext still loading → Manual navigation fires → 
useEffect navigation also fires → User redirected twice → 
Possible redirect to wrong page or loop
```

**Fix Required**: ✅ See Fix #3 below

---

## 🟠 HIGH PRIORITY ISSUES

### 4. 🟠 **Missing Profile Completion Field in Database**

**File**: `server/src/users/user.Model.js`  
**Severity**: HIGH 🟠  
**Impact**: Cannot track profile completion status

**Problem**:
```javascript
// User schema does NOT have a profileComplete field
const userSchema = new mongoose.Schema({
  department: { type: String },
  phoneNumber: { type: String },
  // ❌ Missing: profileComplete: Boolean
});
```

**But Frontend Expects It**:
```typescript
// client/src/services/auth.Service.ts
export interface AuthUser {
  profileComplete?: boolean; // ✅ Defined in TypeScript
}

// client/src/contexts/AuthContext.tsx
const fallbackUser: AuthUser = {
  profileComplete: true, // ✅ Used in fallback
};
```

**Why This Matters**:
- Cannot reliably determine if profile is complete
- Frontend checks `user.department && user.phoneNumber` instead
- Inconsistent with type definitions
- Harder to query "incomplete profiles" in admin dashboard

**Fix Required**: ✅ See Fix #4 below

---

### 5. 🟠 **Inconsistent Profile Completion Logic**

**File**: Multiple files  
**Severity**: HIGH 🟠  
**Impact**: Different parts of app check differently

**Problem**:
Different files use different logic to check profile completion:

```typescript
// ProtectedRoute.tsx - Checks TWO fields
if (!user.department || !user.phoneNumber) {
  return <Navigate to="/auth/account-completion" replace />;
}

// AuthLogin.tsx - Also checks TWO fields
if (!user.department || !user.phoneNumber) {
  navigate('/auth/account-completion');
}

// RootRedirect.tsx - Only checks status
if (isPending) {
  return <Navigate to="/auth/pending-approval" replace />;
}
// ❌ Doesn't check profile completion at all!

// AuthAccountCompletion.tsx - Checks TWO fields + status
if (user.department && user.phoneNumber) {
  if (user.status === "active") {
    // ...
  }
}
```

**Why This Is Dangerous**:
- Pending users with incomplete profiles can reach wrong pages
- RootRedirect might send incomplete profile to pending approval
- No single source of truth
- Hard to maintain

**Fix Required**: ✅ See Fix #5 below

---

### 6. 🟠 **No Error Handling for Database Failures**

**File**: `server/src/auth/auth.Routes.js` lines 117-119  
**Severity**: HIGH 🟠  
**Impact**: Users cannot login if MongoDB is down

**Problem**:
```javascript
// Save new user
await user.save();

logger.info('[Auth] New user created', {
  userId: user._id,
  email: user.email,
});
// ❌ No try-catch specifically for user.save()
// ❌ Generic catch-all at end returns 401 "Invalid token"
```

**Generic Error Handler**:
```javascript
} catch (error) {
  logger.error('[Auth] Token verification failed', {
    error: error.message,
  });

  res.status(401).json({
    success: false,
    message: 'Invalid or expired token', // ❌ Misleading!
  });
}
```

**Why This Is Dangerous**:
- Database errors show as "Invalid token"
- User thinks their credentials are wrong
- Real issue (DB down) is hidden
- No retry logic or fallback

**Example Error Messages**:
```
MongoDB Timeout → "Invalid or expired token"
Duplicate Key Error → "Invalid or expired token"
Network Error → "Invalid or expired token"
```

**Fix Required**: ✅ See Fix #6 below

---

### 7. 🟠 **Domain Validation Happens AFTER Database Creation**

**File**: `server/src/auth/auth.Routes.js` lines 60-70  
**Severity**: HIGH 🟠  
**Impact**: Invalid users could be created in database

**Problem**:
```javascript
// Domain validation happens BEFORE user creation
const userEmail = decodedToken.email;
if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
  // Validation fails here
  return res.status(403).json({...});
}

// ✅ Good - validation before DB creation
```

**BUT in completeUserProfile**:
```javascript
// No domain validation at all!
const completeUserProfile = asyncHandler(async (req, res) => {
  // ❌ Assumes user is valid because middleware attached req.user
  // ❌ But middleware doesn't validate domain on subsequent requests
```

**Why This Is Dangerous**:
- Only validated on first login
- If domain validation logic changes, existing users not re-checked
- Personal accounts could slip through during system changes

**Fix Required**: ✅ See Fix #7 below

---

## 🟡 MEDIUM PRIORITY ISSUES

### 8. 🟡 **Missing Validation in Profile Completion**

**File**: `server/src/users/user.Controller.js` lines 190-195  
**Severity**: MEDIUM 🟡  
**Impact**: Invalid data could be saved

**Problem**:
```javascript
// Validation only checks if fields exist
if (!department || !phoneNumber) {
  throw new ValidationError('Both department and phone number are required...');
}

// ❌ No validation of department format
// ❌ Phone validation exists in schema but could be more strict
// ❌ No trim() on inputs
// ❌ No length limits enforced
```

**Possible Issues**:
```javascript
// These would all pass validation:
department: "   " // Just spaces
department: "a" // Too short
department: "x".repeat(1000) // Too long
phoneNumber: "12345" // Not enough digits
phoneNumber: "+1234567890123456789" // Too many digits
```

**Fix Required**: ✅ See Fix #8 below

---

### 9. 🟡 **Status Check Polling Could Cause Performance Issues**

**File**: `client/src/pages/auth/AuthPendingApproval/AuthPendingApproval.tsx` lines 69-77  
**Severity**: MEDIUM 🟡  
**Impact**: Unnecessary backend load

**Problem**:
```typescript
// Polls backend every 30 seconds
useEffect(() => {
  if (!isAuthenticated || !user) return;

  const interval = setInterval(async () => {
    console.log("Checking for status updates...");
    await refetchUser(); // ❌ Calls backend every 30s
  }, 30000); // 30 seconds

  return () => clearInterval(interval);
}, [isAuthenticated, user, refetchUser]);
```

**Why This Could Be An Issue**:
- Every pending user polls every 30 seconds
- 100 pending users = 200 requests per minute
- No exponential backoff
- Polling continues even if backend returns error
- No stop condition (keeps polling forever)

**Better Approach**:
- WebSocket connection for real-time updates
- Server-sent events (SSE)
- Exponential backoff (30s → 1m → 2m → 5m)
- Stop after X attempts, show "refresh" button instead

**Fix Required**: ✅ See Fix #9 below

---

### 10. 🟡 **Duplicate Navigation Logic**

**File**: `client/src/pages/auth/AuthLogin/AuthLogin.tsx` lines 33-68  
**Severity**: MEDIUM 🟡  
**Impact**: Code duplication, maintenance burden

**Problem**:
```typescript
// Navigation logic exists in 3 places:

// 1. AuthLogin useEffect (lines 33-68)
if (user.status === 'suspended') {
  navigate('/auth/account-suspended');
} else if (user.status === 'pending') {
  if (!user.department || !user.phoneNumber) {
    navigate('/auth/account-completion');
  } else {
    navigate('/auth/pending-approval');
  }
} else if (user.status === 'active') {
  if (user.role === 'admin') {
    navigate('/admin/dashboard');
  }
  // ...
}

// 2. AuthLogin manual navigation (lines 113-134)
// ❌ EXACT SAME LOGIC DUPLICATED!

// 3. RootRedirect.tsx
// ❌ SIMILAR LOGIC BUT SLIGHTLY DIFFERENT!
```

**Why This Is Bad**:
- Change one place, must change all three
- Easy to introduce bugs with inconsistencies
- Harder to test
- More code to maintain

**Fix Required**: ✅ See Fix #10 below

---

## 🟢 LOW PRIORITY ISSUES

### 11. 🟢 **Inconsistent Logging Levels**

**File**: Multiple files  
**Severity**: LOW 🟢  
**Impact**: Harder to debug in production

**Problem**:
```javascript
// Some places use logger
logger.info('[Auth] User logged in', {...});
logger.error('[Auth] Token verification failed', {...});

// Other places use console
console.log('[AuthContext] Firebase auth state changed');
console.error('[AuthContext] Domain validation failed');
console.warn('[AuthService] Domain validation failed');
```

**Why This Matters**:
- Console logs might not appear in production
- Can't control log levels
- Harder to filter logs
- No structured logging for console statements

**Fix Required**: ✅ See Fix #11 below

---

## ✅ RECOMMENDED FIXES

### Fix #1: Enforce Authentication in Middleware 🔴

**File**: `server/src/auth/auth.Middleware.js`

```javascript
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
      errorCode: 'AUTH_NO_TOKEN'
    });
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('utf-8')
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const decodedToken = JSON.parse(jsonPayload);
    const uid = decodedToken.uid || decodedToken.user_id;
    
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure. Missing user ID.',
        errorCode: 'AUTH_INVALID_TOKEN'
      });
    }
    
    const user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
        errorCode: 'AUTH_USER_NOT_FOUND'
      });
    }
    
    // Domain validation on every request
    if (!user.email || !user.email.endsWith('@smu.edu.ph')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Invalid email domain.',
        errorCode: 'AUTH_INVALID_DOMAIN'
      });
    }
    
    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    logger.error('[Auth Middleware] Token decode failed:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or malformed token.',
      errorCode: 'AUTH_TOKEN_INVALID'
    });
  }
});

// Fix ensureRole to actually check roles
const ensureRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        errorCode: 'AUTH_NO_USER'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        errorCode: 'AUTH_INSUFFICIENT_ROLE'
      });
    }
    
    next();
  };
};

const ensureAdmin = ensureRole('admin');
const ensureStaff = ensureRole('admin', 'staff');

// Keep optionalAuth as pass-through
const optionalAuth = (req, res, next) => {
  // Try to attach user, but don't fail if missing
  authenticateFirebase(req, res, (err) => {
    // Ignore errors, continue without user
    next();
  });
};
```

---

### Fix #2: Add User Existence Check in Profile Completion 🔴

**File**: `server/src/users/user.Controller.js`

```javascript
const completeUserProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, middleName, department, phoneNumber } = req.body;
  
  // ✅ Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'AUTH_NO_USER'
    });
  }
  
  // Get the logged-in user's ID
  const loggedInUserId = (req.user._id || req.user.id).toString();
  const targetUserId = req.params.id;
  
  // User can only complete their own profile
  if (loggedInUserId !== targetUserId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only complete your own profile',
      errorCode: 'AUTH_FORBIDDEN'
    });
  }

  // ✅ Validate inputs (see Fix #8)
  if (!department || !phoneNumber) {
    throw new ValidationError('Both department and phone number are required to complete your profile');
  }

  // Rest of the function...
});
```

---

### Fix #3: Simplify Login Flow - Remove Race Condition 🔴

**File**: `client/src/pages/auth/AuthLogin/AuthLogin.tsx`

```typescript
const handleGoogleLogin = async () => {
  setError(null);
  setIsLoggingIn(true);
  
  try {
    // Login with Google and verify token with backend
    const response = await authService.loginWithGoogle();
    
    console.log('[AuthLogin] Login successful:', response.user.email);
    
    // ✅ SIMPLE: Just refetch user and let useEffect handle navigation
    await refetchUser();
    
    // useEffect will automatically navigate based on user status
    // No manual navigation needed!
    
  } catch (err) {
    console.error('[AuthLogin] Login failed:', err);
    const errorMessage = (err as Error).message || 'Failed to sign in. Please try again.';
    
    if (errorMessage.includes('@smu.edu.ph') || errorMessage.includes('personal account')) {
      setError('Access denied: Only SMU email addresses (@smu.edu.ph) are allowed.');
    } else {
      setError(errorMessage);
    }
    
    setIsLoggingIn(false);
  }
};

// ✅ useEffect handles ALL navigation - single source of truth
useEffect(() => {
  if (loading) return; // Wait for loading to complete
  
  if (isAuthenticated && user) {
    // Use centralized navigation utility (see Fix #10)
    const destination = getUserDestination(user);
    navigate(destination);
    setIsLoggingIn(false);
  }
}, [isAuthenticated, loading, user, navigate]);
```

---

### Fix #4: Add profileComplete Field to User Model 🟠

**File**: `server/src/users/user.Model.js`

```javascript
const userSchema = new mongoose.Schema(
  {
    // ... existing fields ...
    department: {
      type: String,
    },
    phoneNumber: {
      type: String,
      validate: {
        validator: function(v) {
          return !v || /^\+?\d{10,15}$/.test(v);
        },
        message: props => `${props.value} is not a valid phone number!`
      },
    },
    
    // ✅ Add profileComplete field
    profileComplete: {
      type: Boolean,
      default: false,
    },
    
    // ... rest of fields ...
  },
  {
    timestamps: true,
  }
);

// ✅ Add virtual field to auto-calculate profile completion
userSchema.virtual('isProfileComplete').get(function() {
  return !!(this.department && this.phoneNumber);
});

// ✅ Update profile completion on save
userSchema.pre('save', function(next) {
  if (this.department && this.phoneNumber) {
    this.profileComplete = true;
  } else {
    this.profileComplete = false;
  }
  next();
});
```

---

### Fix #5: Create Centralized Navigation Utility 🟠

**File**: `client/src/utils/navigationHelpers.ts` (NEW FILE)

```typescript
import type { AuthUser } from '../services/auth.Service';

/**
 * Determine where user should be redirected based on status and profile
 * SINGLE SOURCE OF TRUTH for navigation logic
 */
export function getUserDestination(user: AuthUser | null): string {
  if (!user) {
    return '/auth/login';
  }

  // Suspended users
  if (user.status === 'suspended') {
    return '/auth/account-suspended';
  }

  // Pending users
  if (user.status === 'pending') {
    // Check profile completion
    const hasProfile = !!(user.department && user.phoneNumber);
    
    if (!hasProfile) {
      return '/auth/account-completion';
    }
    
    return '/auth/pending-approval';
  }

  // Active users - route by role
  if (user.status === 'active') {
    if (user.role === 'admin') {
      return '/admin/dashboard';
    }
    
    if (user.role === 'staff') {
      return '/staff/dashboard';
    }
    
    // Fallback
    return '/dashboard';
  }

  // Default fallback
  return '/auth/pending-approval';
}

/**
 * Check if user profile is complete
 */
export function isProfileComplete(user: AuthUser | null): boolean {
  if (!user) return false;
  return !!(user.department && user.phoneNumber);
}
```

Then update all files to use this utility:

```typescript
// RootRedirect.tsx
import { getUserDestination } from '../utils/navigationHelpers';

export const RootRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingScreen />;
  
  const destination = getUserDestination(user);
  return <Navigate to={destination} replace />;
};

// AuthLogin.tsx
const destination = getUserDestination(user);
navigate(destination);

// ProtectedRoute.tsx
const destination = getUserDestination(user);
return <Navigate to={destination} replace />;
```

---

### Fix #6: Better Error Handling in Auth Routes 🟠

**File**: `server/src/auth/auth.Routes.js`

```javascript
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required',
        errorCode: 'AUTH_NO_TOKEN'
      });
    }

    // Decode token
    let decodedToken;
    try {
      // ... decode logic ...
    } catch (decodeError) {
      logger.error('[Auth] Failed to decode token', { error: decodeError.message });
      return res.status(400).json({
        success: false,
        message: 'Invalid token format',
        errorCode: 'AUTH_TOKEN_INVALID',
      });
    }

    // Domain validation
    const userEmail = decodedToken.email;
    if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
      logger.warn('[Auth] Domain validation failed', { email: userEmail });
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed.',
        errorCode: 'AUTH_INVALID_DOMAIN',
      });
    }

    // Check if user exists
    let user;
    try {
      user = await User.findOne({ firebaseUid: decodedToken.uid });
    } catch (dbError) {
      logger.error('[Auth] Database query failed', { error: dbError.message });
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable. Please try again.',
        errorCode: 'DB_ERROR',
      });
    }

    if (!user) {
      // Create new user
      try {
        // ... parse name logic ...
        
        user = new User({
          firebaseUid: decodedToken.uid,
          email: decodedToken.email || userEmail,
          displayName: fullName,
          firstName,
          middleName,
          lastName,
          profilePicture: decodedToken.picture || '',
          provider: 'firebase',
          role: 'staff',
          status: 'pending',
          lastLogin: new Date(),
        });

        await user.save();
        
        logger.info('[Auth] New user created', {
          userId: user._id,
          email: user.email,
        });
      } catch (saveError) {
        logger.error('[Auth] Failed to save new user', {
          error: saveError.message,
          code: saveError.code,
        });
        
        // Check for duplicate key error
        if (saveError.code === 11000) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists.',
            errorCode: 'USER_ALREADY_EXISTS',
          });
        }
        
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account. Please try again.',
          errorCode: 'USER_CREATION_FAILED',
        });
      }
    } else {
      // Update existing user
      try {
        user.lastLogin = new Date();
        await user.save();
        
        logger.info('[Auth] User logged in', {
          userId: user._id,
          email: user.email,
        });
      } catch (updateError) {
        // Log but don't fail - user can still proceed
        logger.warn('[Auth] Failed to update lastLogin', {
          error: updateError.message,
        });
      }
    }

    res.json({
      success: true,
      user: user.toPublicProfile(),
      message: 'Token verified successfully',
    });
    
  } catch (error) {
    // Catch-all for unexpected errors
    logger.error('[Auth] Unexpected error in verify-token', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});
```

---

### Fix #7: Add Domain Validation to Middleware 🟠

Already included in Fix #1 above ✅

---

### Fix #8: Add Input Validation to Profile Completion 🟡

**File**: `server/src/users/user.Controller.js`

```javascript
const completeUserProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, middleName, department, phoneNumber } = req.body;
  
  // Check authentication
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'AUTH_NO_USER'
    });
  }
  
  // Authorization check
  const loggedInUserId = (req.user._id || req.user.id).toString();
  const targetUserId = req.params.id;
  
  if (loggedInUserId !== targetUserId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only complete your own profile',
      errorCode: 'AUTH_FORBIDDEN'
    });
  }

  // ✅ Strict validation
  if (!department || !phoneNumber) {
    throw new ValidationError('Both department and phone number are required');
  }

  // ✅ Validate department
  const trimmedDept = department.trim();
  if (trimmedDept.length < 2) {
    throw new ValidationError('Department must be at least 2 characters');
  }
  if (trimmedDept.length > 100) {
    throw new ValidationError('Department must not exceed 100 characters');
  }

  // ✅ Validate phone number format
  const trimmedPhone = phoneNumber.trim();
  const phoneRegex = /^\+?\d{10,15}$/;
  if (!phoneRegex.test(trimmedPhone)) {
    throw new ValidationError('Phone number must be 10-15 digits, optionally starting with +');
  }

  // ✅ Validate names if provided
  if (firstName && firstName.trim().length < 1) {
    throw new ValidationError('First name cannot be empty');
  }
  if (lastName && lastName.trim().length < 1) {
    throw new ValidationError('Last name cannot be empty');
  }

  const updates = {
    department: trimmedDept,
    phoneNumber: trimmedPhone,
    profileComplete: true, // ✅ Mark as complete
  };

  // Update name fields if provided
  if (firstName) updates.firstName = firstName.trim();
  if (lastName) updates.lastName = lastName.trim();
  if (middleName !== undefined) updates.middleName = middleName.trim();

  // ... rest of logic ...
});
```

---

### Fix #9: Improve Status Polling 🟡

**File**: `client/src/pages/auth/AuthPendingApproval/AuthPendingApproval.tsx`

```typescript
export const AuthPendingApproval = () => {
  const { user, loading: authLoading, isAuthenticated, refetchUser } = useAuth();
  const navigate = useNavigate();
  const [pollCount, setPollCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  
  // ✅ Exponential backoff polling
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Calculate interval: 30s, 1m, 2m, 5m, then stop
    const intervals = [30000, 60000, 120000, 300000]; // milliseconds
    const maxPolls = intervals.length;
    
    if (pollCount >= maxPolls) {
      console.log('[PendingApproval] Max poll attempts reached. Showing manual refresh.');
      return;
    }
    
    const currentInterval = intervals[pollCount] || intervals[intervals.length - 1];
    
    const interval = setInterval(async () => {
      if (isChecking) return; // Prevent concurrent checks
      
      setIsChecking(true);
      console.log(`[PendingApproval] Auto-checking status (attempt ${pollCount + 1})...`);
      
      try {
        await refetchUser();
        setPollCount(prev => prev + 1);
      } catch (error) {
        console.error('[PendingApproval] Failed to check status:', error);
        // Stop polling on error
        setPollCount(maxPolls);
      } finally {
        setIsChecking(false);
      }
    }, currentInterval);

    console.log(`[PendingApproval] Next check in ${currentInterval / 1000} seconds`);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, refetchUser, pollCount, isChecking]);

  const handleCheckAgain = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    setPollCount(0); // Reset poll count
    
    try {
      await refetchUser();
    } catch (error) {
      console.error('[PendingApproval] Manual check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Show different message if polling stopped
  const pollingActive = pollCount < 4;

  return (
    // ... UI ...
    <Text>
      {pollingActive 
        ? 'We\'re automatically checking for updates...'
        : 'Automatic checks paused. Click below to check manually.'}
    </Text>
    
    <Button 
      onClick={handleCheckAgain}
      loading={isChecking}
      disabled={isChecking}
    >
      {isChecking ? 'Checking...' : 'Check Status Now'}
    </Button>
  );
};
```

---

### Fix #10: Use Centralized Navigation 🟡

Already covered in Fix #5 above ✅

---

### Fix #11: Standardize Logging 🟢

**Create**: `client/src/utils/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = import.meta.env.DEV;
  
  private log(level: LogLevel, context: string, message: string, data?: any) {
    if (!this.isDev && level === 'debug') return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${context}]`;
    
    switch (level) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'debug':
        console.log(prefix, message, data || '');
        break;
    }
  }
  
  debug(context: string, message: string, data?: any) {
    this.log('debug', context, message, data);
  }
  
  info(context: string, message: string, data?: any) {
    this.log('info', context, message, data);
  }
  
  warn(context: string, message: string, data?: any) {
    this.log('warn', context, message, data);
  }
  
  error(context: string, message: string, data?: any) {
    this.log('error', context, message, data);
  }
}

export const logger = new Logger();

// Usage:
// logger.info('AuthContext', 'User logged in', { email: user.email });
// logger.error('AuthService', 'Login failed', error);
```

Then replace all console statements:

```typescript
// Before:
console.log('[AuthContext] User logged in');

// After:
logger.info('AuthContext', 'User logged in', { email: user.email });
```

---

## 🎯 Priority Implementation Order

### Phase 1: Critical Security Fixes (DO IMMEDIATELY)
1. ✅ Fix #1 - Enforce authentication in middleware
2. ✅ Fix #2 - Add user existence checks
3. ✅ Fix #3 - Remove race condition in login

### Phase 2: High Priority Data Integrity (THIS WEEK)
4. ✅ Fix #4 - Add profileComplete field
5. ✅ Fix #5 - Centralize navigation logic
6. ✅ Fix #6 - Better error handling
7. ✅ Fix #7 - Domain validation in middleware

### Phase 3: Medium Priority Improvements (NEXT SPRINT)
8. ✅ Fix #8 - Input validation
9. ✅ Fix #9 - Improve polling
10. ✅ Fix #10 - Use centralized navigation

### Phase 4: Low Priority Polish (WHEN TIME PERMITS)
11. ✅ Fix #11 - Standardize logging

---

## 🧪 Testing Checklist

After implementing fixes, test these scenarios:

### Authentication Tests
- [ ] Login with valid @smu.edu.ph account
- [ ] Try login with personal Gmail (should be rejected)
- [ ] Try accessing protected routes without token
- [ ] Try accessing admin routes as staff user
- [ ] Try accessing pending routes as active user

### Profile Completion Tests
- [ ] New user redirected to account completion
- [ ] Cannot skip profile completion
- [ ] Invalid department rejected
- [ ] Invalid phone number rejected
- [ ] Cannot complete other user's profile

### Status Change Tests
- [ ] Admin changes user to active → User redirected
- [ ] Admin suspends user → User immediately blocked
- [ ] Pending user polls for updates
- [ ] Polling stops after max attempts

### Error Handling Tests
- [ ] Backend down → Proper error message
- [ ] MongoDB timeout → Proper error message
- [ ] Invalid token → Proper error message
- [ ] Duplicate email → Proper error message

---

## 📝 Summary

**Total Issues Found**: 11  
**Critical Issues**: 3 (Auth bypass, profile completion bug, race condition)  
**High Priority**: 4 (Missing field, inconsistent logic, error handling, domain validation)  
**Medium Priority**: 3 (Input validation, polling, duplicate code)  
**Low Priority**: 1 (Logging)

**Estimated Fix Time**:
- Phase 1: 4-6 hours
- Phase 2: 6-8 hours
- Phase 3: 4-6 hours
- Phase 4: 2-3 hours

**Total**: 16-23 hours of development time

**Risk If Not Fixed**:
- 🔴 Critical issues could allow unauthorized access to system
- 🟠 High priority issues could cause user confusion and data corruption
- 🟡 Medium priority issues could degrade user experience
- 🟢 Low priority issues are technical debt

---

**Next Steps**: Prioritize Phase 1 fixes and test thoroughly before deployment!

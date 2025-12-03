# 🔐 Login Flow & User State Management System

## Overview
This document details the complete authentication flow for handling different user states: **New Users**, **Pending Users**, **Active Users**, and **Suspended Users**. The system uses **client-side Firebase Authentication** with **backend user state management** in MongoDB.

---

## 🏗️ Architecture

### **Frontend (React + Firebase)**
- Firebase Authentication (Google OAuth)
- Domain restriction: `@smu.edu.ph` only
- React Context for auth state
- Protected routes based on user status

### **Backend (Express + MongoDB)**
- User state stored in MongoDB
- No JWT verification (client-side auth trust model)
- User status management: `pending`, `active`, `suspended`
- Profile completion tracking

---

## 👤 User States

### 1. **New User** (First-time Login)
**Status**: `pending` (auto-assigned)  
**Profile**: Incomplete (no department/phone)

**Flow**:
```
Login with Google → Verify @smu.edu.ph domain → Create MongoDB user
→ Redirect to Account Completion → User fills profile
→ Redirect to Pending Approval → Wait for admin
```

**Database Record**:
```javascript
{
  firebaseUid: "firebase-uid-123",
  email: "student@smu.edu.ph",
  displayName: "John Doe",
  firstName: "John",
  lastName: "Doe",
  status: "pending",      // ✅ Auto-assigned
  role: "staff",          // ✅ Default role
  department: null,       // ❌ Incomplete
  phoneNumber: null,      // ❌ Incomplete
  profileComplete: false
}
```

### 2. **Pending User** (Awaiting Admin Approval)
**Status**: `pending`  
**Profile**: Complete (has department/phone)

**Flow**:
```
User completes profile → Profile saved to MongoDB
→ Redirect to Pending Approval page → Auto-refresh every 30s
→ Admin activates account → Status changes to "active"
→ Auto-redirect to dashboard
```

**What They See**:
- ⏰ Pending Approval screen
- ✉️ Contact admin button
- 🔄 Check status button
- 🚪 Sign out option

**Database Record**:
```javascript
{
  firebaseUid: "firebase-uid-123",
  email: "student@smu.edu.ph",
  displayName: "John Doe",
  status: "pending",           // ⏳ Waiting for admin
  role: "staff",
  department: "IT",            // ✅ Complete
  phoneNumber: "+639123456789" // ✅ Complete
}
```

### 3. **Active User** (Approved)
**Status**: `active`  
**Access**: Full system access based on role

**Flow**:
```
Admin activates user → Status = "active"
→ User login/refresh → Redirect to role-based dashboard
→ Full access to features
```

**Dashboard Routes**:
- **Admin**: `/admin/dashboard`
- **Staff**: `/staff/dashboard`

**Database Record**:
```javascript
{
  firebaseUid: "firebase-uid-123",
  email: "student@smu.edu.ph",
  status: "active",  // ✅ Approved
  role: "admin",     // or "staff"
  department: "IT",
  phoneNumber: "+639123456789"
}
```

### 4. **Suspended User** (Blocked)
**Status**: `suspended`  
**Access**: Completely blocked from system

**Flow**:
```
Admin suspends user → Status = "suspended"
→ User login/refresh → Redirect to Account Suspended page
→ No system access → Can only sign out or contact admin
```

**What They See**:
- 🚫 Account Suspended screen
- ⚠️ Contact admin button
- 🚪 Sign out option

**Database Record**:
```javascript
{
  firebaseUid: "firebase-uid-123",
  email: "student@smu.edu.ph",
  status: "suspended", // ❌ Blocked
  role: "staff"
}
```

---

## 🔄 Complete Login Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER VISITS APP                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │ Check Firebase │
            │  Auth State    │
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ❌ Not Logged In        ✅ Logged In
         │                       │
         ▼                       ▼
  ┌─────────────┐      ┌──────────────────┐
  │ LOGIN PAGE  │      │ Verify @smu.edu.ph│
  │             │      │     Domain        │
  └─────┬───────┘      └────────┬─────────┘
        │                       │
        │ Google OAuth          │
        └───────────────────────┤
                                │
                    ┌───────────┴──────────┐
                    │                      │
              ❌ Invalid Domain      ✅ Valid Domain
                    │                      │
                    ▼                      ▼
              ┌──────────┐        ┌────────────────┐
              │ Sign Out │        │ Backend Sync   │
              │ + Error  │        │ GET /auth/user │
              └──────────┘        └────────┬───────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                         New User                 Existing User
                              │                         │
                              ▼                         ▼
                   ┌──────────────────┐      ┌──────────────────┐
                   │ Create MongoDB   │      │ Update lastLogin │
                   │ User Record      │      │ Fetch Profile    │
                   │ status=pending   │      └────────┬─────────┘
                   │ role=staff       │               │
                   └────────┬─────────┘               │
                            │                         │
                            └─────────┬───────────────┘
                                      │
                         ┌────────────┴─────────────┐
                         │ Check User Status        │
                         └────────┬─────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
       status =              status =              status =
       "pending"             "active"             "suspended"
            │                     │                     │
            ▼                     ▼                     ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ Check Profile    │  │ Redirect to      │  │ ACCOUNT          │
  │ Complete?        │  │ Dashboard        │  │ SUSPENDED PAGE   │
  └────┬─────────────┘  │                  │  │                  │
       │                │ - Admin:         │  │ - Show warning   │
       │                │   /admin/dash    │  │ - Contact admin  │
  ┌────┴─────┐         │ - Staff:         │  │ - Sign out only  │
  │          │         │   /staff/dash    │  │                  │
  │          │         └──────────────────┘  └──────────────────┘
  │          │
  │          │
No Dept/Phone   Has Dept/Phone
  │                   │
  ▼                   ▼
┌──────────┐  ┌────────────────┐
│ ACCOUNT  │  │ PENDING        │
│COMPLETION│  │ APPROVAL PAGE  │
│          │  │                │
│- Fill    │  │- Waiting msg   │
│  dept    │  │- Auto refresh  │
│- Fill    │  │  every 30s     │
│  phone   │  │- Contact admin │
│- Submit  │  │- Sign out      │
└────┬─────┘  └────────────────┘
     │
     └──────────┐
                │
                ▼
          Profile Saved
                │
                └─────────────┐
                              │
                              ▼
                    ┌──────────────────┐
                    │ PENDING          │
                    │ APPROVAL PAGE    │
                    │                  │
                    │ Wait for admin   │
                    │ to activate      │
                    └──────────────────┘
```

---

## 📁 Key Files & Their Roles

### **Frontend**

#### 1. **AuthContext.tsx** - Central Auth State Management
```typescript
Location: client/src/contexts/AuthContext.tsx

Responsibilities:
✅ Listen to Firebase auth state changes
✅ Fetch user data from backend
✅ Provide auth state to entire app
✅ Handle domain validation (@smu.edu.ph)
✅ Periodic auth checks (every 5 minutes)
✅ Fallback mode if backend fails

Key Functions:
- fetchUser() - Get user from backend
- refetchUser() - Manual refresh
- Domain validation on every auth check

Exports:
- user: Current user object
- loading: Loading state
- isAuthenticated: Boolean
- isActive: status === "active"
- isPending: status === "pending"
- isSuspended: status === "suspended"
- isAdmin: role === "admin"
- isStaff: role === "staff"
```

#### 2. **ProtectedRoute.tsx** - Route Guards
```typescript
Location: client/src/components/ProtectedRoute.tsx

Components:
1. ProtectedRoute - Requires authentication only
2. ApprovedRoute - Requires active status
3. AdminRoute - Requires admin role + active status
4. PublicRoute - Only for non-authenticated users
5. AccountCompletionRoute - For profile completion flow

Logic:
✅ Check authentication
✅ Validate domain (@smu.edu.ph)
✅ Check user status (pending/active/suspended)
✅ Check profile completion (department/phone)
✅ Redirect based on status:
   - No profile → /auth/account-completion
   - Pending → /auth/pending-approval
   - Suspended → /auth/account-suspended
   - Active → Dashboard
```

#### 3. **Auth Service** - API Communication
```typescript
Location: client/src/services/auth.Service.ts

Functions:
- verifyToken(idToken) - Sync user to backend
- getCurrentUser() - Fetch current user
- loginWithGoogle() - Google OAuth login
- logout() - Sign out

Flow:
1. User clicks "Sign in with Google"
2. Firebase popup authentication
3. Verify @smu.edu.ph domain
4. Send Firebase token to backend
5. Backend syncs user to MongoDB
6. Return user profile
```

#### 4. **Auth Pages**
```typescript
AuthLogin              → /auth/login
AuthAccountCompletion  → /auth/account-completion
AuthPendingApproval    → /auth/pending-approval
AuthAccountSuspended   → /auth/account-suspended

Each page:
✅ Checks auth state
✅ Validates domain
✅ Auto-redirects based on status
✅ Periodic status checks (30s interval)
```

### **Backend**

#### 1. **auth.Routes.js** - Authentication Endpoints
```javascript
Location: server/src/auth/auth.Routes.js

POST /auth/verify-token
Purpose: Sync Firebase user to MongoDB
Flow:
1. Decode Firebase token (no verification - trust client)
2. Validate @smu.edu.ph domain
3. Check if user exists in MongoDB
4. If new → Create user (status=pending, role=staff)
5. If existing → Update lastLogin
6. Return user profile

Security Notes:
❌ No token verification (client-side trust model)
✅ Domain validation enforced
✅ Auto-assign pending status to new users
```

#### 2. **auth.Middleware.js** - Route Protection
```javascript
Location: server/src/auth/auth.Middleware.js

Middleware Functions:
- authenticateFirebase - Pass-through (no verification)
- ensureAuthenticated - Alias for authenticateFirebase
- ensureRole() - Pass-through (no role check)
- ensureAdmin - Pass-through (no admin check)
- optionalAuth - Pass-through
- authenticatePendingAllowed - Pass-through

Current State:
⚠️ ALL middleware are pass-through (no backend verification)
⚠️ Security relies 100% on client-side Firebase auth
⚠️ Backend trusts all requests from authenticated Firebase users
```

#### 3. **user.Model.js** - User Schema
```javascript
Location: server/src/users/user.Model.js

Schema Fields:
- firebaseUid: Unique Firebase ID
- email: User email (unique, @smu.edu.ph)
- displayName: Full name
- firstName, lastName, middleName: Name components
- department: User's department (required for completion)
- phoneNumber: Contact number (required for completion)
- profilePicture: Google profile photo
- role: "admin" | "staff" (default: "staff")
- status: "pending" | "active" | "suspended" (default: "pending")
- provider: "firebase" | "google" | "local"
- lastLogin: Last login timestamp
- notificationPreferences: Email/push notification settings

Validation:
✅ Email must be unique and lowercase
✅ Phone number must match: /^\+?\d{10,15}$/
✅ Status enum enforced
✅ Role enum enforced

Methods:
- toPublicProfile() - Safe user object without sensitive fields
```

#### 4. **user.Controller.js** - User Management
```javascript
Location: server/src/users/user.Controller.js

Key Functions:

completeUserProfile(req, res)
Purpose: Allow users to complete their profile
Requirements:
✅ User can only complete their own profile
✅ Must provide department AND phoneNumber
✅ Optional: firstName, lastName, middleName
✅ Auto-updates displayName if names change
Flow:
1. Validate user owns the profile (userId match)
2. Require department + phoneNumber
3. Update MongoDB user record
4. Return updated profile

updateUserStatus(req, res)
Purpose: Admin changes user status
Options: "active" | "pending" | "suspended"
Security: Admin-only endpoint
Effect: Immediately changes user access

updateUserRole(req, res)
Purpose: Admin changes user role
Options: "admin" | "staff"
Security: Admin-only endpoint
Effect: Changes dashboard access

getAllUsers(req, res)
Purpose: Fetch all users with filters
Filters: role, status, pagination
Returns: User list with pagination metadata
```

#### 5. **user.Routes.js** - User API Endpoints
```javascript
Location: server/src/users/user.Routes.js

Routes:
GET    /api/v1/users                      - List all users
GET    /api/v1/users/:id                  - Get user by ID
PATCH  /api/v1/users/:id/role             - Update user role (admin)
PATCH  /api/v1/users/:id/status           - Update user status (admin)
PATCH  /api/v1/users/:id/profile          - Update user profile (admin)
PATCH  /api/v1/users/:id/complete-profile - Complete profile (self-service)
DELETE /api/v1/users/:id                  - Delete user (admin)

Security:
⚠️ Middleware are pass-through (no real protection)
⚠️ Client must enforce authorization rules
```

---

## 🔐 Security Model

### **Client-Side Security**
✅ Firebase Authentication (Google OAuth)  
✅ Domain restriction: `@smu.edu.ph` ONLY  
✅ Token refresh every API call  
✅ Protected routes based on user status  
✅ Periodic auth checks (5 min interval)  
✅ Immediate sign-out on domain mismatch  

### **Backend Security**
⚠️ **TRUST-BASED MODEL** - No JWT verification  
⚠️ Backend trusts all Firebase-authenticated users  
✅ Domain validation on token decode  
✅ MongoDB stores user state (status/role)  
✅ Admin actions tracked in logs  

### **Risk Assessment**
**Medium Risk**: Backend does not verify tokens  
**Mitigation**: Client-side Firebase auth + domain restriction  
**Assumption**: Firebase tokens are trustworthy  
**Trade-off**: Simplicity vs. deep security  

---

## 🔧 Admin User Management

### How Admins Control Users

#### 1. **Activate Pending Users**
```
Admin Dashboard → Users → Filter: "Pending"
→ Select user → Change status to "Active"
→ User auto-redirected to dashboard on next refresh
```

#### 2. **Suspend Users**
```
Admin Dashboard → Users → Select user
→ Change status to "Suspended"
→ User immediately blocked from system
→ Redirected to account suspended page
```

#### 3. **Change Roles**
```
Admin Dashboard → Users → Select user
→ Change role: "Staff" ↔ "Admin"
→ User dashboard access updated
```

#### 4. **Monitor New Registrations**
```
Admin Dashboard → Users → Filter: "Pending"
→ View incomplete profiles (no dept/phone)
→ View completed profiles awaiting approval
```

---

## 📊 User Journey Examples

### **Example 1: Happy Path (New User)**
```
1. Student visits https://puretrack-final.web.app
2. Clicks "Sign in with Google"
3. Selects @smu.edu.ph account
4. System creates MongoDB user (status=pending, role=staff)
5. Redirected to /auth/account-completion
6. Fills department: "IT" and phone: "+639123456789"
7. Submits form → Profile saved
8. Redirected to /auth/pending-approval
9. Sees message: "Waiting for admin approval"
10. Admin activates account → status="active"
11. Student refreshes → Auto-redirect to /staff/dashboard
12. ✅ Full access granted
```

### **Example 2: Suspended User**
```
1. Active user logs in
2. System fetches user from backend
3. Admin had suspended account (status=suspended)
4. User auto-redirected to /auth/account-suspended
5. Sees: "Your account has been suspended"
6. Can contact admin or sign out
7. ❌ Cannot access any dashboard features
```

### **Example 3: Invalid Domain**
```
1. User tries logging in with personal Gmail
2. Firebase authentication succeeds
3. Client validates domain (@smu.edu.ph)
4. ❌ Domain validation fails
5. Immediate sign-out
6. Error: "Only SMU email addresses are allowed"
7. Redirected back to login page
```

### **Example 4: Admin Promotion**
```
1. Staff user logs in → /staff/dashboard
2. Admin changes role from "staff" to "admin"
3. Staff user navigates to /admin/users
4. Route guard checks role
5. ✅ Role = "admin" → Access granted
6. User now sees admin dashboard
```

---

## 🐛 Troubleshooting

### **Issue: User stuck on login page**
**Cause**: Backend not syncing user  
**Check**:
1. Backend logs for `/auth/verify-token` errors
2. MongoDB connection status
3. Firebase token validity
4. Domain validation passing

### **Issue: User redirects to wrong page**
**Cause**: Status/role mismatch  
**Check**:
1. MongoDB user record status field
2. AuthContext user state
3. Protected route logic
4. Browser console for redirect logs

### **Issue: Admin can't activate users**
**Cause**: API endpoint not working  
**Check**:
1. Backend logs for `PATCH /users/:id/status`
2. MongoDB update success
3. Frontend user refresh after update

### **Issue: Personal email allowed**
**Cause**: Domain validation disabled  
**Fix**:
1. Check AuthContext.tsx domain validation
2. Check auth.Routes.js domain validation
3. Check ProtectedRoute.tsx domain validation

---

## 🔄 Status Change Flowchart

```
┌──────────────────────────────────────────────────────┐
│              ADMIN CHANGES USER STATUS               │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Update MongoDB       │
          │ user.status = "active"│
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ User's Next Action:  │
          │ - Login              │
          │ - Page Refresh       │
          │ - Auto 30s Check     │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Client Calls         │
          │ GET /auth/user       │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Backend Returns      │
          │ Updated User Object  │
          │ status = "active"    │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ AuthContext Updates  │
          │ user state           │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Protected Routes     │
          │ Re-evaluate          │
          └──────────┬───────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Auto-Redirect to     │
          │ Appropriate Dashboard│
          └──────────────────────┘
```

---

## ✅ Implementation Checklist

### **Frontend**
- [x] Firebase Google OAuth setup
- [x] Domain validation (@smu.edu.ph)
- [x] AuthContext with user state
- [x] Protected route guards
- [x] Account completion page
- [x] Pending approval page
- [x] Account suspended page
- [x] Periodic status checks (30s)
- [x] Auto-redirects based on status
- [x] Fallback mode for backend failures

### **Backend**
- [x] Token decode endpoint (no verification)
- [x] User model with status field
- [x] New user auto-creation (pending status)
- [x] Complete profile endpoint
- [x] Admin user management endpoints
- [x] Status change endpoint
- [x] Role change endpoint
- [x] Domain validation on backend

### **Database**
- [x] User schema with status enum
- [x] Profile completion fields (dept, phone)
- [x] Role field (admin/staff)
- [x] lastLogin tracking
- [x] Notification preferences

---

## 🚀 Next Steps for Implementation

1. **Test all user flows manually**
2. **Verify domain validation on both ends**
3. **Test admin user management features**
4. **Monitor logs for auth errors**
5. **Set up automated testing for auth flows**
6. **Document admin procedures for user management**
7. **Create monitoring dashboard for pending users**

---

## 📝 Notes

- ⚠️ **Backend does NOT verify Firebase tokens** - Trust model
- ✅ **Domain validation is critical** - Only line of defense
- 🔄 **Status checks every 30s** - Keep UI in sync with database
- 🎯 **Client-side routing** - All access control on frontend
- 📊 **MongoDB is source of truth** - User status stored in DB
- 🔐 **Firebase is identity provider** - Authentication only

---

**Last Updated**: December 3, 2025  
**System Version**: 1.0  
**Auth Model**: Client-Side Firebase + Backend State Management

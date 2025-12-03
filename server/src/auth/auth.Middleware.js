// No Firebase Admin imports needed - client handles all auth
const User = require('../users/user.Model');
const logger = require('../utils/logger');
const { AuthenticationError, NotFoundError } = require('../errors');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * NO-OP Authentication Middleware
 * Client handles all authentication via Firebase
 * Backend is now open - security handled on client side
 */
const authenticateFirebase = asyncHandler(async (req, res, next) => {
  logger.info('[Auth Middleware] SECURITY DISABLED - Client-side auth only', {
    path: req.path,
  });
  
  // Extract email from Authorization header if provided (for logging only)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Try to decode token for logging (no verification)
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
      
      // Try to find user for request context
      const user = await User.findOne({ firebaseUid: uid });
      if (user) {
        req.user = user;
        req.firebaseUser = decodedToken;
      }
    } catch (error) {
      // Ignore decode errors - just continue without user
      logger.warn('[Auth Middleware] Could not decode token, continuing anyway', {
        path: req.path,
      });
    }
  }
  
  // Always allow request through
  next();
});

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const ensureAuthenticated = authenticateFirebase;

/**
 * Middleware to check if user has specific role  
 * NO-OP: All roles allowed since client handles auth
 * @param {...string} roles - Allowed roles (ignored)
 * @returns {Function} Express middleware function
 */
const ensureRole = (...roles) => {
  return async (req, res, next) => {
    logger.info('[Auth Middleware] Role check DISABLED - allowing all access', {
      requiredRoles: roles,
      path: req.path,
    });
    // Allow all requests through
    next();
  };
};

/**
 * Optional authentication - same as authenticateFirebase now (no auth)
 */
const optionalAuth = async (req, res, next) => {
  // Just continue - no authentication required
  next();
};

/**
 * Middleware to check if user is admin
 */
const ensureAdmin = ensureRole('admin');

/**
 * Middleware to check if user is staff or admin
 */
const ensureStaff = ensureRole('admin', 'staff');

/**
 * Authentication middleware that allows pending users
 * NO-OP: All users allowed since client handles auth
 */
const authenticatePendingAllowed = async (req, res, next) => {
  logger.info('[Auth Middleware] Pending auth check DISABLED', {
    path: req.path,
  });
  // Allow all requests through
  next();
};

module.exports = {
  authenticateFirebase,
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  optionalAuth,
  authenticatePendingAllowed,
};
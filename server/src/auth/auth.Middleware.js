const User = require('../users/user.Model');
const logger = require('../utils/logger');
const { AuthenticationError, NotFoundError } = require('../errors');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Authentication Middleware
 * Validates user session and attaches user to request
 */
const authenticateUser = asyncHandler(async (req, res, next) => {
  // Get user ID from session or header (set by client after Firebase auth)
  const userId = req.headers['x-user-id'] || req.session?.userId;

  if (!userId) {
    logger.warn('[Auth Middleware] No user ID provided', {
      path: req.path,
      hasSession: !!req.session,
    });
    throw AuthenticationError.missingToken();
  }

  // Get user from database
  const user = await User.findById(userId);

  if (!user) {
    logger.warn('[Auth Middleware] User not found in database', {
      userId,
      path: req.path,
    });
    throw new NotFoundError('User', userId);
  }

  // Validate email domain
  if (!user.email || !user.email.endsWith('@smu.edu.ph')) {
    logger.warn('[Auth Middleware] Domain validation failed', {
      email: user.email,
      path: req.path,
    });
    throw AuthenticationError.invalidDomain(user.email);
  }

  // Check user status
  if (user.status === 'suspended') {
    logger.warn('[Auth Middleware] Suspended user access attempt', {
      userId: user._id,
      email: user.email,
      path: req.path,
    });
    throw AuthenticationError.accountSuspended();
  }

  if (user.status === 'pending') {
    logger.warn('[Auth Middleware] Pending user access attempt', {
      userId: user._id,
      email: user.email,
      path: req.path,
    });
    throw AuthenticationError.accountPending();
  }

  // Attach user to request
  req.user = user;

  // Only log successful authentication in verbose mode
  if (process.env.VERBOSE_LOGGING === 'true') {
    logger.info('[Auth Middleware] Authentication successful', {
      userId: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      path: req.path,
    });
  }

  next();
});

/**
 * Optional Authentication Middleware
 * Attaches user to request if authenticated, but doesn't fail if not
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.session?.userId;

  if (userId) {
    try {
      const user = await User.findById(userId);
      if (user && user.email && user.email.endsWith('@smu.edu.ph') &&
          user.status !== 'suspended' && user.status !== 'pending') {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('[Auth Middleware] Optional auth failed', {
        userId,
        error: error.message,
      });
    }
  }

  next();
});

/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const ensureAuthenticated = authenticateUser;

/**
 * Middleware to check if user has specific role
 * @param {...string} roles - Allowed roles
 * @returns {Array} Array of Express middleware functions
 */
const ensureRole = (...roles) => {
  return [
    authenticateUser,
    (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed',
        });
      }

      if (!roles.includes(req.user.role)) {
        logger.warn('[Auth Middleware] Insufficient permissions', {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles: roles,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          requiredRoles: roles,
          userRole: req.user.role,
        });
      }

      next();
    }
  ];
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
 * Used for endpoints like profile completion where pending users need access
 */
const authenticatePendingAllowed = async (req, res, next) => {
  const userId = req.headers['x-user-id'] || req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'No user ID provided',
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Validate email domain
    if (!user.email || !user.email.endsWith('@smu.edu.ph')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed.',
      });
    }

    // Check user status - only block suspended users
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
      });
    }

    // Allow pending users through (they need to complete their profile)
    req.user = user;

    next();
  } catch (error) {
    logger.error('[Auth Middleware] Authentication failed', {
      error: error.message,
      path: req.path,
    });

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

module.exports = {
  authenticateUser,
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  optionalAuth,
  authenticatePendingAllowed,
};
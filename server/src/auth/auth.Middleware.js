/**
 * Middleware to check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
};

/**
 * Middleware to check if user has specific role
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware function
 */
const ensureRole = (...roles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const ensureAdmin = ensureRole('admin');

/**
 * Middleware to check if user is staff or admin
 */
const ensureStaff = ensureRole('admin', 'staff');

module.exports = {
  ensureAuthenticated,
  ensureRole,
  ensureAdmin,
  ensureStaff,
};

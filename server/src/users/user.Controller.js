const User = require('./user.Model');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const asyncHandler = require('../middleware/asyncHandler');
const { findByIdOrFail, updateByIdOrFail } = require('../utils/dbOperations');
const { buildAndExecuteQuery } = require('../utils/queryBuilder');
const { 
  validateObjectId, 
  validateUserRole, 
  validateUserStatus,
  sanitizeUpdateFields 
} = require('../utils/validationService');

/**
 * Get user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserById = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, 'User ID');
  
  const user = await findByIdOrFail(User, req.params.id, {
    select: '-googleId',
    lean: true,
  });

  ResponseHelper.successWithTransform(res, user);
});

/**
 * Get all users (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const result = await buildAndExecuteQuery(User, req.query, {
    allowedFilters: ['role', 'status'],
    defaultSort: '-createdAt',
    defaultLimit: 10,
    select: '-googleId -firebaseUid',
    searchFields: ['displayName', 'email', 'department'],
  });

  ResponseHelper.paginatedWithTransform(res, result.data, result.pagination);
});

/**
 * Update user role (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserRole = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, 'User ID');
  validateUserRole(req.body.role);

  const user = await updateByIdOrFail(User, req.params.id, 
    { role: req.body.role },
    { select: '-googleId' }
  );

  // Check if admin is modifying their own role (requires logout)
  const requiresLogout = req.user._id.toString() === req.params.id;

  ResponseHelper.success(
    res, 
    { ...user.toPublicProfile(), requiresLogout },
    'User role updated successfully'
  );
});

/**
 * Update user status (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, 'User ID');
  validateUserStatus(req.body.status);

  const user = await updateByIdOrFail(User, req.params.id,
    { status: req.body.status },
    { select: '-googleId' }
  );

  // Check if admin is modifying their own status (requires logout)
  const requiresLogout = req.user._id.toString() === req.params.id;

  ResponseHelper.success(
    res,
    { ...user.toPublicProfile(), requiresLogout },
    'User status updated successfully'
  );
});

/**
 * Update user profile (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserProfile = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, 'User ID');
  
  const allowedFields = ['displayName', 'firstName', 'lastName', 'middleName', 'department', 'phoneNumber'];
  const updates = sanitizeUpdateFields(req.body, allowedFields);

  const user = await updateByIdOrFail(User, req.params.id, updates, {
    select: '-googleId',
  });

  ResponseHelper.success(
    res,
    { ...user.toPublicProfile(), updates },
    'User profile updated successfully'
  );
});

/**
 * Complete user profile (Self - for new users)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const completeUserProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, middleName, department, phoneNumber } = req.body;
  
  // Get the logged-in user's ID
  const loggedInUserId = (req.user._id || req.user.id).toString();
  const targetUserId = req.params.id;
  
  // User can only complete their own profile
  if (loggedInUserId !== targetUserId) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only complete your own profile',
    });
  }

  // Strict validation: Both department and phoneNumber must be provided
  if (!department || !phoneNumber) {
    throw new ValidationError('Both department and phone number are required to complete your profile');
  }

  const updates = {
    department,
    phoneNumber,
  };

  // Also update name fields if provided
  if (firstName) updates.firstName = firstName;
  if (lastName) updates.lastName = lastName;
  if (middleName !== undefined) updates.middleName = middleName;

  // Update displayName if names changed
  if (firstName || lastName || middleName !== undefined) {
    const user = await User.findById(req.params.id);
    if (user) {
      const updatedFirstName = firstName || user.firstName || '';
      const updatedLastName = lastName || user.lastName || '';
      const updatedMiddleName = middleName !== undefined ? middleName : user.middleName || '';
      
      updates.displayName = [updatedFirstName, updatedMiddleName, updatedLastName]
        .filter(name => name.trim())
        .join(' ')
        .trim();
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-googleId');

  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }


  ResponseHelper.success(
    res,
    { ...user.toPublicProfile(), updates },
    'Profile completed successfully'
  );
});

/**
 * Delete user (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteUser = asyncHandler(async (req, res) => {
  const { deleteByIdOrFail } = require('../utils/dbOperations');
  
  validateObjectId(req.params.id, 'User ID');
  
  await deleteByIdOrFail(User, req.params.id);

  ResponseHelper.success(res, { userId: req.params.id }, 'User deleted successfully');
});

/**
 * Get user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getUserPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }

  // Only allow users to view their own preferences unless admin
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only view your own preferences',
    });
  }

  ResponseHelper.success(res, user.notificationPreferences || {});
});

/**
 * Update user notification preferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateUserPreferences = asyncHandler(async (req, res) => {
  const {
    emailNotifications,
    pushNotifications,
    sendScheduledAlerts,
    alertSeverities,
    parameters,
    devices,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
  } = req.body;

  // Only allow users to update their own preferences unless admin
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only update your own preferences',
    });
  }

  const updates = {};
  if (emailNotifications !== undefined) updates['notificationPreferences.emailNotifications'] = emailNotifications;
  if (pushNotifications !== undefined) updates['notificationPreferences.pushNotifications'] = pushNotifications;
  if (sendScheduledAlerts !== undefined) updates['notificationPreferences.sendScheduledAlerts'] = sendScheduledAlerts;
  if (alertSeverities !== undefined) updates['notificationPreferences.alertSeverities'] = alertSeverities;
  if (parameters !== undefined) updates['notificationPreferences.parameters'] = parameters;
  if (devices !== undefined) updates['notificationPreferences.devices'] = devices;
  if (quietHoursEnabled !== undefined) updates['notificationPreferences.quietHoursEnabled'] = quietHoursEnabled;
  if (quietHoursStart !== undefined) updates['notificationPreferences.quietHoursStart'] = quietHoursStart;
  if (quietHoursEnd !== undefined) updates['notificationPreferences.quietHoursEnd'] = quietHoursEnd;

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('No valid preference fields to update');
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }

  ResponseHelper.success(res, user.notificationPreferences, 'Notification preferences updated successfully');
});

/**
 * Reset user notification preferences to defaults
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resetUserPreferences = asyncHandler(async (req, res) => {
  // Only allow users to reset their own preferences unless admin
  if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You can only reset your own preferences',
    });
  }

  const defaultPreferences = {
    emailNotifications: true,
    pushNotifications: false,
    sendScheduledAlerts: true,
    alertSeverities: ['Critical', 'Warning'],
    parameters: ['pH', 'Turbidity', 'TDS'],
    devices: [],
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  };

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { notificationPreferences: defaultPreferences },
    { new: true }
  );

  if (!user) {
    throw new NotFoundError('User', req.params.id);
  }

  ResponseHelper.success(res, user.notificationPreferences, 'Notification preferences reset to defaults');
});

module.exports = {
  getUserById,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserProfile,
  completeUserProfile,
  deleteUser,
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
};

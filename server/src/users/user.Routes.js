const express = require('express');
const {
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
} = require('./user.Controller');
const { ensureAuthenticated, ensureAdmin, authenticatePendingAllowed } = require('../auth/auth.Middleware');
const {
  validateUserRoleUpdate,
  validateUserStatusUpdate,
  validateMongoId,
  validatePagination,
} = require('../middleware/validation.middleware');

const router = express.Router();

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (with filters)
 * @access  Public (temporarily for testing)
 */
router.get('/', validatePagination, getAllUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', validateMongoId, getUserById);

/**
 * @route   PATCH /api/v1/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/:id/role', ensureAdmin, validateMongoId, validateUserRoleUpdate, updateUserRole);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Update user status
 * @access  Admin only
 */
router.patch('/:id/status', ensureAdmin, validateMongoId, validateUserStatusUpdate, updateUserStatus);

/**
 * @route   PATCH /api/users/:id/profile
 * @desc    Update user profile
 * @access  Admin only
 */
router.patch('/:id/profile', ensureAdmin, updateUserProfile);

/**
 * @route   PATCH /api/users/:id/complete-profile
 * @desc    Complete user profile (self-service for new users)
 * @access  Public (including pending - own profile only)
 */
router.patch('/:id/complete-profile', completeUserProfile);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteUser);

/**
 * @route   GET /api/users/:id/preferences
 * @desc    Get user notification preferences
 * @access  Public (own preferences or admin)
 */
router.get('/:id/preferences', getUserPreferences);

/**
 * @route   PUT /api/users/:id/preferences
 * @desc    Update user notification preferences
 * @access  Public (own preferences or admin)
 */
router.put('/:id/preferences', updateUserPreferences);

/**
 * @route   DELETE /api/users/:id/preferences
 * @desc    Reset user notification preferences to defaults
 * @access  Public (own preferences or admin)
 */
router.delete('/:id/preferences', resetUserPreferences);

module.exports = router;

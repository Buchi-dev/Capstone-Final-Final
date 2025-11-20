const express = require('express');
const {
  getUserById,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} = require('./user.Controller');
const { ensureAuthenticated, ensureAdmin } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /api/users
 * @desc    Get all users (with filters)
 * @access  Admin only
 */
router.get('/', ensureAdmin, getAllUsers);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Authenticated users
 */
router.get('/:id', ensureAuthenticated, getUserById);

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/:id/role', ensureAdmin, updateUserRole);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Update user status
 * @access  Admin only
 */
router.patch('/:id/status', ensureAdmin, updateUserStatus);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin only
 */
router.delete('/:id', ensureAdmin, deleteUser);

module.exports = router;

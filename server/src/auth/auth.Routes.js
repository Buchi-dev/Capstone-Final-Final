const express = require('express');
const { authenticateUser, optionalAuth } = require('./auth.Middleware');
const User = require('../users/user.Model');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user with Firebase Auth data
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, uid, displayName, photoURL } = req.body;

    if (!email || !uid) {
      return res.status(400).json({
        success: false,
        message: 'Email and UID are required',
      });
    }

    // Validate email domain
    if (!email.endsWith('@smu.edu.ph')) {
      logger.warn('[Auth] Domain validation failed - personal account rejected', {
        email,
        requiredDomain: '@smu.edu.ph',
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed. Personal accounts are not permitted.',
        errorCode: 'AUTH_INVALID_DOMAIN',
      });
    }

    // Check if user exists in database
    let user = await User.findOne({ email });

    if (!user) {
      // Parse name components
      const fullName = displayName || 'User';
      const nameParts = fullName.trim().split(/\s+/);

      let firstName = '';
      let lastName = '';

      if (nameParts.length >= 2) {
        lastName = nameParts[nameParts.length - 1];
        firstName = nameParts.slice(0, nameParts.length - 1).join(' ');
      } else {
        firstName = fullName;
      }

      // Create new user
      user = new User({
        email,
        firebaseUid: uid,
        displayName: fullName,
        firstName,
        lastName,
        photoURL,
        role: 'staff', // Default role for SMU users
        status: 'active', // Default status
      });

      await user.save();

      logger.info('[Auth] New user created', {
        userId: user._id,
        email: user.email,
      });
    } else {
      // Update user info if needed
      user.firebaseUid = uid;
      if (displayName) user.displayName = displayName;
      if (photoURL) user.photoURL = photoURL;
      await user.save();
    }

    // Check user status
    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended',
        errorCode: 'AUTH_ACCOUNT_SUSPENDED',
      });
    }

    logger.info('[Auth] User authenticated successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    logger.error('[Auth] Login failed', {
      error: error.message,
      email: req.body.email,
    });

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side cleanup)
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Private (optional)
 */
router.get('/status', optionalAuth, async (req, res) => {
  if (req.user) {
    res.json({
      authenticated: true,
      user: {
        _id: req.user._id,
        email: req.user.email,
        displayName: req.user.displayName,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        status: req.user.status,
        photoURL: req.user.photoURL,
      },
    });
  } else {
    res.json({
      authenticated: false,
      user: null,
    });
  }
});

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateUser, async (req, res) => {
  res.json({
    success: true,
    user: {
      _id: req.user._id,
      email: req.user.email,
      displayName: req.user.displayName,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      status: req.user.status,
      photoURL: req.user.photoURL,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
});

module.exports = router;

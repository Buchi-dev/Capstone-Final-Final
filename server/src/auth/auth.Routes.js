const express = require('express');
const passport = require('passport');

const router = express.Router();

/**
 * @route   GET /auth/google
 * @desc    Initiate Google OAuth authentication
 * @access  Public
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * @route   GET /auth/google/callback
 * @desc    Google OAuth callback route
 * @access  Public
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Successful authentication, redirect based on user status
    const user = req.user;
    
    if (user.status === 'pending') {
      // Check if profile is complete
      if (!user.department || !user.phoneNumber) {
        // New user needs to complete profile
        return res.redirect(`${process.env.CLIENT_URL}/auth/account-completion`);
      } else {
        // Profile complete, show pending approval
        return res.redirect(`${process.env.CLIENT_URL}/auth/pending-approval`);
      }
    } else if (user.status === 'suspended') {
      return res.redirect(`${process.env.CLIENT_URL}/auth/account-suspended`);
    } else if (user.status === 'active') {
      // Active user - redirect to appropriate dashboard
      if (user.role === 'admin') {
        return res.redirect(`${process.env.CLIENT_URL}/admin/dashboard`);
      } else if (user.role === 'staff') {
        return res.redirect(`${process.env.CLIENT_URL}/staff/dashboard`);
      } else {
        return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
      }
    }
    
    // Default fallback
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

/**
 * @route   GET /auth/logout
 * @desc    Logout user and destroy session
 * @access  Private
 */
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Session destruction failed' });
      }
      res.clearCookie('connect.sid');
      res.redirect(process.env.CLIENT_URL);
    });
  });
});

/**
 * @route   GET /auth/current-user
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/current-user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: req.user.toPublicProfile(),
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
  }
});

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.isAuthenticated() ? req.user.toPublicProfile() : null,
  });
});

module.exports = router;

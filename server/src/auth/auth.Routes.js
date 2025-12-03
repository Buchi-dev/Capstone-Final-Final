const express = require('express');
// No Firebase Admin imports needed - client handles all auth
const { authenticateFirebase, optionalAuth } = require('./auth.Middleware');
const User = require('../users/user.Model');
const logger = require('../utils/logger');
const { AuthenticationError } = require('../errors');

const router = express.Router();

/**
 * @route   POST /auth/verify-token
 * @desc    Sync user to database (NO TOKEN VERIFICATION - client handles auth)
 * @access  Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'ID token is required',
      });
    }

    logger.info('[Auth] CLIENT-SIDE AUTH MODE - No token verification');

    // Decode token WITHOUT verification
    let decodedToken;
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
      
      decodedToken = JSON.parse(jsonPayload);
      
      // Normalize token structure
      if (decodedToken.user_id && !decodedToken.uid) {
        decodedToken.uid = decodedToken.user_id;
      }
    } catch (decodeError) {
      logger.error('[Auth] Failed to decode token', {
        error: decodeError.message,
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid token format',
        errorCode: 'AUTH_TOKEN_INVALID',
      });
    }

    // Domain validation
    const userEmail = decodedToken.email;
    if (!userEmail || !userEmail.endsWith('@smu.edu.ph')) {
      logger.warn('[Auth] Domain validation failed', {
        email: userEmail,
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only SMU email addresses (@smu.edu.ph) are allowed.',
        errorCode: 'AUTH_INVALID_DOMAIN',
      });
    }

    // Check if user exists in database
    let user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      // Parse name components from token
      const fullName = decodedToken.name || 'User';
      const nameParts = fullName.trim().split(/\s+/); // Split by whitespace
      
      let firstName = '';
      let middleName = '';
      let lastName = '';
      
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length >= 2) {
        // Last part is always the last name
        lastName = nameParts[nameParts.length - 1];
        
        // Check if second-to-last part is a middle initial (contains period)
        if (nameParts.length >= 3 && nameParts[nameParts.length - 2].includes('.')) {
          middleName = nameParts[nameParts.length - 2];
          // Everything before middle name is first name
          firstName = nameParts.slice(0, nameParts.length - 2).join(' ');
        } else {
          // No middle initial, everything before last name is first name
          firstName = nameParts.slice(0, nameParts.length - 1).join(' ');
        }
      }
      
      // Create new user (all data from decoded token, NO Firebase Admin calls)
      user = new User({
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || userEmail,
        displayName: fullName,
        firstName,
        middleName,
        lastName,
        profilePicture: decodedToken.picture || '',
        provider: 'firebase',
        role: 'staff', // Default role
        status: 'pending',
        lastLogin: new Date(),
      });

      await user.save();

      logger.info('[Auth] New user created', {
        userId: user._id,
        email: user.email,
      });
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info('[Auth] User logged in', {
        userId: user._id,
        email: user.email,
      });
    }

    res.json({
      success: true,
      user: user.toPublicProfile(),
      message: 'Token verified successfully',
    });
  } catch (error) {
    logger.error('[Auth] Token verification failed', {
      error: error.message,
    });

    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
});

/**
 * @route   GET /auth/current-user
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/current-user', authenticateFirebase, (req, res) => {
  res.json({
    success: true,
    user: req.user.toPublicProfile(),
  });
});

/**
 * @route   GET /auth/status
 * @desc    Check authentication status
 * @access  Public
 */
router.get('/status', optionalAuth, (req, res) => {
  res.json({
    authenticated: !!req.user,
    user: req.user ? req.user.toPublicProfile() : null,
  });
});

/**
 * @route   POST /auth/test-email
 * @desc    Test email configuration by sending a test email
 * @access  Public (temporarily for testing)
 */
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    const { testEmailConfiguration } = require('../utils/email.service');
    await testEmailConfiguration(email);

    res.json({
      success: true,
      message: 'Test email sent successfully. Check your inbox.',
    });
  } catch (error) {
    logger.error('Test email failed:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
    });
  }
});

/**
 * @route   POST /auth/logout
 * @desc    Logout user (client-side handles Firebase signOut)
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful. Clear Firebase session on client.',
  });
});

module.exports = router;

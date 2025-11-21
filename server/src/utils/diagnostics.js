/**
 * Diagnostic utilities for troubleshooting authentication issues
 */

const User = require('../users/user.Model');
const { verifyIdToken } = require('../configs/firebase.Config');
const logger = require('./logger');

/**
 * Diagnose authentication issues
 * This helps identify why a token might be rejected
 */
const diagnoseAuth = async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    headers: {},
    firebaseToken: null,
    user: null,
    errors: [],
  };

  try {
    // 1. Check Authorization Header
    const authHeader = req.headers.authorization;
    diagnostics.headers.authorization = authHeader ? 'Present' : 'Missing';
    diagnostics.headers.contentType = req.headers['content-type'];
    diagnostics.headers.origin = req.headers.origin;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      diagnostics.errors.push('Authorization header missing or malformed');
      return res.json({ success: false, diagnostics });
    }

    const idToken = authHeader.split('Bearer ')[1];
    diagnostics.headers.tokenLength = idToken ? idToken.length : 0;

    // 2. Verify Firebase Token
    try {
      const decodedToken = await verifyIdToken(idToken);
      diagnostics.firebaseToken = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
        exp: new Date(decodedToken.exp * 1000).toISOString(),
        iat: new Date(decodedToken.iat * 1000).toISOString(),
        isExpired: decodedToken.exp * 1000 < Date.now(),
      };
    } catch (tokenError) {
      diagnostics.errors.push({
        step: 'Firebase token verification',
        error: tokenError.message,
        code: tokenError.code,
      });
      return res.json({ success: false, diagnostics });
    }

    // 3. Check user in database
    try {
      const user = await User.findOne({ firebaseUid: diagnostics.firebaseToken.uid });
      
      if (!user) {
        diagnostics.errors.push({
          step: 'Database lookup',
          error: 'User not found in database',
          firebaseUid: diagnostics.firebaseToken.uid,
        });
      } else {
        diagnostics.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          status: user.status,
          department: user.department,
          hasCompletedProfile: !!(user.department && user.phoneNumber),
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        };

        // Check status issues
        if (user.status === 'pending') {
          diagnostics.errors.push({
            step: 'User status check',
            error: 'Account is pending approval',
          });
        }
        if (user.status === 'suspended') {
          diagnostics.errors.push({
            step: 'User status check',
            error: 'Account is suspended',
          });
        }
      }
    } catch (dbError) {
      diagnostics.errors.push({
        step: 'Database query',
        error: dbError.message,
      });
    }

    // 4. Summary
    diagnostics.summary = {
      canAuthenticate: diagnostics.errors.length === 0,
      issues: diagnostics.errors.length,
    };

    res.json({
      success: diagnostics.errors.length === 0,
      diagnostics,
    });
  } catch (error) {
    logger.error('[Diagnostics] Error running diagnostics', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      diagnostics,
      error: error.message,
    });
  }
};

module.exports = {
  diagnoseAuth,
};

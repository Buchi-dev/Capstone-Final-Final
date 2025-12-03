const admin = require('firebase-admin');
const logger = require('../utils/logger');

/**
 * Configure Firebase Admin SDK (DISABLED - not needed for client-side auth)
 * Client handles ALL authentication via Firebase
 * Backend just decodes tokens without verification
 */
const configureFirebase = () => {
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('🔓 FIREBASE ADMIN DISABLED');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.info('Client-side authentication only');
  logger.info('Backend does NOT verify JWT tokens');
  logger.info('All authentication handled by Firebase client SDK');
  logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // DO NOT initialize Firebase Admin SDK
  // This prevents all the "Invalid JWT Signature" errors
  return;
};

/**
 * DISABLED: Verify ID token
 * Not used in client-side auth mode - throws error if called
 */
const verifyIdToken = async (idToken) => {
  throw new Error('Firebase Admin is disabled - client handles all authentication');
};

/**
 * DISABLED: Get user by UID from Firebase
 * Not used in client-side auth mode - throws error if called
 */
const getFirebaseUser = async (uid) => {
  throw new Error('Firebase Admin is disabled - client handles all authentication');
};

/**
 * DISABLED: Create custom token
 * Not used in client-side auth mode - throws error if called
 */
const createCustomToken = async (uid, claims = {}) => {
  throw new Error('Firebase Admin is disabled - client handles all authentication');
};

module.exports = {
  configureFirebase,
  verifyIdToken,
  getFirebaseUser,
  createCustomToken,
  admin,
};

/**
 * SSE (Server-Sent Events) Routes
 * 
 * Handles real-time event streaming to clients
 * Replaces Socket.IO for better Render.com compatibility
 * 
 * @module utils/sseRoutes
 */

const express = require('express');
const cors = require('cors');
const router = express.Router();
const {
  sseMiddleware,
  setupSSEConnection,
  subscribeToChannel,
  unsubscribeFromChannel,
  getSSEStats,
} = require('./sseConfig');
const { deviceSSEConnection } = require('../devices/device.Controller');
const { ensureApiKey } = require('../middleware/apiKey.middleware');
const logger = require('./logger');

// SSE-specific CORS configuration (no credentials required for anonymous connections)
const sseCors = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://smupuretrack.web.app',
      'https://smupuretrack.firebaseapp.com',
      'http://localhost:5173',
      process.env.CLIENT_URL || 'http://localhost:5173'
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false, // SSE connections are anonymous, no credentials needed
});

/**
 * GET /sse/stream
 * Main SSE endpoint - establishes real-time connection
 * 
 * No authentication required - client handles authentication
 */
router.get('/stream', sseCors, sseMiddleware, (req, res) => {
  setupSSEConnection(req, res);
});

/**
 * GET /sse/:deviceId
 * Device SSE endpoint for receiving commands
 * Requires API key authentication
 */
router.get('/:deviceId', ensureApiKey, deviceSSEConnection);

/**
 * POST /sse/subscribe
 * Subscribe to a specific channel
 * 
 * Body:
 *   - connectionId: Connection ID from SSE stream
 *   - channel: Channel name (alerts, devices, admin, device:DEVICE_ID)
 */
router.post('/subscribe', sseCors, sseMiddleware, (req, res) => {
  const { connectionId, channel } = req.body;
  
  if (!connectionId || !channel) {
    return res.status(400).json({
      success: false,
      error: 'connectionId and channel are required',
    });
  }
  
  const success = subscribeToChannel(connectionId, channel);
  
  if (success) {
    logger.info('[SSE] Subscription added', {
      connectionId,
      channel,
      userId: req.userId,
    });
    
    return res.json({
      success: true,
      message: `Subscribed to ${channel}`,
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
    });
  }
});

/**
 * POST /sse/unsubscribe
 * Unsubscribe from a specific channel
 * 
 * Body:
 *   - connectionId: Connection ID from SSE stream
 *   - channel: Channel name
 */
router.post('/unsubscribe', sseCors, sseMiddleware, (req, res) => {
  const { connectionId, channel } = req.body;
  
  if (!connectionId || !channel) {
    return res.status(400).json({
      success: false,
      error: 'connectionId and channel are required',
    });
  }
  
  const success = unsubscribeFromChannel(connectionId, channel);
  
  if (success) {
    logger.info('[SSE] Subscription removed', {
      connectionId,
      channel,
      userId: req.userId,
    });
    
    return res.json({
      success: true,
      message: `Unsubscribed from ${channel}`,
    });
  } else {
    return res.status(404).json({
      success: false,
      error: 'Connection not found',
    });
  }
});

/**
 * GET /sse/stats
 * Get SSE connection statistics
 * (Admin only in production)
 */
router.get('/stats', sseCors, sseMiddleware, (req, res) => {
  // In production, restrict to admin users
  if (process.env.NODE_ENV === 'production' && req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  
  const stats = getSSEStats();
  
  res.json({
    success: true,
    stats,
  });
});

module.exports = router;

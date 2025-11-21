const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * Increased from 100 to 300 requests per 15 minutes
 * Temporary measure while transitioning to WebSocket architecture
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Changed from 100
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('[Rate Limit] API rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      correlationId: req.correlationId,
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Sensor data rate limiter
 * More permissive for IoT devices
 * 1000 requests per 15 minutes per IP (devices send data frequently)
 */
const sensorDataLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Sensor data rate limit exceeded.',
  },
});

/**
 * Report generation rate limiter
 * Expensive operations need strict limits
 * 10 reports per hour per user
 */
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Report generation limit exceeded. Please try again later.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensorDataLimiter,
  reportLimiter,
};

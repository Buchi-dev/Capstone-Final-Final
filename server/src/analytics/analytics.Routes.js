const express = require('express');
const {
  getTrends,
  getSummary,
  getParameterAnalytics,
} = require('./analytics.Controller');
const { ensureAuthenticated } = require('../auth/auth.Middleware');

const router = express.Router();

/**
 * @route   GET /api/analytics/summary
 * @desc    Get dashboard summary statistics
 * @access  Public
 */
router.get('/summary', getSummary);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get water quality trends over time
 * @access  Public
 */
router.get('/trends', getTrends);

/**
 * @route   GET /api/analytics/parameters
 * @desc    Get parameter-specific analytics
 * @access  Public
 */
router.get('/parameters', getParameterAnalytics);

module.exports = router;

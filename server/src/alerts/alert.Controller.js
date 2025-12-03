const Alert = require('./alert.Model');
const logger = require('../utils/logger');
const { NotFoundError, ConflictError, ValidationError } = require('../errors');
const ResponseHelper = require('../utils/responses');
const asyncHandler = require('../middleware/asyncHandler');
const { findByIdOrFail, updateByIdOrFail } = require('../utils/dbOperations');
const { buildAndExecuteQuery } = require('../utils/queryBuilder');
const { validateObjectId, validateAlertStatus } = require('../utils/validationService');

/**
 * Get all alerts with filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllAlerts = asyncHandler(async (req, res) => {
  const result = await buildAndExecuteQuery(Alert, req.query, {
    allowedFilters: ['deviceId', 'severity', 'status'],
    defaultSort: '-timestamp',
    defaultLimit: 50,
    dateField: 'timestamp',
    populate: [
      { path: 'acknowledgedBy', select: 'displayName email' },
      { path: 'resolvedBy', select: 'displayName email' },
    ],
    lean: false, // Need methods for toPublicProfile()
  });

  const alertsData = result.data.map(alert => alert.toPublicProfile());
  ResponseHelper.paginated(res, alertsData, result.pagination);
});

/**
 * Get alert by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertById = asyncHandler(async (req, res) => {
  validateObjectId(req.params.id, 'Alert ID');

  const alert = await findByIdOrFail(Alert, req.params.id, {
    populate: [
      { path: 'acknowledgedBy', select: 'displayName email' },
      { path: 'resolvedBy', select: 'displayName email' },
    ],
  });

  ResponseHelper.success(res, alert.toPublicProfile());
});

/**
 * Acknowledge alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  // Check if already acknowledged or resolved
  if (alert.status === 'Acknowledged') {
    throw ConflictError.alertAlreadyAcknowledged();
  }

  if (alert.status === 'Resolved') {
    throw ConflictError.alertAlreadyResolved();
  }

  // Update alert
  alert.status = 'Acknowledged';
  alert.acknowledged = true;  // ✅ Set boolean flag for deduplication
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = req.user._id;
  await alert.save();

  // Populate user data
  await alert.populate('acknowledgedBy', 'displayName email');

  ResponseHelper.success(res, alert.toPublicProfile(), 'Alert acknowledged successfully');
});

/**
 * Resolve alert
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const resolveAlert = asyncHandler(async (req, res) => {
  const { resolutionNotes } = req.body;

  const alert = await Alert.findById(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  // Check if already resolved
  if (alert.status === 'Resolved') {
    throw ConflictError.alertAlreadyResolved();
  }

  // Update alert
  alert.status = 'Resolved';
  alert.acknowledged = true;  // ✅ Set boolean flag for deduplication
  alert.resolvedAt = new Date();
  alert.resolvedBy = req.user._id;
  if (resolutionNotes) {
    alert.resolutionNotes = resolutionNotes;
  }
  await alert.save();

  // Populate user data
  await alert.populate('acknowledgedBy', 'displayName email');
  await alert.populate('resolvedBy', 'displayName email');

  ResponseHelper.success(res, alert.toPublicProfile(), 'Alert resolved successfully');
});

/**
 * Create alert (called by sensor data processor)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createAlert = asyncHandler(async (req, res) => {
  const {
    alertId,
    deviceId,
    deviceName,
    severity,
    parameter,
    value,
    threshold,
    message,
    timestamp,
  } = req.body;

  // Validate required fields
  if (!alertId || !deviceId || !deviceName || !severity || !parameter || value === undefined || !threshold || !message || !timestamp) {
    throw new ValidationError('Missing required fields for alert creation');
  }

  // Check if alert already exists
  const existingAlert = await Alert.findOne({ alertId });
  if (existingAlert) {
    throw ConflictError.alertAlreadyExists(alertId);
  }

  // Create new alert
  const alert = new Alert({
    alertId,
    deviceId,
    deviceName,
    severity,
    parameter,
    value,
    threshold,
    message,
    timestamp: new Date(timestamp),
  });

  await alert.save();


  ResponseHelper.created(res, alert.toPublicProfile(), 'Alert created successfully');
});

/**
 * Delete alert (Admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteAlert = asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndDelete(req.params.id);

  if (!alert) {
    throw new NotFoundError('Alert', req.params.id);
  }

  ResponseHelper.success(res, null, 'Alert deleted successfully');
});

/**
 * Get alert statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAlertStats = asyncHandler(async (req, res) => {
  const stats = await Alert.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const severityStats = await Alert.aggregate([
    {
      $group: {
        _id: '$severity',
        count: { $sum: 1 },
      },
    },
  ]);

  ResponseHelper.success(res, {
    byStatus: stats,
    bySeverity: severityStats,
  });
});

module.exports = {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  createAlert,
  deleteAlert,
  getAlertStats,
};

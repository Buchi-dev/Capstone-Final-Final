/**
 * Alert Service
 * 
 * Centralized alert creation and management logic:
 * - Threshold checking
 * - Alert creation with cooldown
 * - Alert updates
 * - Alert statistics
 * 
 * Untangles alert logic from device controller
 * 
 * @module utils/alertService
 */

const Alert = require('../alerts/alert.Model');
const { SENSOR_THRESHOLDS } = require('./constants');
const { checkAlertCooldown, updateAlertOccurrence } = require('../middleware/alertCooldown');
const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Check all thresholds for a sensor reading
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Promise<Array>} Array of created/updated alerts
 */
async function checkThresholdsAndCreateAlerts(device, reading) {
  const alerts = [];

  try {
    // Check pH thresholds
    if (reading.pH !== undefined && reading.pH !== null) {
      const pHAlert = await checkpHThreshold(device, reading);
      if (pHAlert) alerts.push(pHAlert);
    }

    // Check turbidity thresholds
    if (reading.turbidity !== undefined && reading.turbidity !== null) {
      const turbidityAlert = await checkTurbidityThreshold(device, reading);
      if (turbidityAlert) alerts.push(turbidityAlert);
    }

    // Check TDS thresholds
    if (reading.tds !== undefined && reading.tds !== null) {
      const tdsAlert = await checkTDSThreshold(device, reading);
      if (tdsAlert) alerts.push(tdsAlert);
    }

    return alerts;
  } catch (error) {
    logger.error('[Alert Service] Error checking thresholds:', {
      deviceId: device.deviceId,
      error: error.message,
    });
    return alerts; // Return partial results
  }
}

/**
 * Check pH threshold
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Promise<Object|null>} Alert if created/updated
 */
async function checkpHThreshold(device, reading) {
  const { pH, critical, min, max } = SENSOR_THRESHOLDS.pH;
  const value = reading.pH;

  // Check critical range
  if (value < critical.min || value > critical.max) {
    return createOrUpdateAlert(
      device,
      'pH',
      value,
      critical,
      'Critical',
      reading.timestamp
    );
  }

  // Check warning range
  if (value < min || value > max) {
    return createOrUpdateAlert(
      device,
      'pH',
      value,
      { min, max },
      'Warning',
      reading.timestamp
    );
  }

  return null;
}

/**
 * Check turbidity threshold
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Promise<Object|null>} Alert if created/updated
 */
async function checkTurbidityThreshold(device, reading) {
  const { critical, warning } = SENSOR_THRESHOLDS.turbidity;
  const value = reading.turbidity;

  // Check critical level
  if (value > critical) {
    return createOrUpdateAlert(
      device,
      'Turbidity',
      value,
      { max: critical },
      'Critical',
      reading.timestamp
    );
  }

  // Check warning level
  if (value > warning) {
    return createOrUpdateAlert(
      device,
      'Turbidity',
      value,
      { max: warning },
      'Warning',
      reading.timestamp
    );
  }

  return null;
}

/**
 * Check TDS threshold
 * @param {Object} device - Device document
 * @param {Object} reading - Sensor reading document
 * @returns {Promise<Object|null>} Alert if created/updated
 */
async function checkTDSThreshold(device, reading) {
  const { critical, warning } = SENSOR_THRESHOLDS.tds;
  const value = reading.tds;

  // Check critical level
  if (value > critical) {
    return createOrUpdateAlert(
      device,
      'TDS',
      value,
      { max: critical },
      'Critical',
      reading.timestamp
    );
  }

  // Check warning level
  if (value > warning) {
    return createOrUpdateAlert(
      device,
      'TDS',
      value,
      { max: warning },
      'Warning',
      reading.timestamp
    );
  }

  return null;
}

/**
 * Create or update alert with cooldown logic
 * @param {Object} device - Device document
 * @param {string} parameter - Parameter name (pH, Turbidity, TDS)
 * @param {number} value - Current value
 * @param {Object} threshold - Threshold object
 * @param {string} severity - Alert severity (Warning, Critical)
 * @param {Date} timestamp - Reading timestamp
 * @returns {Promise<Object|null>} Created/updated alert or null
 */
async function createOrUpdateAlert(device, parameter, value, threshold, severity, timestamp) {
  try {
    const thresholdValue = threshold.max || threshold.min || threshold;

    // Check cooldown
    const cooldownCheck = await checkAlertCooldown(device.deviceId, parameter, severity);

    if (!cooldownCheck.canCreateAlert) {
      // Update existing alert occurrence
      const updatedAlert = await updateAlertOccurrence(
        cooldownCheck.activeAlert,
        value,
        timestamp
      );

      logger.debug('[Alert Service] Updated alert occurrence:', {
        deviceId: device.deviceId,
        parameter,
        alertId: updatedAlert.alertId,
        occurrenceCount: updatedAlert.occurrenceCount,
      });

      return updatedAlert;
    }

    // Create new alert
    const alert = new Alert({
      alertId: uuidv4(),
      deviceId: device.deviceId,
      parameter,
      value,
      threshold: thresholdValue,
      severity,
      message: generateAlertMessage(parameter, value, thresholdValue, severity),
      timestamp: timestamp || new Date(),
      status: 'Active',
      occurrenceCount: 1,
    });

    await alert.save();

    logger.info('[Alert Service] New alert created:', {
      alertId: alert.alertId,
      deviceId: device.deviceId,
      parameter,
      severity,
      value,
    });

    return alert;
  } catch (error) {
    logger.error('[Alert Service] Error creating/updating alert:', {
      deviceId: device.deviceId,
      parameter,
      error: error.message,
    });
    return null;
  }
}

/**
 * Generate alert message
 * @param {string} parameter - Parameter name
 * @param {number} value - Current value
 * @param {number} threshold - Threshold value
 * @param {string} severity - Alert severity
 * @returns {string} Alert message
 */
function generateAlertMessage(parameter, value, threshold, severity) {
  const parameterUnits = {
    'pH': '',
    'Turbidity': ' NTU',
    'TDS': ' ppm',
  };

  const unit = parameterUnits[parameter] || '';
  const comparison = parameter === 'pH' ? 'outside safe range' : `exceeds threshold`;

  return `${severity}: ${parameter} ${comparison}. Current: ${value.toFixed(2)}${unit}, Threshold: ${threshold}${unit}`;
}

/**
 * Get active alerts for device
 * @param {string} deviceId - Device ID
 * @returns {Promise<Array>} Active alerts
 */
async function getActiveAlerts(deviceId) {
  try {
    return await Alert.find({
      deviceId,
      status: 'Active',
    }).sort({ timestamp: -1 });
  } catch (error) {
    logger.error('[Alert Service] Error getting active alerts:', {
      deviceId,
      error: error.message,
    });
    return [];
  }
}

/**
 * Get alert statistics for device
 * @param {string} deviceId - Device ID
 * @param {Object} dateRange - Optional date range
 * @returns {Promise<Object>} Alert statistics
 */
async function getAlertStatistics(deviceId, dateRange = {}) {
  try {
    const filter = { deviceId };

    if (dateRange.startDate || dateRange.endDate) {
      filter.timestamp = {};
      if (dateRange.startDate) filter.timestamp.$gte = new Date(dateRange.startDate);
      if (dateRange.endDate) filter.timestamp.$lte = new Date(dateRange.endDate);
    }

    const [total, active, bySeverity, byParameter] = await Promise.all([
      Alert.countDocuments(filter),
      Alert.countDocuments({ ...filter, status: 'Active' }),
      Alert.aggregate([
        { $match: filter },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: filter },
        { $group: { _id: '$parameter', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      total,
      active,
      bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
      byParameter: Object.fromEntries(byParameter.map(p => [p._id, p.count])),
    };
  } catch (error) {
    logger.error('[Alert Service] Error getting alert statistics:', {
      deviceId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Resolve all active alerts for device
 * @param {string} deviceId - Device ID
 * @param {string} userId - User ID resolving alerts
 * @returns {Promise<number>} Number of resolved alerts
 */
async function resolveAllDeviceAlerts(deviceId, userId) {
  try {
    const result = await Alert.updateMany(
      { deviceId, status: 'Active' },
      {
        status: 'Resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
      }
    );

    logger.info('[Alert Service] Resolved all device alerts:', {
      deviceId,
      count: result.modifiedCount,
    });

    return result.modifiedCount;
  } catch (error) {
    logger.error('[Alert Service] Error resolving device alerts:', {
      deviceId,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  checkThresholdsAndCreateAlerts,
  checkpHThreshold,
  checkTurbidityThreshold,
  checkTDSThreshold,
  createOrUpdateAlert,
  generateAlertMessage,
  getActiveAlerts,
  getAlertStatistics,
  resolveAllDeviceAlerts,
};

/**
 * Validation Service
 * 
 * Centralized validation logic for common patterns:
 * - ID validation
 * - Required fields
 * - Data formats
 * - Business rules
 * 
 * Ensures consistency and reduces duplication
 * 
 * @module utils/validationService
 */

const { ValidationError } = require('../errors');
const mongoose = require('mongoose');

/**
 * Validate MongoDB ObjectId
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If invalid
 */
function validateObjectId(id, fieldName = 'ID') {
  if (!id) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
}

/**
 * Validate required fields
 * @param {Object} data - Data object
 * @param {Array} requiredFields - Array of required field names
 * @throws {ValidationError} If fields missing
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = [];

  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @throws {ValidationError} If invalid
 */
function validateEmail(email) {
  if (!email) {
    throw new ValidationError('Email is required');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @throws {ValidationError} If invalid
 */
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new ValidationError('Both start date and end date are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    throw new ValidationError('Invalid start date format');
  }

  if (isNaN(end.getTime())) {
    throw new ValidationError('Invalid end date format');
  }

  if (start > end) {
    throw new ValidationError('Start date must be before end date');
  }

  // Validate dates are not too far in the future
  const maxFutureDate = new Date();
  maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1);
  
  if (end > maxFutureDate) {
    throw new ValidationError('End date cannot be more than 1 year in the future');
  }
}

/**
 * Validate enum value
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If invalid
 */
function validateEnum(value, allowedValues, fieldName = 'Value') {
  if (!value) {
    throw new ValidationError(`${fieldName} is required`);
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}. Must be one of: ${allowedValues.join(', ')}`
    );
  }
}

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If invalid
 */
function validateRange(value, min, max, fieldName = 'Value') {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldName} is required`);
  }

  const num = Number(value);
  
  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  if (num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`
    );
  }
}

/**
 * Validate device ID format
 * @param {string} deviceId - Device ID to validate
 * @throws {ValidationError} If invalid
 */
function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    throw new ValidationError('Device ID is required and must be a string');
  }

  const trimmed = deviceId.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('Device ID cannot be empty');
  }

  if (trimmed.length > 50) {
    throw new ValidationError('Device ID too long (max 50 characters)');
  }

  // Validate format (alphanumeric, hyphens, underscores)
  const validFormat = /^[a-zA-Z0-9_-]+$/;
  if (!validFormat.test(trimmed)) {
    throw new ValidationError(
      'Device ID can only contain letters, numbers, hyphens, and underscores'
    );
  }

  return trimmed; // Return trimmed version
}

/**
 * Validate sensor reading values
 * @param {Object} reading - Sensor reading data
 * @throws {ValidationError} If invalid
 */
function validateSensorReading(reading) {
  const { pH, turbidity, tds } = reading;

  // At least one sensor value required
  if (pH === undefined && turbidity === undefined && tds === undefined) {
    throw new ValidationError('At least one sensor reading (pH, turbidity, or TDS) is required');
  }

  // Validate pH
  if (pH !== undefined) {
    validateRange(pH, 0, 14, 'pH');
  }

  // Validate turbidity
  if (turbidity !== undefined) {
    validateRange(turbidity, 0, 1000, 'Turbidity');
  }

  // Validate TDS
  if (tds !== undefined) {
    validateRange(tds, 0, 2000, 'TDS');
  }
}

/**
 * Validate timestamp
 * @param {*} timestamp - Timestamp to validate
 * @returns {Date} Valid Date object
 * @throws {ValidationError} If invalid
 */
function validateTimestamp(timestamp) {
  if (!timestamp) {
    return new Date(); // Default to current time
  }

  let date;
  
  if (typeof timestamp === 'number') {
    // Unix timestamp - check if seconds or milliseconds
    if (timestamp < 10000000000) {
      date = new Date(timestamp * 1000); // Seconds
    } else {
      date = new Date(timestamp); // Milliseconds
    }
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid timestamp format');
  }

  // Validate timestamp is reasonable (after 2020, not too far in future)
  const year2020 = new Date('2020-01-01').getTime();
  const futureLimit = Date.now() + (24 * 60 * 60 * 1000); // 1 day ahead

  if (date.getTime() < year2020) {
    throw new ValidationError('Timestamp must be after January 1, 2020');
  }

  if (date.getTime() > futureLimit) {
    throw new ValidationError('Timestamp cannot be more than 1 day in the future');
  }

  return date;
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination
 */
function validatePagination(page, limit) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));

  return {
    page: validPage,
    limit: validLimit,
  };
}

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @throws {ValidationError} If invalid
 */
function validateUserRole(role) {
  const validRoles = ['admin', 'staff'];
  validateEnum(role, validRoles, 'Role');
}

/**
 * Validate user status
 * @param {string} status - Status to validate
 * @throws {ValidationError} If invalid
 */
function validateUserStatus(status) {
  const validStatuses = ['active', 'pending', 'suspended'];
  validateEnum(status, validStatuses, 'Status');
}

/**
 * Validate alert severity
 * @param {string} severity - Severity to validate
 * @throws {ValidationError} If invalid
 */
function validateAlertSeverity(severity) {
  const validSeverities = ['Warning', 'Critical'];
  validateEnum(severity, validSeverities, 'Severity');
}

/**
 * Validate alert status
 * @param {string} status - Status to validate
 * @throws {ValidationError} If invalid
 */
function validateAlertStatus(status) {
  const validStatuses = ['Active', 'Acknowledged', 'Resolved'];
  validateEnum(status, validStatuses, 'Status');
}

/**
 * Sanitize and validate update fields
 * @param {Object} updates - Update object
 * @param {Array} allowedFields - Array of allowed field names
 * @returns {Object} Sanitized updates
 * @throws {ValidationError} If no valid fields
 */
function sanitizeUpdateFields(updates, allowedFields) {
  const sanitized = {};

  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      sanitized[field] = updates[field];
    }
  });

  if (Object.keys(sanitized).length === 0) {
    throw new ValidationError(
      `No valid fields to update. Allowed fields: ${allowedFields.join(', ')}`
    );
  }

  return sanitized;
}

/**
 * Validate coordinates
 * @param {Object} location - Location object with lat/lng
 * @throws {ValidationError} If invalid
 */
function validateCoordinates(location) {
  if (!location) {
    throw new ValidationError('Location is required');
  }

  const { latitude, longitude } = location;

  if (latitude === undefined || longitude === undefined) {
    throw new ValidationError('Latitude and longitude are required');
  }

  validateRange(latitude, -90, 90, 'Latitude');
  validateRange(longitude, -180, 180, 'Longitude');
}

module.exports = {
  validateObjectId,
  validateRequiredFields,
  validateEmail,
  validateDateRange,
  validateEnum,
  validateRange,
  validateDeviceId,
  validateSensorReading,
  validateTimestamp,
  validatePagination,
  validateUserRole,
  validateUserStatus,
  validateAlertSeverity,
  validateAlertStatus,
  sanitizeUpdateFields,
  validateCoordinates,
};

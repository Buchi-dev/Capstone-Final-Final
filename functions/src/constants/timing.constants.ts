/**
 * Timing Configuration Constants
 * Centralized timing and timezone configuration for the entire system
 *
 * @module constants/timing.constants
 *
 * Purpose:
 * - Standardize Manila Time (UTC+8) across all components
 * - Provide configurable intervals via Firestore
 * - Ensure synchronized timing between devices, backend, and frontend
 */

/**
 * Manila timezone identifier
 * Used for all scheduled functions and time display
 */
export const MANILA_TIMEZONE = "Asia/Manila";

/**
 * Manila timezone offset in hours
 */
export const MANILA_OFFSET_HOURS = 8;

/**
 * Default system check interval in minutes
 * Used when Firestore config is not available
 */
export const DEFAULT_CHECK_INTERVAL_MINUTES = 5;

/**
 * Minimum allowed check interval in minutes
 * Prevents too-frequent checks that could impact performance
 */
export const MIN_CHECK_INTERVAL_MINUTES = 1;

/**
 * Maximum allowed check interval in minutes
 * Prevents too-infrequent checks that could delay status updates
 */
export const MAX_CHECK_INTERVAL_MINUTES = 60;

/**
 * Offline threshold multiplier
 * Device marked offline after (interval × multiplier) minutes
 * Multiplier of 2 allows for 1 missed heartbeat + network delays
 */
export const OFFLINE_THRESHOLD_MULTIPLIER = 2;

/**
 * Firestore collection and document paths for system configuration
 */
export const SYSTEM_CONFIG_COLLECTION = "systemConfig";
export const SYSTEM_CONFIG_DOC = "timing";

/**
 * System configuration interface
 */
export interface SystemTimingConfig {
  /** Check interval in minutes */
  checkIntervalMinutes: number;

  /** Timezone identifier */
  timezone: string;

  /** Last updated timestamp */
  updatedAt: FirebaseFirestore.Timestamp;

  /** Updated by user ID */
  updatedBy?: string;
}

/**
 * Default system timing configuration
 */
export const DEFAULT_SYSTEM_TIMING_CONFIG: Omit<SystemTimingConfig, "updatedAt"> = {
  checkIntervalMinutes: DEFAULT_CHECK_INTERVAL_MINUTES,
  timezone: MANILA_TIMEZONE,
};

/**
 * Timing-related error messages
 */
export const TIMING_ERRORS = {
  INVALID_INTERVAL: "Check interval must be between 1 and 60 minutes",
  INVALID_TIMEZONE: "Invalid timezone specified",
  CONFIG_NOT_FOUND: "System timing configuration not found",
  CONFIG_UPDATE_FAILED: "Failed to update system timing configuration",
} as const;

/**
 * Timing-related success messages
 */
export const TIMING_MESSAGES = {
  CONFIG_UPDATED: "System timing configuration updated successfully",
  CONFIG_LOADED: "System timing configuration loaded",
  USING_DEFAULT: "Using default timing configuration",
} as const;

/**
 * Convert minutes to milliseconds
 *
 * @param {number} minutes - Number of minutes to convert
 * @return {number} Equivalent milliseconds
 */
export const minutesToMs = (minutes: number): number => minutes * 60 * 1000;

/**
 * Convert milliseconds to minutes
 *
 * @param {number} ms - Number of milliseconds to convert
 * @return {number} Equivalent minutes (floored)
 */
export const msToMinutes = (ms: number): number => Math.floor(ms / 60 / 1000);

/**
 * Calculate offline threshold in milliseconds based on check interval
 *
 * @param {number} checkIntervalMinutes - Check interval in minutes
 * @return {number} Offline threshold in milliseconds
 */
export const calculateOfflineThreshold = (checkIntervalMinutes: number): number => {
  return minutesToMs(checkIntervalMinutes * OFFLINE_THRESHOLD_MULTIPLIER);
};

/**
 * Validate check interval
 *
 * @param {number} minutes - Check interval to validate
 * @return {boolean} True if interval is valid
 */
export const validateCheckInterval = (minutes: number): boolean => {
  return (
    typeof minutes === "number" &&
    minutes >= MIN_CHECK_INTERVAL_MINUTES &&
    minutes <= MAX_CHECK_INTERVAL_MINUTES
  );
};

/**
 * Get cron expression for given interval in minutes
 * Returns standard cron format: "minute hour day month weekday"
 *
 * @param {number} intervalMinutes - Interval in minutes
 * @return {string} Cron expression string
 */
export const getCronExpression = (intervalMinutes: number): string => {
  if (intervalMinutes === 1) {
    return "* * * * *"; // Every minute
  } else if (intervalMinutes < 60) {
    return `*/${intervalMinutes} * * * *`; // Every N minutes
  } else {
    const hours = Math.floor(intervalMinutes / 60);
    return `0 */${hours} * * *`; // Every N hours
  }
};

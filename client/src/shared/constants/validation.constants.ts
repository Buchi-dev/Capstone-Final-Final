/**
 * Validation Constants
 * Validation rules, patterns, and constraints
 */

// Regular Expression Patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s-()]+$/,
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  IP_ADDRESS: /^(\d{1,3}\.){3}\d{1,3}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_WITH_SPACES: /^[a-zA-Z0-9\s]+$/,
  DEVICE_ID: /^[a-zA-Z0-9_-]+$/,
} as const;

// Length Constraints
export const LENGTH_CONSTRAINTS = {
  DEVICE_NAME: {
    MIN: 3,
    MAX: 100,
  },
  DEVICE_ID: {
    MIN: 3,
    MAX: 50,
  },
  NAME: {
    MIN: 2,
    MAX: 50,
  },
  EMAIL: {
    MIN: 5,
    MAX: 100,
  },
  PHONE: {
    MIN: 10,
    MAX: 15,
  },
  PASSWORD: {
    MIN: 8,
    MAX: 100,
  },
  NOTES: {
    MAX: 500,
  },
  DESCRIPTION: {
    MAX: 1000,
  },
} as const;

// Water Quality Thresholds (WHO Standards)
export const WATER_QUALITY_THRESHOLDS = {
  TDS: {
    UNIT: 'ppm',
    WARNING_MIN: 0,
    WARNING_MAX: 500,
    CRITICAL_MIN: 0,
    CRITICAL_MAX: 1000,
    OPTIMAL_MIN: 50,
    OPTIMAL_MAX: 300,
  },
  PH: {
    UNIT: '',
    WARNING_MIN: 6.0,
    WARNING_MAX: 8.5,
    CRITICAL_MIN: 5.5,
    CRITICAL_MAX: 9.0,
    OPTIMAL_MIN: 6.5,
    OPTIMAL_MAX: 8.0,
  },
  TURBIDITY: {
    UNIT: 'NTU',
    WARNING_MIN: 0,
    WARNING_MAX: 5,
    CRITICAL_MIN: 0,
    CRITICAL_MAX: 10,
    OPTIMAL_MIN: 0,
    OPTIMAL_MAX: 1,
  },
} as const;

// Alert Configuration
export const ALERT_CONFIGURATION = {
  TREND_DETECTION: {
    ENABLED: true,
    THRESHOLD_PERCENTAGE: 15, // 15% change triggers trend alert
    TIME_WINDOW_MINUTES: 30,
  },
  MAX_NOTIFICATIONS_PER_HOUR: 10,
  QUIET_HOURS: {
    DEFAULT_START: '22:00',
    DEFAULT_END: '07:00',
  },
} as const;

// Pagination Defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  SHOW_SIZE_CHANGER: true,
  SHOW_QUICK_JUMPER: true,
} as const;

// Date Range Constraints
export const DATE_RANGE_CONSTRAINTS = {
  MAX_RANGE_DAYS: 365, // Maximum 1 year
  MIN_RANGE_DAYS: 1, // Minimum 1 day
  DEFAULT_RANGE_DAYS: 7, // Default 7 days
} as const;

// Device Constraints
export const DEVICE_CONSTRAINTS = {
  MAX_DEVICES_PER_LOCATION: 50,
  MIN_SENSORS_REQUIRED: 1,
  MAX_SENSORS_ALLOWED: 10,
  ALLOWED_SENSOR_TYPES: ['tds', 'ph', 'turbidity', 'temperature', 'flow_rate'],
  ALLOWED_DEVICE_TYPES: ['IoT Sensor', 'Smart Meter', 'Controller', 'Gateway'],
} as const;

// Report Constraints
export const REPORT_CONSTRAINTS = {
  MAX_DEVICES_PER_REPORT: 100,
  MIN_DATA_POINTS_REQUIRED: 1,
  MAX_REPORT_SIZE_MB: 50,
  ALLOWED_FORMATS: ['json', 'pdf', 'excel'],
} as const;

// File Upload Constraints
export const FILE_UPLOAD_CONSTRAINTS = {
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
} as const;

// Session/Token Constraints
export const SESSION_CONSTRAINTS = {
  SESSION_TIMEOUT_MINUTES: 60,
  REFRESH_TOKEN_BEFORE_MINUTES: 5,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
} as const;

// API Rate Limiting
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_CONCURRENT_REQUESTS: 5,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

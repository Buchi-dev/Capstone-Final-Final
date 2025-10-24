/**
 * Messages Constants
 * Centralized user-facing messages, notifications, and alerts
 */

// Success Messages
export const SUCCESS_MESSAGES = {
  // Device operations
  DEVICE_CREATED: 'Device created successfully',
  DEVICE_UPDATED: 'Device updated successfully',
  DEVICE_DELETED: 'Device deleted successfully',
  DEVICE_REGISTERED: 'Device registered successfully',
  
  // Report operations
  REPORT_GENERATED: 'Report generated successfully',
  REPORT_DOWNLOADED: 'Report downloaded successfully',
  
  // Alert operations
  ALERT_ACKNOWLEDGED: 'Alert acknowledged successfully',
  ALERT_RESOLVED: 'Alert resolved successfully',
  ALERT_CREATED: 'Alert created successfully',
  
  // User operations
  USER_UPDATED: 'User profile updated successfully',
  USER_APPROVED: 'User approved successfully',
  USER_SUSPENDED: 'User suspended successfully',
  
  // Settings
  SETTINGS_SAVED: 'Settings saved successfully',
  PREFERENCES_UPDATED: 'Preferences updated successfully',
  
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  ACCOUNT_COMPLETED: 'Account setup completed successfully',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  // Generic errors
  GENERIC_ERROR: 'An error occurred. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  
  // Device errors
  DEVICE_NOT_FOUND: 'Device not found',
  DEVICE_OFFLINE: 'Device is currently offline',
  DEVICE_LOAD_ERROR: 'Failed to load devices',
  DEVICE_CREATE_ERROR: 'Failed to create device',
  DEVICE_UPDATE_ERROR: 'Failed to update device',
  DEVICE_DELETE_ERROR: 'Failed to delete device',
  
  // Report errors
  REPORT_GENERATION_ERROR: 'Failed to generate report',
  REPORT_LOAD_ERROR: 'Failed to load report',
  NO_DATA_AVAILABLE: 'No data available for the selected period',
  
  // Alert errors
  ALERT_LOAD_ERROR: 'Failed to load alerts',
  ALERT_UPDATE_ERROR: 'Failed to update alert',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DATE_RANGE: 'End date must be after start date',
  
  // User errors
  USER_LOAD_ERROR: 'Failed to load user data',
  USER_UPDATE_ERROR: 'Failed to update user',
  
  // Settings errors
  SETTINGS_LOAD_ERROR: 'Failed to load settings',
  SETTINGS_SAVE_ERROR: 'Failed to save settings',
} as const;

// Warning Messages
export const WARNING_MESSAGES = {
  UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
  DELETE_CONFIRMATION: 'Are you sure you want to delete this item?',
  IRREVERSIBLE_ACTION: 'This action cannot be undone.',
  DATA_LOSS_WARNING: 'This will result in data loss. Continue?',
  OFFLINE_MODE: 'You are currently offline. Some features may be unavailable.',
} as const;

// Info Messages
export const INFO_MESSAGES = {
  LOADING: 'Loading...',
  NO_DATA: 'No data available',
  PROCESSING: 'Processing your request...',
  PENDING_APPROVAL: 'Your account is pending approval',
  ACCOUNT_SUSPENDED: 'Your account has been suspended',
  EMPTY_STATE: 'Nothing to display yet',
  SELECT_DEVICE: 'Please select a device to view details',
  SELECT_DATE_RANGE: 'Please select a date range',
} as const;

// Form Labels
export const FORM_LABELS = {
  DEVICE_ID: 'Device ID',
  DEVICE_NAME: 'Device Name',
  DEVICE_TYPE: 'Device Type',
  MAC_ADDRESS: 'MAC Address',
  IP_ADDRESS: 'IP Address',
  FIRMWARE_VERSION: 'Firmware Version',
  BUILDING: 'Building',
  FLOOR: 'Floor',
  NOTES: 'Notes',
  EMAIL: 'Email',
  PHONE: 'Phone Number',
  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  MIDDLE_NAME: 'Middle Name',
  DEPARTMENT: 'Department',
  ROLE: 'Role',
  STATUS: 'Status',
  START_DATE: 'Start Date',
  END_DATE: 'End Date',
} as const;

// Button Labels
export const BUTTON_LABELS = {
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CREATE: 'Create',
  UPDATE: 'Update',
  CLOSE: 'Close',
  SUBMIT: 'Submit',
  CONFIRM: 'Confirm',
  BACK: 'Back',
  NEXT: 'Next',
  DOWNLOAD: 'Download',
  UPLOAD: 'Upload',
  REFRESH: 'Refresh',
  FILTER: 'Filter',
  CLEAR: 'Clear',
  SEARCH: 'Search',
  GENERATE: 'Generate',
  VIEW: 'View',
  ACKNOWLEDGE: 'Acknowledge',
  RESOLVE: 'Resolve',
  APPROVE: 'Approve',
  REJECT: 'Reject',
  SUSPEND: 'Suspend',
  ACTIVATE: 'Activate',
} as const;

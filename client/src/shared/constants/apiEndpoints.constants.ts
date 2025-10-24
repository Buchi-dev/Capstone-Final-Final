/**
 * API Endpoints Constants
 * Centralized API endpoint configuration
 */

// Base URLs
export const API_BASE_URLS = {
  DEVICE_MANAGEMENT: 'https://us-central1-my-app-da530.cloudfunctions.net/deviceManagement',
  REPORT_GENERATION: 'https://us-central1-my-app-da530.cloudfunctions.net/generateReport',
} as const;

// Device Management Endpoints
export const DEVICE_ENDPOINTS = {
  GET_ALL: '/',
  GET_BY_ID: (deviceId: string) => `/${deviceId}`,
  CREATE: '/',
  UPDATE: (deviceId: string) => `/${deviceId}`,
  DELETE: (deviceId: string) => `/${deviceId}`,
  GET_SENSOR_DATA: (deviceId: string) => `/${deviceId}/sensor-data`,
  GET_SENSOR_HISTORY: (deviceId: string) => `/${deviceId}/history`,
} as const;

// Report Generation Endpoints
export const REPORT_ENDPOINTS = {
  GENERATE: '/',
  GET_BY_ID: (reportId: string) => `/${reportId}`,
} as const;

// HTTP Timeout Values (in milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 10000,
  REPORT_GENERATION: 60000,
  UPLOAD: 30000,
  DOWNLOAD: 30000,
} as const;

// API Request Headers
export const API_HEADERS = {
  JSON: {
    'Content-Type': 'application/json',
  },
  MULTIPART: {
    'Content-Type': 'multipart/form-data',
  },
} as const;

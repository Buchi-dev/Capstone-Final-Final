// API service for Firebase Functions using Axios
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { 
  safeParseApiResponse, 
  type ApiResponse, 
  type Device, 
  type SensorReading 
} from '../schemas';


// API URLs
const DEVICE_API_URL = 'https://us-central1-my-app-da530.cloudfunctions.net/deviceManagement';
const REPORT_API_URL = 'https://us-central1-my-app-da530.cloudfunctions.net/generateReport';


// Create Axios instance for device management
const deviceAxios: AxiosInstance = axios.create({
  baseURL: DEVICE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});


// Create Axios instance for report generation (longer timeout)
const reportAxios: AxiosInstance = axios.create({
  baseURL: REPORT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for reports
});


// Add response interceptor for error handling - Device API
deviceAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Device API Error:', error.response?.data || error.message);
    throw error;
  }
);


// Add response interceptor for error handling - Report API
reportAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Report API Error:', error.response?.data || error.message);
    throw error;
  }
);


// ===========================
// TYPE DEFINITIONS FOR REPORTS
// ===========================

export type ReportType = 'water_quality' | 'device_status' | 'data_summary' | 'compliance';
export type ReportFormat = 'json' | 'pdf' | 'excel';

export interface ReportRequest {
  reportType: ReportType;
  deviceId?: string;
  startDate?: number;
  endDate?: number;
  format?: ReportFormat;
  includeCharts?: boolean;
}

export interface WaterQualityMetrics {
  avgTurbidity: number;
  maxTurbidity: number;
  minTurbidity: number;
  avgTDS: number;
  maxTDS: number;
  minTDS: number;
  avgPH: number;
  maxPH: number;
  minPH: number;
  totalReadings: number;
  timeRange: { start: number; end: number };
}

export interface DeviceReport {
  deviceId: string;
  deviceName: string;
  location?: string;
  metrics: WaterQualityMetrics;
  readings: SensorReading[];
  trends: {
    turbidity: string;
    tds: string;
    ph: string;
  };
  alerts: Array<{
    severity: string;
    parameter: string;
    message: string;
    value: string;
  }>;
}

export interface WaterQualityReport {
  title: string;
  period: { start: number; end: number };
  devices: DeviceReport[];
}

export interface DeviceStatusSummary {
  totalDevices: number;
  statusBreakdown: {
    online: number;
    offline: number;
    error: number;
    maintenance: number;
  };
  healthScore: string;
}

export interface DeviceStatusInfo {
  deviceId: string;
  name: string;
  type: string;
  status: string;
  lastSeen: number;
  firmwareVersion: string;
  sensors: string[];
  location?: string;
  connectivity: string;
  uptime: string;
}

export interface DeviceStatusReport {
  title: string;
  generatedAt: number;
  summary: DeviceStatusSummary;
  devices: DeviceStatusInfo[];
  recommendations: string[];
}

export interface StatisticalData {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface DataSummaryReport {
  title: string;
  period: { start: number; end: number };
  summary: {
    totalReadings: number;
    totalDevices: number;
    dataCompleteness: string;
  };
  statistics: {
    turbidity: StatisticalData;
    tds: StatisticalData;
    ph: StatisticalData;
  };
  dataQuality: Record<string, string>;
}

export interface ComplianceStatus {
  parameter: string;
  value: number;
  standard: number;
  unit: string;
  status: 'compliant' | 'warning' | 'violation';
  percentage: number;
}

export interface DeviceComplianceInfo {
  deviceId: string;
  deviceName: string;
  location?: string;
  totalReadings: number;
  complianceStatus: ComplianceStatus[];
  overallCompliance: boolean;
  violations: {
    turbidity: number;
    tds: number;
    ph: number;
  };
  recommendations: string[];
}

export interface ComplianceReport {
  title: string;
  period: { start: number; end: number };
  standards: {
    turbidity: string;
    tds: string;
    ph: string;
    reference: string;
  };
  devices: DeviceComplianceInfo[];
  summary: {
    totalDevices: number;
    compliantDevices: number;
    complianceRate: string;
  };
}

export interface ReportResponse<T = any> {
  success: boolean;
  reportType: ReportType;
  generatedAt: number;
  data: T;
  message?: string;
  error?: string;
}


// ===========================
// DEVICE MANAGEMENT API
// ===========================

export const deviceApi = {
  // List all devices
  listDevices: async (): Promise<Device[]> => {
    const { data } = await deviceAxios.post('', {
      action: 'LIST_DEVICES',
    });
    
    // Validate response with Zod
    const validationResult = safeParseApiResponse(data);
    if (!validationResult.success) {
      console.error('Invalid API response:', validationResult.error);
      throw new Error('Invalid response from server');
    }
    
    return validationResult.data.devices || [];
  },

  // Get specific device
  getDevice: async (deviceId: string): Promise<Device | null> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'GET_DEVICE',
      deviceId,
    });
    return data.device || null;
  },

  // Get latest sensor readings
  getSensorReadings: async (deviceId: string): Promise<SensorReading | null> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'GET_SENSOR_READINGS',
      deviceId,
    });
    return data.sensorData || null;
  },

  // Get sensor history
  getSensorHistory: async (deviceId: string, limit = 50): Promise<SensorReading[]> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'GET_SENSOR_HISTORY',
      deviceId,
      limit,
    });
    return data.history || [];
  },

  // Send command to device
  sendCommand: async (deviceId: string, command: string, params?: Record<string, any>): Promise<boolean> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'SEND_COMMAND',
      deviceId,
      command,
      params,
    });
    return data.success;
  },

  // Discover devices
  discoverDevices: async (): Promise<boolean> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'DISCOVER_DEVICES',
    });
    return data.success;
  },

  // Add new device
  addDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'ADD_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  // Update device
  updateDevice: async (deviceId: string, deviceData: Partial<Device>): Promise<boolean> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'UPDATE_DEVICE',
      deviceId,
      deviceData,
    });
    return data.success;
  },

  // Delete device
  deleteDevice: async (deviceId: string): Promise<boolean> => {
    const { data } = await deviceAxios.post<ApiResponse>('', {
      action: 'DELETE_DEVICE',
      deviceId,
    });
    return data.success;
  },
};


// ===========================
// REPORT GENERATION API
// ===========================

export const reportApi = {
  /**
   * Generate Water Quality Report
   * Comprehensive analysis of water quality parameters
   */
  generateWaterQualityReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number,
    includeCharts: boolean = false
  ): Promise<WaterQualityReport> => {
    try {
      const { data } = await reportAxios.post<ReportResponse<WaterQualityReport>>('', {
        reportType: 'water_quality',
        deviceId,
        startDate,
        endDate,
        format: 'json',
        includeCharts,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate water quality report');
      }

      return data.data;
    } catch (error) {
      console.error('Water Quality Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Device Status Report
   * Overview of all device statuses and operational health
   */
  generateDeviceStatusReport: async (): Promise<DeviceStatusReport> => {
    try {
      const { data } = await reportAxios.post<ReportResponse<DeviceStatusReport>>('', {
        reportType: 'device_status',
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate device status report');
      }

      return data.data;
    } catch (error) {
      console.error('Device Status Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Data Summary Report
   * Statistical summary of sensor data over selected time period
   */
  generateDataSummaryReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number
  ): Promise<DataSummaryReport> => {
    try {
      const { data } = await reportAxios.post<ReportResponse<DataSummaryReport>>('', {
        reportType: 'data_summary',
        deviceId,
        startDate,
        endDate,
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate data summary report');
      }

      return data.data;
    } catch (error) {
      console.error('Data Summary Report Error:', error);
      throw error;
    }
  },

  /**
   * Generate Compliance Report
   * Regulatory compliance assessment and quality standards verification
   */
  generateComplianceReport: async (
    deviceId?: string,
    startDate?: number,
    endDate?: number
  ): Promise<ComplianceReport> => {
    try {
      const { data } = await reportAxios.post<ReportResponse<ComplianceReport>>('', {
        reportType: 'compliance',
        deviceId,
        startDate,
        endDate,
        format: 'json',
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate compliance report');
      }

      return data.data;
    } catch (error) {
      console.error('Compliance Report Error:', error);
      throw error;
    }
  },

  /**
   * Generic report generator - supports all report types
   */
  generateReport: async <T = any>(
    request: ReportRequest
  ): Promise<ReportResponse<T>> => {
    try {
      const { data } = await reportAxios.post<ReportResponse<T>>('', request);

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate report');
      }

      return data;
    } catch (error) {
      console.error('Report Generation Error:', error);
      throw error;
    }
  },

  /**
   * Export report to PDF format
   */
  exportReportToPDF: async (
    reportType: ReportType,
    reportData: any
  ): Promise<Blob> => {
    try {
      // This will be implemented with jsPDF or a backend PDF service
      const { data } = await reportAxios.post('', {
        reportType,
        format: 'pdf',
        data: reportData,
      }, {
        responseType: 'blob',
      });

      return data;
    } catch (error) {
      console.error('PDF Export Error:', error);
      throw error;
    }
  },

  /**
   * Export report to Excel format
   */
  exportReportToExcel: async (
    reportType: ReportType,
    reportData: any
  ): Promise<Blob> => {
    try {
      // This will be implemented with SheetJS or a backend Excel service
      const { data } = await reportAxios.post('', {
        reportType,
        format: 'excel',
        data: reportData,
      }, {
        responseType: 'blob',
      });

      return data;
    } catch (error) {
      console.error('Excel Export Error:', error);
      throw error;
    }
  },

  /**
   * Get report history/metadata
   */
  getReportHistory: async (limit: number = 20): Promise<any[]> => {
    try {
      // This would fetch stored report metadata from Firestore
      const { data } = await reportAxios.post('', {
        action: 'GET_REPORT_HISTORY',
        limit,
      });

      return data.reports || [];
    } catch (error) {
      console.error('Report History Error:', error);
      throw error;
    }
  },

  /**
   * Schedule recurring report generation
   */
  scheduleReport: async (
    reportType: ReportType,
    schedule: 'daily' | 'weekly' | 'monthly',
    recipients: string[]
  ): Promise<boolean> => {
    try {
      const { data } = await reportAxios.post('', {
        action: 'SCHEDULE_REPORT',
        reportType,
        schedule,
        recipients,
      });

      return data.success;
    } catch (error) {
      console.error('Report Scheduling Error:', error);
      throw error;
    }
  },
};


// ===========================
// UNIFIED API EXPORT
// ===========================

export const api = {
  // Device Management
  ...deviceApi,
  
  // Report Generation
  reports: reportApi,
};

// Default export
export default api;

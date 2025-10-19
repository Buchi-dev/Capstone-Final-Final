// Zod schemas for runtime validation
import { z } from 'zod';

// Device Status Schema
export const DeviceStatusSchema = z.enum(['online', 'offline', 'error', 'maintenance']);

// Device Schema
export const DeviceSchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  name: z.string(),
  type: z.string(),
  firmwareVersion: z.string(),
  macAddress: z.string(),
  ipAddress: z.string(),
  sensors: z.array(z.string()),
  status: DeviceStatusSchema,
  registeredAt: z.any(), // Firebase Timestamp
  lastSeen: z.any(), // Firebase Timestamp
  metadata: z.record(z.string(), z.any()).optional(),
});

// Sensor Reading Schema
export const SensorReadingSchema = z.object({
  deviceId: z.string(),
  turbidity: z.number().min(0),
  tds: z.number().min(0),
  ph: z.number().min(0).max(14),
  timestamp: z.number(),
  receivedAt: z.number(),
});

// Report Type Schema
export const ReportTypeSchema = z.enum(['water-quality', 'device-status', 'data-summary', 'compliance', 'custom']);

// Report Configuration Schema
export const ReportConfigSchema = z.object({
  type: ReportTypeSchema,
  title: z.string(),
  deviceIds: z.array(z.string()),
  dateRange: z.any().nullable(), // Can be Dayjs tuple or null
  includeCharts: z.boolean(),
  includeRawData: z.boolean(),
  includeStatistics: z.boolean(),
  notes: z.string(),
  generatedBy: z.string(),
});

// Report History Schema
export const ReportHistorySchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  generatedAt: z.date(),
  devices: z.number(),
  pages: z.number(),
});

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  data: z.any().optional(),
  count: z.number().optional(),
  devices: z.array(DeviceSchema).optional(),
  device: DeviceSchema.optional(),
  sensorData: SensorReadingSchema.optional(),
  history: z.array(SensorReadingSchema).optional(),
});

// Export inferred types from schemas
export type Device = z.infer<typeof DeviceSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type ReportConfig = z.infer<typeof ReportConfigSchema>;
export type ReportHistory = z.infer<typeof ReportHistorySchema>;

// Validation helpers
export const validateDevice = (data: unknown): Device => {
  return DeviceSchema.parse(data);
};

export const validateSensorReading = (data: unknown): SensorReading => {
  return SensorReadingSchema.parse(data);
};

export const validateApiResponse = (data: unknown): ApiResponse => {
  return ApiResponseSchema.parse(data);
};

export const validateReportConfig = (data: unknown): ReportConfig => {
  return ReportConfigSchema.parse(data);
};

export const validateReportHistory = (data: unknown): ReportHistory => {
  return ReportHistorySchema.parse(data);
};

// Safe parsing (returns success/error instead of throwing)
export const safeParseDevice = (data: unknown) => {
  return DeviceSchema.safeParse(data);
};

export const safeParseSensorReading = (data: unknown) => {
  return SensorReadingSchema.safeParse(data);
};

export const safeParseApiResponse = (data: unknown) => {
  return ApiResponseSchema.safeParse(data);
};

export const safeParseReportConfig = (data: unknown) => {
  return ReportConfigSchema.safeParse(data);
};

export const safeParseReportHistory = (data: unknown) => {
  return ReportHistorySchema.safeParse(data);
};

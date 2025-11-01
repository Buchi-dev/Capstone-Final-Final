/**
 * Alert Management Schemas
 * Zod schemas for alert-related data validation
 * 
 * @module schemas/alerts
 */

import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Water Quality Alert Status
 */
export const WaterQualityAlertStatusSchema = z.enum(['Active', 'Acknowledged', 'Resolved']);

/**
 * Water Quality Alert Severity
 */
export const WaterQualityAlertSeveritySchema = z.enum(['Advisory', 'Warning', 'Critical']);

/**
 * Water Quality Parameter
 */
export const WaterQualityParameterSchema = z.enum(['tds', 'ph', 'turbidity']);

/**
 * Trend Direction
 */
export const TrendDirectionSchema = z.enum(['increasing', 'decreasing', 'stable']);

/**
 * Water Quality Alert Type
 */
export const WaterQualityAlertTypeSchema = z.enum(['threshold', 'trend']);

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * Water Quality Alert Document Schema
 * Represents a water quality alert in Firestore
 */
export const WaterQualityAlertSchema = z.object({
  alertId: z.string(),
  deviceId: z.string(),
  deviceName: z.string().optional(),
  deviceBuilding: z.string().optional(),
  deviceFloor: z.string().optional(),
  parameter: WaterQualityParameterSchema,
  alertType: WaterQualityAlertTypeSchema,
  severity: WaterQualityAlertSeveritySchema,
  status: WaterQualityAlertStatusSchema,
  currentValue: z.number(),
  thresholdValue: z.number().optional(),
  trendDirection: TrendDirectionSchema.optional(),
  message: z.string(),
  recommendedAction: z.string(),
  createdAt: z.date(),
  acknowledgedAt: z.date().optional(),
  acknowledgedBy: z.string().optional(),
  resolvedAt: z.date().optional(),
  resolvedBy: z.string().optional(),
  resolutionNotes: z.string().optional(),
  notificationsSent: z.array(z.string()),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Alert Filters Schema
 * Used for filtering alerts in list operations
 */
export const AlertFiltersSchema = z.object({
  severity: z.array(WaterQualityAlertSeveritySchema).optional(),
  status: z.array(WaterQualityAlertStatusSchema).optional(),
  parameter: z.array(WaterQualityParameterSchema).optional(),
  deviceId: z.array(z.string()).optional(),
});

/**
 * Acknowledge Alert Request Schema
 */
export const AcknowledgeAlertRequestSchema = z.object({
  action: z.literal('acknowledgeAlert'),
  alertId: z.string().min(1, 'Alert ID is required'),
});

/**
 * Resolve Alert Request Schema
 */
export const ResolveAlertRequestSchema = z.object({
  action: z.literal('resolveAlert'),
  alertId: z.string().min(1, 'Alert ID is required'),
  notes: z.string().optional(),
});

/**
 * List Alerts Request Schema
 */
export const ListAlertsRequestSchema = z.object({
  action: z.literal('listAlerts'),
  filters: AlertFiltersSchema.optional(),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Alert Operation Response Schema
 */
export const AlertResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  alert: z.object({
    alertId: z.string(),
    status: WaterQualityAlertStatusSchema,
  }).optional(),
  alerts: z.array(WaterQualityAlertSchema).optional(),
  error: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type WaterQualityAlertStatus = z.infer<typeof WaterQualityAlertStatusSchema>;
export type WaterQualityAlertSeverity = z.infer<typeof WaterQualityAlertSeveritySchema>;
export type WaterQualityParameter = z.infer<typeof WaterQualityParameterSchema>;
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;
export type WaterQualityAlertType = z.infer<typeof WaterQualityAlertTypeSchema>;
export type WaterQualityAlert = z.infer<typeof WaterQualityAlertSchema>;
export type AlertFilters = z.infer<typeof AlertFiltersSchema>;
export type AcknowledgeAlertRequest = z.infer<typeof AcknowledgeAlertRequestSchema>;
export type ResolveAlertRequest = z.infer<typeof ResolveAlertRequestSchema>;
export type ListAlertsRequest = z.infer<typeof ListAlertsRequestSchema>;
export type AlertResponse = z.infer<typeof AlertResponseSchema>;

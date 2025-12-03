/**
 * Report Validation Schemas
 * 
 * Zod schemas for validating report requests
 * 
 * @module feature/reports/report.schema
 */

import { z } from 'zod';
import { ReportType, ReportStatus, ReportFormat } from './report.types';

/**
 * Create report schema
 */
export const createReportSchema = z.object({
  body: z.object({
    type: z.nativeEnum(ReportType, { message: 'Invalid report type' }),
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    format: z.nativeEnum(ReportFormat).default(ReportFormat.PDF),
    parameters: z.object({
      deviceIds: z.array(z.string()).optional(),
      startDate: z.union([z.string().datetime(), z.date()]).optional(),
      endDate: z.union([z.string().datetime(), z.date()]).optional(),
      includeCharts: z.boolean().optional(),
      includeStatistics: z.boolean().optional(),
      parameters: z.array(z.string()).optional(),
    }).passthrough(), // Allow additional properties
    expiresAt: z.union([z.string().datetime(), z.date()]).optional(),
  }),
});

/**
 * Report filters schema
 */
export const reportFiltersSchema = z.object({
  query: z.object({
    type: z.nativeEnum(ReportType).optional(),
    status: z.nativeEnum(ReportStatus).optional(),
    format: z.nativeEnum(ReportFormat).optional(),
    generatedBy: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

/**
 * Get report by ID schema
 */
export const getReportByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Report ID is required'),
  }),
});

/**
 * Delete report schema
 */
export const deleteReportSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Report ID is required'),
  }),
});

// Export inferred types
export type CreateReportInput = z.infer<typeof createReportSchema>['body'];
export type ReportFilters = z.infer<typeof reportFiltersSchema>['query'];
export type GetReportByIdParams = z.infer<typeof getReportByIdSchema>['params'];
export type DeleteReportParams = z.infer<typeof deleteReportSchema>['params'];

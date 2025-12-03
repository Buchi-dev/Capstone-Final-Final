/**
 * Report Routes
 * 
 * @module feature/reports/report.routes
 */

import { Router } from 'express';
import {
  createReport,
  getAllReports,
  getMyReports,
  getReportById,
  downloadReport,
  deleteReport,
  getReportStatistics,
  deleteExpiredReports,
} from './report.controller';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  createReportSchema,
  reportFiltersSchema,
  getReportByIdSchema,
  deleteReportSchema,
} from './report.schema';

const router = Router();

/**
 * GET /api/v1/reports
 * Get all reports with filters
 */
router.get('/', validateRequest(reportFiltersSchema), getAllReports);

/**
 * GET /api/v1/reports/my-reports
 * Get current user's reports
 */
router.get('/my-reports', getMyReports);

/**
 * GET /api/v1/reports/statistics
 * Get report statistics
 */
router.get('/statistics', getReportStatistics);

/**
 * POST /api/v1/reports
 * Create report request
 */
router.post('/', validateRequest(createReportSchema), createReport);

/**
 * DELETE /api/v1/reports/expired
 * Delete expired reports (Admin only)
 */
router.delete('/expired', deleteExpiredReports);

/**
 * GET /api/v1/reports/:id
 * Get report by ID
 */
router.get('/:id', validateRequest(getReportByIdSchema), getReportById);

/**
 * GET /api/v1/reports/:id/download
 * Download report file
 */
router.get('/:id/download', validateRequest(getReportByIdSchema), downloadReport);

/**
 * DELETE /api/v1/reports/:id
 * Delete report
 */
router.delete('/:id', validateRequest(deleteReportSchema), deleteReport);

export default router;

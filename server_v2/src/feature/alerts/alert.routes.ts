/**
 * Alert Routes
 * API endpoints for alert management
 */

import { Router } from 'express';
import {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  getAlertStatistics,
  deleteAlert,
  getAlertsByDevice,
  getUnacknowledgedCount,
} from './alert.controller';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  getAlertByIdSchema,
  acknowledgeAlertSchema,
  resolveAlertSchema,
  deleteAlertSchema,
} from './alert.schema';

const router = Router();

/**
 * @route   GET /api/v1/alerts
 * @desc    Get all alerts with filters and pagination
 * @access  Protected (Staff/Admin)
 */
router.get('/', getAllAlerts);

/**
 * @route   GET /api/v1/alerts/statistics
 * @desc    Get alert statistics (must be before /:id to avoid conflict)
 * @access  Protected (Staff/Admin)
 */
router.get('/statistics', getAlertStatistics);

/**
 * @route   GET /api/v1/alerts/unacknowledged/count
 * @desc    Get count of unacknowledged alerts
 * @access  Protected (Staff/Admin)
 */
router.get('/unacknowledged/count', getUnacknowledgedCount);

/**
 * @route   GET /api/v1/alerts/device/:deviceId
 * @desc    Get alerts for specific device
 * @access  Protected (Staff/Admin)
 */
router.get('/device/:deviceId', getAlertsByDevice);

/**
 * @route   GET /api/v1/alerts/:id
 * @desc    Get alert by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', validateRequest(getAlertByIdSchema), getAlertById);

/**
 * @route   PATCH /api/v1/alerts/:id/acknowledge
 * @desc    Acknowledge alert
 * @access  Protected (Staff/Admin)
 */
router.patch('/:id/acknowledge', validateRequest(acknowledgeAlertSchema), acknowledgeAlert);

/**
 * @route   PATCH /api/v1/alerts/:id/resolve
 * @desc    Resolve alert
 * @access  Protected (Staff/Admin)
 */
router.patch('/:id/resolve', validateRequest(resolveAlertSchema), resolveAlert);

/**
 * @route   DELETE /api/v1/alerts/:id
 * @desc    Delete alert
 * @access  Protected (Admin only)
 */
router.delete('/:id', validateRequest(deleteAlertSchema), deleteAlert);

export default router;

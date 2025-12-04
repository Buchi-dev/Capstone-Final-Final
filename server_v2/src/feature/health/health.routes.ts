/**
 * Health Monitoring Routes
 * 
 * Protected routes for system health metrics (Admin/Staff only)
 * 
 * @module feature/health/health.routes
 */

import { Router } from 'express';
import { requireStaff } from '@core/middlewares/auth.middleware';
import {
  getSystemHealth,
  getCpuMetrics,
  getMemoryMetrics,
  getStorageMetrics,
  getDatabaseMetrics,
} from './health.controller';

const router = Router();

/**
 * All health routes require staff authentication
 */

/**
 * @route   GET /api/v1/health/system
 * @desc    Get all system health metrics
 * @access  Staff/Admin
 */
router.get('/system', requireStaff, getSystemHealth);

/**
 * @route   GET /api/v1/health/cpu
 * @desc    Get CPU metrics only
 * @access  Staff/Admin
 */
router.get('/cpu', requireStaff, getCpuMetrics);

/**
 * @route   GET /api/v1/health/memory
 * @desc    Get memory metrics only
 * @access  Staff/Admin
 */
router.get('/memory', requireStaff, getMemoryMetrics);

/**
 * @route   GET /api/v1/health/storage
 * @desc    Get storage/disk metrics only
 * @access  Staff/Admin
 */
router.get('/storage', requireStaff, getStorageMetrics);

/**
 * @route   GET /api/v1/health/database
 * @desc    Get MongoDB database metrics only
 * @access  Staff/Admin
 */
router.get('/database', requireStaff, getDatabaseMetrics);

export default router;

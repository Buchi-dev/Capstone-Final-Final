/**
 * Backup Routes
 * API endpoints for backup management (Admin only)
 * 
 * All backups are stored in MongoDB GridFS with metadata in Backup collection
 */

import { Router } from 'express';
import {
  triggerBackup,
  listBackups,
  getBackup,
  downloadBackup,
  restoreBackup,
  deleteBackup,
  getBackupStatus,
} from './backup.controller';
import { requireAdmin } from '@core/middlewares';

const router = Router();

/**
 * @route   GET /api/v1/backups/status
 * @desc    Get backup system status and statistics
 * @access  Protected (Admin only)
 */
router.get('/status', requireAdmin, getBackupStatus);

/**
 * @route   GET /api/v1/backups
 * @desc    List all backups stored in MongoDB
 * @access  Protected (Admin only)
 */
router.get('/', requireAdmin, listBackups);

/**
 * @route   GET /api/v1/backups/:backupId
 * @desc    Get specific backup details
 * @access  Protected (Admin only)
 */
router.get('/:backupId', requireAdmin, getBackup);

/**
 * @route   GET /api/v1/backups/:backupId/download
 * @desc    Download backup file from MongoDB GridFS
 * @access  Protected (Admin only)
 */
router.get('/:backupId/download', requireAdmin, downloadBackup);

/**
 * @route   POST /api/v1/backups/trigger
 * @desc    Trigger manual backup (stored in MongoDB GridFS)
 * @access  Protected (Admin only)
 */
router.post('/trigger', requireAdmin, triggerBackup);

/**
 * @route   POST /api/v1/backups/:backupId/restore
 * @desc    Restore from backup (WARNING: Replaces all data)
 * @access  Protected (Admin only)
 */
router.post('/:backupId/restore', requireAdmin, restoreBackup);

/**
 * @route   DELETE /api/v1/backups/:backupId
 * @desc    Delete specific backup from MongoDB GridFS
 * @access  Protected (Admin only)
 */
router.delete('/:backupId', requireAdmin, deleteBackup);

export default router;

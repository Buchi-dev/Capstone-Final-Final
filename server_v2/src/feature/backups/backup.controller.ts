/**
 * Backup Controller
 * HTTP request handlers for backup management endpoints
 */

import { Request, Response } from 'express';
import backupService from './backup.service';
import { ResponseHandler } from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';
import { BackupType } from './backup.types';
import { triggerManualBackup } from '../jobs/backupScheduler.job';

/**
 * Trigger manual backup
 * @route POST /api/v1/backups/trigger
 */
export const triggerBackup = asyncHandler(async (req: Request, res: Response) => {
  const { type = BackupType.MANUAL } = req.body;

  // Trigger backup asynchronously
  triggerManualBackup(type).catch((error) => {
    console.error('Backup failed:', error);
  });

  ResponseHandler.success(
    res,
    { message: 'Backup triggered successfully', type },
    'Backup is being created in the background'
  );
});

/**
 * List all backups
 * @route GET /api/v1/backups
 */
export const listBackups = asyncHandler(async (_req: Request, res: Response) => {
  const backups = await backupService.listBackups();

  ResponseHandler.success(res, backups, 'Backups retrieved successfully');
});

/**
 * Get backup by ID
 * @route GET /api/v1/backups/:backupId
 */
export const getBackup = asyncHandler(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    throw new Error('Backup ID is required');
  }

  const backup = await backupService.getBackupById(backupId);

  if (!backup) {
    throw new Error('Backup not found');
  }

  ResponseHandler.success(res, backup, 'Backup retrieved successfully');
});

/**
 * Download backup file
 * @route GET /api/v1/backups/:backupId/download
 */
export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    throw new Error('Backup ID is required');
  }

  const { buffer, filename } = await backupService.downloadBackup(backupId);

  // Set headers for file download
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);

  res.send(buffer);
});

/**
 * Restore from backup
 * @route POST /api/v1/backups/:backupId/restore
 */
export const restoreBackup = asyncHandler(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    throw new Error('Backup ID is required');
  }

  // WARNING: This operation will replace all data
  await backupService.restoreFromBackup(backupId);

  ResponseHandler.success(res, null, 'Backup restored successfully');
});

/**
 * Delete backup
 * @route DELETE /api/v1/backups/:backupId
 */
export const deleteBackup = asyncHandler(async (req: Request, res: Response) => {
  const { backupId } = req.params;

  if (!backupId) {
    throw new Error('Backup ID is required');
  }

  await backupService.deleteBackup(backupId);
  
  ResponseHandler.success(res, null, 'Backup deleted successfully');
});

/**
 * Get backup status and statistics
 * @route GET /api/v1/backups/status
 */
export const getBackupStatus = asyncHandler(async (_req: Request, res: Response) => {
  const backups = await backupService.listBackups();
  const stats = await backupService.getStatistics();
  
  const lastBackup = backups.length > 0 ? backups[0] : null;
  const nextScheduled = {
    daily: '3:00 AM (next day)',
    weekly: '3:00 AM (next Sunday)',
    monthly: '3:00 AM (1st of next month)',
  };

  ResponseHandler.success(res, {
    lastBackup,
    nextScheduled,
    totalBackups: backups.length,
    status: lastBackup ? 'OK' : 'No backups found',
    statistics: stats,
  }, 'Backup status retrieved successfully');
});

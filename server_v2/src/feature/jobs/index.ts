/**
 * Job Index
 * Exports all background jobs
 */

export { startDeviceOfflineChecker, stopDeviceOfflineChecker } from './deviceOfflineChecker.job';
export { startReportCleanupJob, stopReportCleanupJob } from './reportCleanup.job';
export { 
  startPermanentDeletionJob, 
  stopPermanentDeletionJob,
  triggerPermanentDeletion 
} from './permanentDeletion.job';
export {
  startBackupJobs,
  stopBackupJobs,
  triggerManualBackup,
} from './backupScheduler.job';

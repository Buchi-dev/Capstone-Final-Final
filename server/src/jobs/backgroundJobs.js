const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');
const Alert = require('../alerts/alert.Model');
const logger = require('../utils/logger');
const { TIME } = require('../utils/constants');
const mqttService = require('../utils/mqtt.service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Background Jobs Service
 * Handles scheduled tasks using node-cron
 */

/**
 * Check device presence using MQTT
 * Runs every 5 minutes
 * Queries devices for presence and updates their online/offline status
 */
const checkOfflineDevices = cron.schedule('*/1 * * * *', async () => {
  try {
    logger.info('[Background Job] Checking device presence via MQTT...');

    // Query all devices for presence
    const onlineDeviceIds = await mqttService.queryDevicePresence(15000); // 15 second timeout

    if (!onlineDeviceIds || onlineDeviceIds.length === 0) {
      logger.warn('[Background Job] No devices responded to presence query');
      // Mark all devices as offline if none responded
      await Device.updateMany(
        { status: 'online' },
        { status: 'offline' }
      );
      return;
    }

    // Update devices that responded as online
    const onlineResult = await Device.updateMany(
      { deviceId: { $in: onlineDeviceIds } },
      {
        status: 'online',
        lastSeen: new Date(),
      }
    );

    // Mark devices that didn't respond as offline
    const offlineResult = await Device.updateMany(
      {
        deviceId: { $nin: onlineDeviceIds },
        status: 'online'
      },
      { status: 'offline' }
    );

    logger.info('[Background Job] Device presence check complete', {
      onlineDevices: onlineResult.modifiedCount,
      offlineDevices: offlineResult.modifiedCount,
      totalResponded: onlineDeviceIds.length,
    });

  } catch (error) {
    logger.error('[Background Job] Error checking device presence:', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  scheduled: false, // Don't start immediately, will be started manually
});

/**
 * Cleanup old sensor readings
 * Runs daily at 2:00 AM
 * Deletes sensor readings older than 90 days
 */
const cleanupOldReadings = cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('[Background Job] Cleaning up old sensor readings...');
    
    const ninetyDaysAgo = new Date(Date.now() - TIME.NINETY_DAYS);
    
    const result = await SensorReading.deleteMany({
      timestamp: { $lt: ninetyDaysAgo },
    });

    logger.info('[Background Job] Deleted old sensor readings', {
      count: result.deletedCount,
    });
  } catch (error) {
    logger.error('[Background Job] Error cleaning up old readings:', {
      error: error.message,
      stack: error.stack,
    });
  }
}, {
  scheduled: false,
  timezone: 'UTC',
});

/**
 * Pre-restart maintenance tasks
 * Performs cleanup and logging before scheduled restart
 */
async function performPreRestartMaintenance() {
  try {
    logger.info('========================================');
    logger.info('[SCHEDULED RESTART] Starting pre-restart maintenance...');
    logger.info('========================================');

    const maintenanceTasks = [];
    const results = {
      timestamp: new Date().toISOString(),
      tasks: [],
    };

    // Task 1: Log system statistics
    logger.info('[Maintenance] Collecting system statistics...');
    try {
      const deviceCount = await Device.countDocuments();
      const onlineDevices = await Device.countDocuments({ status: 'online' });
      const offlineDevices = await Device.countDocuments({ status: 'offline' });
      const readingCount = await SensorReading.countDocuments();
      const alertCount = await Alert.countDocuments();
      const activeAlerts = await Alert.countDocuments({ status: 'active' });

      const stats = {
        devices: {
          total: deviceCount,
          online: onlineDevices,
          offline: offlineDevices,
        },
        readings: {
          total: readingCount,
        },
        alerts: {
          total: alertCount,
          active: activeAlerts,
        },
      };

      logger.info('[Maintenance] System statistics collected:', stats);
      results.tasks.push({ task: 'system_statistics', status: 'success', data: stats });
    } catch (error) {
      logger.error('[Maintenance] Failed to collect statistics:', { error: error.message });
      results.tasks.push({ task: 'system_statistics', status: 'failed', error: error.message });
    }

    // Task 2: Cleanup old log files (keep last 7 days)
    logger.info('[Maintenance] Cleaning up old log files...');
    try {
      const logsDir = path.join(__dirname, '../../logs');
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      try {
        const files = await fs.readdir(logsDir);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtimeMs < sevenDaysAgo && file.endsWith('.log')) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }

        logger.info('[Maintenance] Log cleanup complete:', { deletedFiles: deletedCount });
        results.tasks.push({ task: 'log_cleanup', status: 'success', deletedFiles: deletedCount });
      } catch (error) {
        // Logs directory might not exist yet
        logger.info('[Maintenance] Logs directory not found, skipping cleanup');
        results.tasks.push({ task: 'log_cleanup', status: 'skipped', reason: 'directory_not_found' });
      }
    } catch (error) {
      logger.error('[Maintenance] Failed to cleanup logs:', { error: error.message });
      results.tasks.push({ task: 'log_cleanup', status: 'failed', error: error.message });
    }

    // Task 3: Force flush any pending operations
    logger.info('[Maintenance] Flushing pending database operations...');
    try {
      // MongoDB will handle this during graceful shutdown
      logger.info('[Maintenance] Database operations will be flushed during shutdown');
      results.tasks.push({ task: 'database_flush', status: 'scheduled' });
    } catch (error) {
      logger.error('[Maintenance] Failed to flush operations:', { error: error.message });
      results.tasks.push({ task: 'database_flush', status: 'failed', error: error.message });
    }

    // Task 4: Log uptime and next restart time
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    const nextRestart = getNextRestartTime();

    logger.info('[Maintenance] Uptime information:', {
      uptime: uptimeFormatted,
      uptimeSeconds: Math.floor(uptime),
      nextScheduledRestart: nextRestart.toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
    });

    results.tasks.push({
      task: 'uptime_logging',
      status: 'success',
      uptime: uptimeFormatted,
      nextRestart: nextRestart.toISOString(),
    });

    logger.info('========================================');
    logger.info('[SCHEDULED RESTART] Pre-restart maintenance complete');
    logger.info('========================================');

    return results;
  } catch (error) {
    logger.error('[SCHEDULED RESTART] Pre-restart maintenance failed:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculate next Saturday midnight restart time
 */
function getNextRestartTime() {
  const now = new Date();
  const nextSaturday = new Date(now);
  
  // Set to next Saturday
  nextSaturday.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
  
  // Set to midnight Philippine Time
  nextSaturday.setHours(0, 0, 0, 0);
  
  return nextSaturday;
}

/**
 * Scheduled Server Restart
 * Runs every Saturday at 12:00 AM Philippine Time (UTC+8)
 * Cron: 0 0 * * 6 (Every Saturday at midnight)
 * 
 * This performs maintenance tasks and triggers a graceful restart
 * Docker's restart policy will automatically restart the container
 */
const scheduledRestart = cron.schedule('0 0 * * 6', async () => {
  try {
    logger.warn('========================================');
    logger.warn('[SCHEDULED RESTART] Initiating weekly maintenance restart');
    logger.warn('[SCHEDULED RESTART] Time: Saturday 12:00 AM (Philippine Time)');
    logger.warn('========================================');

    // Perform pre-restart maintenance
    await performPreRestartMaintenance();

    // Log final message
    logger.warn('[SCHEDULED RESTART] Maintenance complete. Initiating graceful shutdown...');
    logger.warn('[SCHEDULED RESTART] Container will automatically restart via Docker policy');
    logger.warn('========================================');

    // Give time for logs to flush (2 seconds)
    setTimeout(() => {
      // Trigger graceful shutdown (SIGTERM handler will handle cleanup)
      process.kill(process.pid, 'SIGTERM');
    }, 2000);

  } catch (error) {
    logger.error('[SCHEDULED RESTART] Error during scheduled restart:', {
      error: error.message,
      stack: error.stack,
    });
    
    // Still attempt restart even if maintenance fails
    logger.warn('[SCHEDULED RESTART] Proceeding with restart despite maintenance errors...');
    setTimeout(() => {
      process.kill(process.pid, 'SIGTERM');
    }, 2000);
  }
}, {
  scheduled: false,
  timezone: 'Asia/Manila', // Philippine Time (UTC+8)
});

/**
 * Start all background jobs
 */
function startBackgroundJobs() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Condensed production log
    logger.info('[JOBS] Background jobs started ✓');
    logger.info('[JOBS] Scheduled restart: Every Saturday at 12:00 AM Philippine Time');
  } else {
    // Detailed development logs
    logger.info('[JOBS] Starting background jobs...');
    logger.info('[OK] Offline device checker started (runs every 1 minute)');
    logger.info('[OK] Old readings cleanup started (runs daily at 2:00 AM UTC)');
    logger.info('[OK] Scheduled server restart (runs every Saturday at 12:00 AM Philippine Time)');
    
    // Show next restart time
    const nextRestart = getNextRestartTime();
    logger.info(`[INFO] Next scheduled restart: ${nextRestart.toLocaleString('en-US', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} Philippine Time`);
  }
  
  checkOfflineDevices.start();
  cleanupOldReadings.start();
  scheduledRestart.start();
}

/**
 * Stop all background jobs
 */
function stopBackgroundJobs() {
  logger.info('[JOBS] Stopping background jobs...');
  
  checkOfflineDevices.stop();
  cleanupOldReadings.stop();
  scheduledRestart.stop();
  
  logger.info('[OK] All background jobs stopped');
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
  performPreRestartMaintenance, // Export for manual testing
  getNextRestartTime, // Export for API endpoints
};

const cron = require('node-cron');
const { Device, SensorReading } = require('../devices/device.Model');
const logger = require('../utils/logger');
const { TIME } = require('../utils/constants');
const mqttService = require('../utils/mqtt.service');

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
 * Start all background jobs
 */
function startBackgroundJobs() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Condensed production log
    logger.info('[JOBS] Background jobs started ✓');
  } else {
    // Detailed development logs
    logger.info('[JOBS] Starting background jobs...');
    logger.info('[OK] Offline device checker started (runs every 5 minutes)');
    logger.info('[OK] Old readings cleanup started (runs daily at 2:00 AM UTC)');
  }
  
  checkOfflineDevices.start();
  cleanupOldReadings.start();
}

/**
 * Stop all background jobs
 */
function stopBackgroundJobs() {
  logger.info('[JOBS] Stopping background jobs...');
  
  checkOfflineDevices.stop();
  cleanupOldReadings.stop();
  
  logger.info('[OK] All background jobs stopped');
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs,
};

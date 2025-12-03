/**
 * Sensor Reading Routes
 * 
 * @module feature/sensorReadings/sensorReading.routes
 */

import { Router } from 'express';
import {
  getAllReadings,
  createReading,
  bulkInsertReadings,
  getLatestReading,
  getStatistics,
  getAggregatedData,
  deleteOldReadings,
  getReadingCount,
} from './sensorReading.controller';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  sensorReadingFiltersSchema,
  createSensorReadingSchema,
  bulkInsertSchema,
  getLatestReadingSchema,
  statisticsQuerySchema,
  aggregatedDataQuerySchema,
  deleteOldReadingsSchema,
} from './sensorReading.schema';

const router = Router();

/**
 * GET /api/v1/sensor-readings
 * Get sensor readings with filters
 */
router.get('/', validateRequest(sensorReadingFiltersSchema), getAllReadings);

/**
 * GET /api/v1/sensor-readings/statistics
 * Get sensor reading statistics
 */
router.get('/statistics', validateRequest(statisticsQuerySchema), getStatistics);

/**
 * GET /api/v1/sensor-readings/aggregated
 * Get aggregated time-series data
 */
router.get('/aggregated', validateRequest(aggregatedDataQuerySchema), getAggregatedData);

/**
 * GET /api/v1/sensor-readings/count
 * Get reading count
 */
router.get('/count', getReadingCount);

/**
 * GET /api/v1/sensor-readings/:deviceId/latest
 * Get latest reading for device
 */
router.get('/:deviceId/latest', validateRequest(getLatestReadingSchema), getLatestReading);

/**
 * POST /api/v1/sensor-readings
 * Create single sensor reading
 */
router.post('/', validateRequest(createSensorReadingSchema), createReading);

/**
 * POST /api/v1/sensor-readings/bulk
 * Bulk insert sensor readings
 */
router.post('/bulk', validateRequest(bulkInsertSchema), bulkInsertReadings);

/**
 * DELETE /api/v1/sensor-readings/old
 * Delete old readings
 */
router.delete('/old', validateRequest(deleteOldReadingsSchema), deleteOldReadings);

export default router;

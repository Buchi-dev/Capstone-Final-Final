/**
 * Sensor Reading Model
 * Optimized for high-volume time-series data with proper indexing
 */

import mongoose, { Schema, Model } from 'mongoose';
import { ISensorReadingDocument } from './sensorReading.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Sensor Reading Schema
 * High-volume data storage with optimized indexes for time-series queries
 */
const sensorReadingSchema = new Schema<ISensorReadingDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true, // Critical for device-specific queries
    },
    pH: {
      type: Number,
      required: true,
    },
    turbidity: {
      type: Number,
      required: true,
    },
    tds: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true, // Critical for time-based queries
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation
    collection: COLLECTIONS.SENSOR_READINGS,
  }
);

/**
 * Compound indexes for optimized time-series queries
 * CRITICAL for performance with high-volume data
 */

// Primary query pattern: Get readings for device within time range
sensorReadingSchema.index({ deviceId: 1, timestamp: -1 });

// Time-based queries for aggregation
sensorReadingSchema.index({ timestamp: -1, deviceId: 1 });

// TTL index for automatic data cleanup (optional - 90 days retention)
// Uncomment if you want automatic data expiration
// sensorReadingSchema.index({ createdAt: 1 }, { expireAfterSeconds: TIME.NINETY_DAYS / 1000 });

/**
 * Sensor Reading Model
 */
const SensorReading: Model<ISensorReadingDocument> = mongoose.model<ISensorReadingDocument>(
  COLLECTIONS.SENSOR_READINGS,
  sensorReadingSchema
);

export default SensorReading;

/**
 * Backup Model
 * MongoDB schema for backup metadata
 * 
 * Stores backup information including:
 * - Backup metadata (type, status, size)
 * - GridFS file reference
 * - Creation and expiration dates
 * - Collection counts and version info
 * 
 * @module feature/backups/backup.model
 */

import { Schema, model, Document } from 'mongoose';
import { IBackup, BackupType, BackupStatus } from './backup.types';

/**
 * Backup document interface
 */
export interface IBackupDocument extends Omit<IBackup, 'id'>, Document {}

/**
 * Backup schema
 */
const BackupSchema = new Schema<IBackupDocument>(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(BackupType),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(BackupStatus),
      default: BackupStatus.IN_PROGRESS,
      index: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    gridFsFileId: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    metadata: {
      timestamp: {
        type: Date,
        required: true,
      },
      version: {
        type: String,
        required: true,
      },
      environment: {
        type: String,
        required: true,
      },
      collections: {
        devices: {
          type: Number,
          required: true,
          min: 0,
        },
        users: {
          type: Number,
          required: true,
          min: 0,
        },
        sensorReadings: {
          type: Number,
          required: true,
          min: 0,
        },
        alerts: {
          type: Number,
          required: true,
          min: 0,
        },
      },
      size: {
        type: Number,
        required: true,
        min: 0,
      },
      encrypted: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    error: {
      type: String,
      required: false,
    },
    expiresAt: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    versionKey: false,
  }
);

/**
 * Indexes for query optimization
 */
BackupSchema.index({ createdAt: -1 }); // Sort by creation date
BackupSchema.index({ type: 1, createdAt: -1 }); // Filter by type and sort
BackupSchema.index({ status: 1, createdAt: -1 }); // Filter by status and sort
BackupSchema.index({ expiresAt: 1 }); // Cleanup job efficiency

/**
 * Pre-save middleware
 * Set expiration date based on backup type if not provided
 */
BackupSchema.pre('save', function () {
  if (!this.expiresAt) {
    const retentionDays = {
      [BackupType.DAILY]: 7,
      [BackupType.WEEKLY]: 28,
      [BackupType.MONTHLY]: 365,
      [BackupType.MANUAL]: 90, // Manual backups expire after 90 days
    };

    const days = retentionDays[this.type] || 30;
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);
    this.expiresAt = expirationDate;
  }
});

/**
 * Static method: Get backup statistics
 */
BackupSchema.statics.getStatistics = async function () {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        byType: [
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
              totalSize: { $sum: '$size' },
            },
          },
        ],
        byStatus: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ],
        totalSize: [
          {
            $group: {
              _id: null,
              size: { $sum: '$size' },
            },
          },
        ],
        recent: [
          {
            $sort: { createdAt: -1 },
          },
          {
            $limit: 10,
          },
          {
            $project: {
              filename: 1,
              type: 1,
              status: 1,
              size: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);
};

/**
 * Static method: Find expired backups
 */
BackupSchema.statics.findExpired = function () {
  return this.find({
    expiresAt: { $lt: new Date() },
  });
};

/**
 * Instance method: Mark as completed
 */
BackupSchema.methods.markAsCompleted = function (gridFsFileId?: Schema.Types.ObjectId) {
  this.status = BackupStatus.COMPLETED;
  if (gridFsFileId) {
    this.gridFsFileId = gridFsFileId;
  }
  return this.save();
};

/**
 * Instance method: Mark as failed
 */
BackupSchema.methods.markAsFailed = function (errorMessage: string) {
  this.status = BackupStatus.FAILED;
  this.error = errorMessage;
  return this.save();
};

/**
 * Backup Model
 */
const Backup = model<IBackupDocument>('Backup', BackupSchema);

export default Backup;

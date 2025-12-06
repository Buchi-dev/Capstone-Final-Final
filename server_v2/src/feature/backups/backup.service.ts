/**
 * Backup Service
 * 
 * Handles automated backups with MongoDB GridFS storage:
 * - MongoDB collection exports
 * - Compression and encryption
 * - GridFS storage for backup files
 * - Backup retention policies
 * - Backup verification
 * 
 * @module feature/backups/backup.service
 */

import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

import Backup from './backup.model';
import Device from '@feature/devices/device.model';
import Alert from '@feature/alerts/alert.model';
import SensorReading from '@feature/sensorReadings/sensorReading.model';
import logger from '@utils/logger.util';
import { dbConnection } from '@core/configs';
import { appConfig } from '@core/configs';

import {
  IBackupMetadata,
  IBackupData,
  BackupType,
  BackupStatus,
  IBackup,
} from './backup.types';

/**
 * Backup Service Class
 */
export class BackupService {
  private encryptionKey: string;
  private bucket: GridFSBucket | null = null;

  constructor() {
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.initializeGridFS();
  }

  /**
   * Initialize GridFS bucket for backups
   */
  private initializeGridFS(): void {
    try {
      const connection = dbConnection.getConnection();
      const db = connection.db;

      if (!db) {
        throw new Error('Database connection is null');
      }

      this.bucket = new GridFSBucket(db, {
        bucketName: 'backups',
      });

      logger.info('✅ Backup GridFS: Initialized successfully');
    } catch (error) {
      logger.error('❌ Backup GridFS: Initialization failed:', error);
    }
  }

  /**
   * Generate encryption key if not provided
   */
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️  Generated temporary encryption key. Set BACKUP_ENCRYPTION_KEY in environment for production.');
    return key;
  }

  /**
   * Export MongoDB collections to JSON
   */
  private async exportCollections(): Promise<IBackupData> {
    logger.info('Exporting MongoDB collections...');

    const [devices, users, sensorReadings, alerts] = await Promise.all([
      // Include soft-deleted devices
      Device.find({}).lean(),
      // Export users (implement user model query when available)
      Promise.resolve([]),
      // Last 90 days + all soft-deleted sensor readings
      SensorReading.find({
        $or: [
          { isDeleted: true },
          { timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        ],
      }).lean(),
      // Last 90 days + all soft-deleted alerts
      Alert.find({
        $or: [
          { isDeleted: true },
          { timestamp: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        ],
      }).lean(),
    ]);

    const metadata: IBackupMetadata = {
      timestamp: new Date(),
      version: appConfig.server.apiVersion,
      environment: appConfig.server.nodeEnv,
      collections: {
        devices: devices.length,
        users: users.length,
        sensorReadings: sensorReadings.length,
        alerts: alerts.length,
      },
      size: 0,
      encrypted: true,
    };

    logger.info('Collection export complete', metadata.collections);

    return {
      devices,
      users,
      sensorReadings,
      alerts,
      config: {
        apiVersion: appConfig.server.apiVersion,
        environment: appConfig.server.nodeEnv,
      },
      metadata,
    };
  }

  /**
   * Compress and encrypt backup data
   */
  private async compressAndEncrypt(data: IBackupData): Promise<Buffer> {
    logger.info('Compressing and encrypting backup...');

    // Convert to JSON
    const jsonData = JSON.stringify(data);

    // Compress
    const compressed = await promisify(zlib.gzip)(Buffer.from(jsonData));

    // Encrypt
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.substring(0, 32)),
      iv
    );

    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);

    // Prepend IV for decryption
    const result = Buffer.concat([iv, encrypted]);

    logger.info(`Backup compressed and encrypted. Size: ${(result.length / 1024 / 1024).toFixed(2)} MB`);

    return result;
  }

  /**
   * Decrypt and decompress backup data
   */
  private async decryptAndDecompress(encryptedData: Buffer): Promise<IBackupData> {
    logger.info('Decrypting and decompressing backup...');

    // Extract IV
    const iv = encryptedData.slice(0, 16);
    const encrypted = encryptedData.slice(16);

    // Decrypt
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey.substring(0, 32)),
      iv
    );

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // Decompress
    const decompressed = await promisify(zlib.gunzip)(decrypted);

    // Parse JSON
    const data = JSON.parse(decompressed.toString());

    logger.info('Backup decrypted and decompressed');

    return data;
  }

  /**
   * Upload backup to MongoDB GridFS
   */
  private async uploadToGridFS(
    buffer: Buffer,
    filename: string,
    metadata: IBackupMetadata,
    type: BackupType
  ): Promise<Types.ObjectId> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket!.openUploadStream(filename, {
        metadata: {
          contentType: 'application/gzip',
          backupType: type,
          collections: metadata.collections,
          version: metadata.version,
          environment: metadata.environment,
          uploadedAt: new Date(),
        },
      });

      const readableStream = Readable.from(buffer);

      uploadStream.on('finish', () => {
        logger.info(
          `✅ Backup uploaded to GridFS: ${filename} (${uploadStream.id}) - ${(buffer.length / 1024 / 1024).toFixed(2)} MB`
        );
        resolve(uploadStream.id as Types.ObjectId);
      });

      uploadStream.on('error', (error: Error) => {
        logger.error(`❌ Backup upload to GridFS failed:`, error);
        reject(error);
      });

      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Download from GridFS as buffer
   */
  private async downloadFromGridFS(fileId: Types.ObjectId | string): Promise<Buffer> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    const objectId = typeof fileId === 'string' ? new Types.ObjectId(fileId) : fileId;

    return new Promise((resolve, reject) => {
      const downloadStream = this.bucket!.openDownloadStream(objectId);
      const chunks: Buffer[] = [];

      downloadStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        logger.info(`✅ Downloaded backup from GridFS - ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(buffer);
      });

      downloadStream.on('error', (error: Error) => {
        logger.error(`❌ Backup download from GridFS failed:`, error);
        reject(error);
      });
    });
  }

  /**
   * Delete file from GridFS
   */
  private async deleteFromGridFS(fileId: Types.ObjectId | string): Promise<void> {
    if (!this.bucket) {
      throw new Error('GridFS bucket not initialized');
    }

    const objectId = typeof fileId === 'string' ? new Types.ObjectId(fileId) : fileId;

    try {
      await this.bucket.delete(objectId);
      logger.info(`✅ Deleted backup from GridFS: ${objectId}`);
    } catch (error) {
      logger.error(`❌ Failed to delete backup from GridFS:`, error);
      throw error;
    }
  }

  /**
   * Create backup
   */
  async createBackup(type: BackupType = BackupType.MANUAL): Promise<IBackup> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}_${type}.gz`;

    // Create backup record in MongoDB with IN_PROGRESS status
    let backupRecord = await Backup.create({
      filename,
      type,
      status: BackupStatus.IN_PROGRESS,
      size: 0,
      metadata: {
        timestamp,
        version: appConfig.server.apiVersion,
        environment: appConfig.server.nodeEnv,
        collections: {
          devices: 0,
          users: 0,
          sensorReadings: 0,
          alerts: 0,
        },
        size: 0,
        encrypted: true,
      },
    });

    try {
      logger.info(`Starting ${type} backup...`);

      // Export collections
      const backupData = await this.exportCollections();

      // Compress and encrypt
      const encryptedData = await this.compressAndEncrypt(backupData);

      // Update metadata with size
      backupData.metadata.size = encryptedData.length;

      // Upload to GridFS
      const gridFsFileId = await this.uploadToGridFS(encryptedData, filename, backupData.metadata, type);

      // Update backup record with completed status
      backupRecord.status = BackupStatus.COMPLETED;
      backupRecord.size = encryptedData.length;
      backupRecord.metadata = backupData.metadata;
      backupRecord.gridFsFileId = gridFsFileId as any;
      await backupRecord.save();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Backup completed in ${duration}s`, {
        filename,
        size: `${(encryptedData.length / 1024 / 1024).toFixed(2)} MB`,
        gridFsFileId: gridFsFileId.toString(),
      });

      return {
        id: backupRecord._id.toString(),
        filename: backupRecord.filename,
        type: backupRecord.type,
        status: backupRecord.status,
        size: backupRecord.size,
        metadata: backupRecord.metadata,
        gridFsFileId: gridFsFileId.toString(),
        createdAt: backupRecord.createdAt,
        expiresAt: backupRecord.expiresAt,
      };
    } catch (error) {
      logger.error('Backup failed', error);

      // Update backup record with failed status
      backupRecord.status = BackupStatus.FAILED;
      backupRecord.error = error instanceof Error ? error.message : 'Unknown error';
      await backupRecord.save();

      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {
    logger.info(`Restoring from backup: ${backupId}`);

    try {
      // Find backup record
      const backupRecord = await Backup.findById(backupId);
      
      if (!backupRecord) {
        throw new Error('Backup not found');
      }

      if (backupRecord.status !== BackupStatus.COMPLETED) {
        throw new Error('Cannot restore from incomplete backup');
      }

      if (!backupRecord.gridFsFileId) {
        throw new Error('Backup file not found in GridFS');
      }

      // Download from GridFS
      logger.info('Downloading backup from GridFS...');
      const encryptedData = await this.downloadFromGridFS(backupRecord.gridFsFileId);

      // Decrypt and decompress
      const backupData = await this.decryptAndDecompress(encryptedData);

      logger.info('Restoring collections...', backupData.metadata.collections);

      // WARNING: This will replace all data!
      // Restore devices
      await Device.deleteMany({});
      if (backupData.devices.length > 0) {
        await Device.insertMany(backupData.devices);
      }

      // Restore alerts
      await Alert.deleteMany({});
      if (backupData.alerts.length > 0) {
        await Alert.insertMany(backupData.alerts);
      }

      // Restore sensor readings
      await SensorReading.deleteMany({});
      if (backupData.sensorReadings.length > 0) {
        await SensorReading.insertMany(backupData.sensorReadings);
      }

      logger.info('✅ Backup restored successfully');
    } catch (error) {
      logger.error('Failed to restore backup', error);
      throw error;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    logger.info(`Deleting backup: ${backupId}`);

    try {
      // Find backup record
      const backupRecord = await Backup.findById(backupId);
      
      if (!backupRecord) {
        throw new Error('Backup not found');
      }

      // Delete from GridFS if exists
      if (backupRecord.gridFsFileId) {
        try {
          await this.deleteFromGridFS(backupRecord.gridFsFileId);
        } catch (error) {
          logger.warn('Failed to delete backup file from GridFS', error);
          // Continue with record deletion even if GridFS deletion fails
        }
      }

      // Delete backup record
      await Backup.findByIdAndDelete(backupId);
      
      logger.info('✅ Backup deleted successfully');
    } catch (error) {
      logger.error('Failed to delete backup', error);
      throw error;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    logger.info('Cleaning up old backups...');

    try {
      // Find expired backups
      const expiredBackups = await Backup.find({
        expiresAt: { $lt: new Date() },
      });

      logger.info(`Found ${expiredBackups.length} expired backups`);

      for (const backup of expiredBackups) {
        try {
          // Delete from GridFS
          if (backup.gridFsFileId) {
            await this.deleteFromGridFS(backup.gridFsFileId);
          }

          // Delete backup record
          await Backup.findByIdAndDelete(backup._id);
          
          logger.info(`Deleted expired backup: ${backup.filename}`);
        } catch (error) {
          logger.error(`Failed to delete expired backup: ${backup.filename}`, error);
          // Continue with other deletions
        }
      }

      logger.info('✅ Backup cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup old backups', error);
    }
  }

  /**
   * List available backups
   */
  async listBackups(filters?: {
    type?: BackupType;
    status?: BackupStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<IBackup[]> {
    try {
      const query: any = {};

      if (filters?.type) {
        query.type = filters.type;
      }

      if (filters?.status) {
        query.status = filters.status;
      }

      if (filters?.startDate || filters?.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      const backups = await Backup.find(query)
        .sort({ createdAt: -1 })
        .lean();

      return backups.map((backup) => ({
        id: backup._id.toString(),
        filename: backup.filename,
        type: backup.type,
        status: backup.status,
        size: backup.size,
        metadata: backup.metadata,
        gridFsFileId: backup.gridFsFileId?.toString(),
        createdAt: backup.createdAt,
        expiresAt: backup.expiresAt,
        error: backup.error,
      }));
    } catch (error) {
      logger.error('Failed to list backups', error);
      return [];
    }
  }

  /**
   * Get backup by ID
   */
  async getBackupById(backupId: string): Promise<IBackup | null> {
    try {
      const backup = await Backup.findById(backupId).lean();

      if (!backup) {
        return null;
      }

      return {
        id: backup._id.toString(),
        filename: backup.filename,
        type: backup.type,
        status: backup.status,
        size: backup.size,
        metadata: backup.metadata,
        gridFsFileId: backup.gridFsFileId?.toString(),
        createdAt: backup.createdAt,
        expiresAt: backup.expiresAt,
        error: backup.error,
      };
    } catch (error) {
      logger.error('Failed to get backup by ID', error);
      return null;
    }
  }

  /**
   * Download backup file
   * Returns the encrypted, compressed backup file buffer
   */
  async downloadBackup(backupId: string): Promise<{ buffer: Buffer; filename: string }> {
    logger.info(`Downloading backup: ${backupId}`);

    try {
      // Find backup record
      const backupRecord = await Backup.findById(backupId);
      
      if (!backupRecord) {
        throw new Error('Backup not found');
      }

      if (!backupRecord.gridFsFileId) {
        throw new Error('Backup file not found in GridFS');
      }

      // Download from GridFS
      const fileBuffer = await this.downloadFromGridFS(backupRecord.gridFsFileId);

      logger.info(`✅ Downloaded backup: ${backupRecord.filename}`);

      return {
        buffer: fileBuffer,
        filename: backupRecord.filename,
      };
    } catch (error) {
      logger.error('Failed to download backup', error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const stats = await (Backup as any).getStatistics();
      return stats[0];
    } catch (error) {
      logger.error('Failed to get backup statistics', error);
      return {
        total: [{ count: 0 }],
        byType: [],
        byStatus: [],
        totalSize: [{ size: 0 }],
        recent: [],
      };
    }
  }
}

export default new BackupService();

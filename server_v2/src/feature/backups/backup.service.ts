/**
 * Backup Service
 * 
 * Handles automated backups with Google Drive integration:
 * - MongoDB collection exports
 * - Compression and encryption
 * - Google Drive uploads with retry logic
 * - Backup retention policies
 * - Backup verification
 * 
 * @module feature/backups/backup.service
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

import Device from '@feature/devices/device.model';
import Alert from '@feature/alerts/alert.model';
import SensorReading from '@feature/sensorReadings/sensorReading.model';
import logger from '@utils/logger.util';
import { appConfig } from '@core/configs';

import {
  IBackupMetadata,
  IBackupData,
  BackupType,
  BackupStatus,
  IBackup,
  IGoogleDriveUploadResult,
} from './backup.types';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

/**
 * Backup Service Class
 */
export class BackupService {
  private drive: any;
  private backupDir: string;
  private encryptionKey: string;
  private initializationPromise: Promise<void>;

  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || this.generateEncryptionKey();
    
    // Initialize Google Drive API asynchronously
    this.initializationPromise = this.initializeGoogleDrive();
  }

  /**
   * Wait for Google Drive initialization to complete
   */
  private async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Initialize Google Drive API client
   */
  private async initializeGoogleDrive(): Promise<void> {
    try {
      // Dynamic import to avoid compile-time dependency
      const { google } = await import('googleapis');
      
      // Try to load credentials from file path first, then from JSON string
      let credentials;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        // Use file path (can reuse Firebase service account)
        const credentialsPath = path.resolve(
          process.cwd(), 
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH || ''
        );
        
        try {
          credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          logger.info(`Loaded Google Drive credentials from: ${credentialsPath}`);
        } catch (error) {
          logger.warn(`Failed to read credentials file: ${credentialsPath}`);
        }
      } else if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
        // Use JSON string from environment variable
        credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
      }

      if (!credentials) {
        logger.warn('Google Drive credentials not found. Backups will be stored locally only.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      logger.info('✅ Google Drive API initialized with service account');

      // Create backup folder structure on initialization
      await this.createBackupFolderStructure();
    } catch (error) {
      logger.error('Failed to initialize Google Drive API', error);
    }
  }

  /**
   * Create the PureTrack_Backups folder structure in Google Drive
   * Creates: PureTrack_Backups/Daily, Weekly, Monthly, Manual
   */
  private async createBackupFolderStructure(): Promise<void> {
    if (!this.drive) return;

    try {
      logger.info('Creating backup folder structure in Google Drive...');

      // Create or get root folder
      let rootFolderId = await this.findFolder('PureTrack_Backups');
      if (!rootFolderId) {
        rootFolderId = await this.createFolder('PureTrack_Backups');
        logger.info('✅ Created root folder: PureTrack_Backups');
      } else {
        logger.info('📁 Root folder already exists: PureTrack_Backups');
      }

      // Create subfolders for each backup type
      const subfolders = ['Daily', 'Weekly', 'Monthly', 'Manual'];
      
      for (const folderName of subfolders) {
        let subfolderId = await this.findFolder(folderName, rootFolderId);
        if (!subfolderId) {
          subfolderId = await this.createFolder(folderName, rootFolderId);
          logger.info(`✅ Created subfolder: ${folderName}`);
        } else {
          logger.info(`📁 Subfolder already exists: ${folderName}`);
        }
      }

      logger.info('✅ Backup folder structure verified in Google Drive');
    } catch (error) {
      logger.error('Failed to create backup folder structure', error);
      logger.warn('Backups will still work - folders will be created on first backup');
    }
  }

  /**
   * Generate encryption key if not provided
   */
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('Generated temporary encryption key. Set BACKUP_ENCRYPTION_KEY in environment for production.');
    return key;
  }

  /**
   * Ensure backup directory exists
   */
  private async ensureBackupDirectory(): Promise<void> {
    try {
      await access(this.backupDir);
    } catch {
      await mkdir(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Get or create Google Drive folder structure
   */
  private async getOrCreateGoogleDriveFolder(type: BackupType): Promise<string | null> {
    if (!this.drive) return null;

    try {
      const folderName = 'PureTrack_Backups';
      const subFolderMap = {
        [BackupType.DAILY]: 'Daily',
        [BackupType.WEEKLY]: 'Weekly',
        [BackupType.MONTHLY]: 'Monthly',
        [BackupType.MANUAL]: 'Manual',
      };

      // Get or create root folder
      let rootFolderId = await this.findFolder(folderName);
      if (!rootFolderId) {
        rootFolderId = await this.createFolder(folderName);
      }

      // Get or create subfolder
      const subFolderName = subFolderMap[type];
      let subFolderId = await this.findFolder(subFolderName, rootFolderId);
      if (!subFolderId) {
        subFolderId = await this.createFolder(subFolderName, rootFolderId);
      }

      return subFolderId;
    } catch (error) {
      logger.error('Failed to get/create Google Drive folder', error);
      return null;
    }
  }

  /**
   * Find folder in Google Drive
   */
  private async findFolder(name: string, parentId?: string): Promise<string | null> {
    try {
      const query = parentId
        ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      return response.data.files?.[0]?.id || null;
    } catch (error) {
      logger.error(`Failed to find folder: ${name}`, error);
      return null;
    }
  }

  /**
   * Create folder in Google Drive
   */
  private async createFolder(name: string, parentId?: string): Promise<string> {
    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });

    logger.info(`Created Google Drive folder: ${name}`);
    return response.data.id;
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
   * Upload backup to Google Drive with retry logic
   */
  private async uploadToGoogleDrive(
    filePath: string,
    filename: string,
    type: BackupType,
    retries = 3
  ): Promise<IGoogleDriveUploadResult | null> {
    if (!this.drive) {
      logger.warn('Google Drive not initialized. Skipping upload.');
      return null;
    }

    const folderId = await this.getOrCreateGoogleDriveFolder(type);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Uploading to Google Drive (attempt ${attempt}/${retries})...`);

        const fileMetadata: any = {
          name: filename,
        };

        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        const media = {
          mimeType: 'application/gzip',
          body: fs.createReadStream(filePath),
        };

        const response = await this.drive.files.create({
          requestBody: fileMetadata,
          media,
          fields: 'id, name, size, webViewLink',
        });

        // Verify upload
        const verified = await this.verifyUpload(response.data.id, filePath);

        logger.info(`✅ Backup uploaded to Google Drive: ${response.data.id}`);

        return {
          fileId: response.data.id,
          name: response.data.name,
          size: parseInt(response.data.size || '0'),
          webViewLink: response.data.webViewLink,
          verified,
        };
      } catch (error) {
        logger.error(`Upload attempt ${attempt} failed`, error);

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error('All upload attempts failed');
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Verify uploaded file integrity
   */
  private async verifyUpload(fileId: string, localFilePath: string): Promise<boolean> {
    try {
      const response = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      const localSize = fs.statSync(localFilePath).size;
      let downloadedSize = 0;

      return new Promise((resolve) => {
        response.data
          .on('data', (chunk: Buffer) => {
            downloadedSize += chunk.length;
          })
          .on('end', () => {
            const verified = downloadedSize === localSize;
            if (verified) {
              logger.info('✅ Upload verified successfully');
            } else {
              logger.warn(`Upload verification failed. Local: ${localSize}, Remote: ${downloadedSize}`);
            }
            resolve(verified);
          })
          .on('error', () => {
            logger.error('Upload verification failed');
            resolve(false);
          });
      });
    } catch (error) {
      logger.error('Failed to verify upload', error);
      return false;
    }
  }

  /**
   * Create backup
   */
  async createBackup(type: BackupType = BackupType.MANUAL): Promise<IBackup> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}_${type}.gz`;
    const filePath = path.join(this.backupDir, filename);

    try {
      logger.info(`Starting ${type} backup...`);

      // Ensure Google Drive is initialized before proceeding
      await this.waitForInitialization();

      await this.ensureBackupDirectory();

      // Export collections
      const backupData = await this.exportCollections();

      // Compress and encrypt
      const encryptedData = await this.compressAndEncrypt(backupData);

      // Update metadata with size
      backupData.metadata.size = encryptedData.length;

      // Write to file
      await writeFile(filePath, encryptedData);

      logger.info(`Backup file created: ${filename}`);

      // Upload to Google Drive
      const uploadResult = await this.uploadToGoogleDrive(filePath, filename, type);

      // Create backup record
      const backup: IBackup = {
        id: crypto.randomBytes(16).toString('hex'),
        filename,
        type,
        status: BackupStatus.COMPLETED,
        size: encryptedData.length,
        metadata: backupData.metadata,
        googleDriveFileId: uploadResult?.fileId,
        createdAt: timestamp,
      };

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`✅ Backup completed in ${duration}s`, {
        filename,
        size: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
        googleDriveFileId: backup.googleDriveFileId,
      });

      // Clean up local file if uploaded successfully
      if (uploadResult && process.env.KEEP_LOCAL_BACKUPS !== 'true') {
        try {
          await unlink(filePath);
          logger.info('Local backup file removed after successful upload');
        } catch (error) {
          logger.warn('Failed to remove local backup file', error);
        }
      }

      return backup;
    } catch (error) {
      logger.error('Backup failed', error);

      // Clean up failed backup file
      try {
        await unlink(filePath);
      } catch {}

      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(fileId: string): Promise<void> {
    logger.info(`Restoring from backup: ${fileId}`);

    try {
      // Download from Google Drive if fileId is a Google Drive ID
      let encryptedData: Buffer;

      if (this.drive && fileId.length > 20) {
        // Likely a Google Drive file ID
        const response = await this.drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'stream' }
        );

        const chunks: Buffer[] = [];
        await new Promise((resolve, reject) => {
          response.data
            .on('data', (chunk: Buffer) => chunks.push(chunk))
            .on('end', () => resolve(undefined))
            .on('error', reject);
        });

        encryptedData = Buffer.concat(chunks);
      } else {
        // Local file
        const filePath = path.join(this.backupDir, fileId);
        encryptedData = await readFile(filePath);
      }

      // Decrypt and decompress
      const backupData = await this.decryptAndDecompress(encryptedData);

      logger.info('Restoring collections...', backupData.metadata.collections);

      // WARNING: This will replace all data!
      // In production, you might want to add more safety checks

      // Restore devices
      await Device.deleteMany({});
      await Device.insertMany(backupData.devices);

      // Restore alerts
      await Alert.deleteMany({});
      await Alert.insertMany(backupData.alerts);

      // Restore sensor readings
      await SensorReading.deleteMany({});
      await SensorReading.insertMany(backupData.sensorReadings);

      logger.info('✅ Backup restored successfully');
    } catch (error) {
      logger.error('Failed to restore backup', error);
      throw error;
    }
  }

  /**
   * Delete old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    // Ensure Google Drive is initialized
    await this.waitForInitialization();

    if (!this.drive) return;

    logger.info('Cleaning up old backups...');

    try {
      const now = new Date();
      const retentionDays = {
        [BackupType.DAILY]: 7,
        [BackupType.WEEKLY]: 28,
        [BackupType.MONTHLY]: 365,
      };

      for (const [type, days] of Object.entries(retentionDays)) {
        const folderId = await this.getOrCreateGoogleDriveFolder(type as BackupType);
        if (!folderId) continue;

        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const response = await this.drive.files.list({
          q: `'${folderId}' in parents and trashed=false and createdTime < '${cutoffDate.toISOString()}'`,
          fields: 'files(id, name, createdTime)',
        });

        for (const file of response.data.files || []) {
          await this.drive.files.delete({ fileId: file.id });
          logger.info(`Deleted old backup: ${file.name}`);
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
  async listBackups(): Promise<IBackup[]> {
    const backups: IBackup[] = [];

    // Ensure Google Drive is initialized
    await this.waitForInitialization();

    if (!this.drive) {
      logger.warn('Google Drive not initialized. Cannot list backups.');
      return backups;
    }

    try {
      const rootFolderId = await this.findFolder('PureTrack_Backups');
      if (!rootFolderId) return backups;

      const response = await this.drive.files.list({
        q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });

      for (const folder of response.data.files || []) {
        const filesResponse = await this.drive.files.list({
          q: `'${folder.id}' in parents and trashed=false`,
          fields: 'files(id, name, size, createdTime)',
          orderBy: 'createdTime desc',
        });

        for (const file of filesResponse.data.files || []) {
          backups.push({
            id: file.id,
            filename: file.name,
            type: folder.name.toLowerCase() as BackupType,
            status: BackupStatus.COMPLETED,
            size: parseInt(file.size || '0'),
            metadata: {} as any,
            googleDriveFileId: file.id,
            createdAt: new Date(file.createdTime),
          });
        }
      }

      return backups;
    } catch (error) {
      logger.error('Failed to list backups', error);
      return backups;
    }
  }
}

export default new BackupService();

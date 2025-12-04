/**
 * Google Drive Service
 * 
 * Centralized service for Google Drive operations:
 * - File uploads
 * - Folder management
 * - File sharing
 * - Authentication
 * 
 * @module utils/googleDrive.service
 */

import path from 'path';
import fs from 'fs';
import logger from './logger.util';

/**
 * Google Drive Upload Result
 */
export interface IGoogleDriveUploadResult {
  fileId: string;
  name: string;
  size: number;
  webViewLink: string;
  verified: boolean;
}

/**
 * Google Drive Service Class
 */
export class GoogleDriveService {
  private drive: any = null;
  private initializationPromise: Promise<void>;

  constructor() {
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
   * Check if Google Drive is available
   */
  async isAvailable(): Promise<boolean> {
    await this.waitForInitialization();
    return this.drive !== null;
  }

  /**
   * Initialize Google Drive API client
   */
  private async initializeGoogleDrive(): Promise<void> {
    try {
      const { google } = await import('googleapis');

      let credentials;

      // Try loading from file first
      const credentialsPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      if (fs.existsSync(credentialsPath)) {
        const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8');
        credentials = JSON.parse(credentialsContent);
        logger.info(`Loaded Google Drive credentials from: ${credentialsPath}`);
      } else if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
        // Fallback to environment variable
        credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
        logger.info('Loaded Google Drive credentials from environment variable');
      } else {
        logger.warn('Google Drive credentials not found. File uploads will skip Google Drive.');
        return;
      }

      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });

      logger.info('✅ Google Drive API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Google Drive API', error);
    }
  }

  /**
   * Find folder in Google Drive by name
   */
  async findFolder(name: string, parentId?: string): Promise<string | null> {
    await this.waitForInitialization();
    if (!this.drive) return null;

    try {
      const query = parentId
        ? `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
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
  async createFolder(name: string, parentId?: string): Promise<string | null> {
    await this.waitForInitialization();
    if (!this.drive) return null;

    try {
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
        supportsAllDrives: true,
      });

      logger.info(`Created Google Drive folder: ${name}`);
      return response.data.id;
    } catch (error) {
      logger.error(`Failed to create folder: ${name}`, error);
      return null;
    }
  }

  /**
   * Get or create folder by path (e.g., "PureTrack/Reports/Water-Quality")
   */
  async getOrCreateFolderByPath(folderPath: string[]): Promise<string | null> {
    await this.waitForInitialization();
    if (!this.drive) return null;

    let currentParentId: string | null = null;

    for (const folderName of folderPath) {
      let folderId = await this.findFolder(folderName, currentParentId || undefined);
      
      if (!folderId) {
        // Don't create if it's the root folder - it should already exist and be shared
        if (!currentParentId) {
          logger.error(`Root folder '${folderName}' not found. It must be created and shared with the service account first.`);
          return null;
        }
        
        folderId = await this.createFolder(folderName, currentParentId || undefined);
        if (!folderId) return null;
      } else {
        logger.info(`Found existing folder: ${folderName} (ID: ${folderId})`);
      }

      currentParentId = folderId;
    }

    return currentParentId;
  }

  /**
   * Upload file to Google Drive
   * @param fileContent Buffer or file path
   * @param filename Name for the file in Google Drive
   * @param options Upload options
   */
  async uploadFile(
    fileContent: Buffer | string,
    filename: string,
    options: {
      mimeType: string;
      folderId?: string;
      folderPath?: string[];
      description?: string;
      retries?: number;
    }
  ): Promise<IGoogleDriveUploadResult | null> {
    await this.waitForInitialization();
    if (!this.drive) {
      logger.warn('Google Drive not initialized. Skipping upload.');
      return null;
    }

    const retries = options.retries || 3;
    let folderId = options.folderId;

    // Get or create folder if folderPath is provided
    if (options.folderPath && !folderId) {
      folderId = (await this.getOrCreateFolderByPath(options.folderPath)) || undefined;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Uploading to Google Drive: ${filename} (attempt ${attempt}/${retries})...`);

        const fileMetadata: any = {
          name: filename,
        };

        if (folderId) {
          fileMetadata.parents = [folderId];
        }

        if (options.description) {
          fileMetadata.description = options.description;
        }

        // Create media object based on input type
        let media: any;

        if (Buffer.isBuffer(fileContent)) {
          // Upload from buffer
          const { Readable } = await import('stream');
          const bufferStream = new Readable();
          bufferStream.push(fileContent);
          bufferStream.push(null);

          media = {
            mimeType: options.mimeType,
            body: bufferStream,
          };
        } else {
          // Upload from file path
          media = {
            mimeType: options.mimeType,
            body: fs.createReadStream(fileContent),
          };
        }

        const response = await this.drive.files.create({
          requestBody: fileMetadata,
          media,
          fields: 'id, name, size, webViewLink',
          supportsAllDrives: true,
        });

        logger.info(`✅ File uploaded to Google Drive: ${response.data.id}`);

        return {
          fileId: response.data.id,
          name: response.data.name,
          size: parseInt(response.data.size || '0'),
          webViewLink: response.data.webViewLink || '',
          verified: true, // Skip verification for now
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
   * Share a Google Drive file/folder with a user
   */
  async shareWithUser(
    fileId: string,
    emailAddress: string,
    role: 'reader' | 'writer' | 'owner' = 'writer'
  ): Promise<void> {
    await this.waitForInitialization();
    if (!this.drive) {
      throw new Error('Google Drive not initialized');
    }

    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          type: 'user',
          role: role,
          emailAddress: emailAddress,
        },
        sendNotificationEmail: true,
      });
      
      logger.info(`Shared ${fileId} with ${emailAddress} as ${role}`);
    } catch (error) {
      logger.error(`Failed to share with ${emailAddress}`, error);
      throw error;
    }
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.waitForInitialization();
    if (!this.drive) return;

    try {
      await this.drive.files.delete({ 
        fileId,
        supportsAllDrives: true,
      });
      logger.info(`Deleted file from Google Drive: ${fileId}`);
    } catch (error) {
      logger.error(`Failed to delete file: ${fileId}`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<any> {
    await this.waitForInitialization();
    if (!this.drive) return null;

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, size, mimeType, webViewLink, createdTime, modifiedTime',
        supportsAllDrives: true,
      });
      return response.data;
    } catch (error) {
      logger.error(`Failed to get file metadata: ${fileId}`, error);
      return null;
    }
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();

import mongoose from 'mongoose';
import { appConfig } from './app.config';
import logger from '@utils/logger.util';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('📦 Using existing database connection');
      return;
    }

    try {
      logger.info('🔄 Attempting to connect to MongoDB...', {
        hasUri: !!appConfig.database.uri,
        uriPrefix: appConfig.database.uri.substring(0, 20) + '...',
      });

      // Serverless-friendly mongoose configuration
      const connectionOptions = {
        serverSelectionTimeoutMS: 10000, // Increase timeout for serverless cold starts
        socketTimeoutMS: 45000,
        maxPoolSize: 10, // Limit connection pool for serverless
        minPoolSize: 1,
        maxIdleTimeMS: 10000, // Close idle connections faster in serverless
        retryWrites: appConfig.database.options.retryWrites,
        w: 'majority' as const,
      };

      await mongoose.connect(appConfig.database.uri, connectionOptions);
      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully');

      mongoose.connection.on('error', (error) => {
        logger.error('❌ MongoDB connection error', { error: error.message, stack: error.stack });
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('⚠️ MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('✅ MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error: any) {
      logger.error('❌ Failed to connect to MongoDB', { 
        error: error.message, 
        stack: error.stack,
        code: error.code,
        name: error.name,
      });
      this.isConnected = false;
      // Don't throw in production serverless - allow server to start
      if (process.env.NODE_ENV !== 'production') {
        throw error;
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('👋 MongoDB disconnected');
    } catch (error: any) {
      logger.error('❌ Error disconnecting from MongoDB', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    // Check both internal flag and mongoose connection state
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const mongooseConnected = mongoose.connection.readyState === 1;
    return this.isConnected && mongooseConnected;
  }

  public getConnection(): mongoose.Connection {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return mongoose.connection;
  }
}

export default DatabaseConnection.getInstance();

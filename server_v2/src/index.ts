import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { appConfig, dbConnection } from '@core/configs';
import { errorHandler, requestLogger } from '@core/middlewares';
import { NotFoundError } from '@utils/errors.util';

// Import entity routes
import { alertRoutes } from '@feature/alerts';
import { userRoutes } from '@feature/users';
import { deviceRoutes } from '@feature/devices';
import { sensorReadingRoutes } from '@feature/sensorReadings';
import { reportRoutes } from '@feature/reports';

// Initialize Express app
const app: Application = express();

// Middleware
app.use(cors(appConfig.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbConnection.getConnectionStatus() ? 'connected' : 'disconnected',
  });
});

// API info route
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Water Quality Monitoring API v2',
    version: '2.0.0',
    environment: appConfig.server.nodeEnv,
  });
});

// API v1 routes
const API_V1 = '/api/v1';

app.use(`${API_V1}/alerts`, alertRoutes);
app.use(`${API_V1}/users`, userRoutes);
app.use(`${API_V1}/devices`, deviceRoutes);
app.use(`${API_V1}/sensor-readings`, sensorReadingRoutes);
app.use(`${API_V1}/reports`, reportRoutes);

// 404 handler - Must be after all routes
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('The requested resource does not exist'));
});

// Global error handler - Must be last
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await dbConnection.connect();

    // Start listening
    app.listen(appConfig.server.port, () => {
      console.log('='.repeat(50));
      console.log(`🚀 Server is running on port ${appConfig.server.port}`);
      console.log(`📊 Environment: ${appConfig.server.nodeEnv}`);
      console.log(`🔗 API Version: ${appConfig.server.apiVersion}`);
      console.log(`🌐 CORS Origin: ${appConfig.cors.origin}`);
      console.log('='.repeat(50));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  await dbConnection.disconnect();
  process.exit(0);
});

// Start the application
startServer();

export default app;

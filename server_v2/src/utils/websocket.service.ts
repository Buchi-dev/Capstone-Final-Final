/**
 * WebSocket Service - Real-Time Data Broadcasting
 * 
 * Provides real-time push notifications for:
 * - Sensor readings (pH, TDS, Turbidity)
 * - Device status changes (online/offline)
 * - Alert notifications
 * - Device heartbeats
 * 
 * Architecture:
 * - Uses Socket.IO for WebSocket management
 * - Integrates with MQTT service for immediate data push
 * - Room-based subscriptions per device
 * - JWT authentication on connection
 * 
 * @module utils/websocket.service
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import admin from 'firebase-admin';
import logger from '@utils/logger.util';
import type { ISensorReadingDocument } from '@feature/sensorReadings/sensorReading.types';
import type { IDeviceDocument } from '@feature/devices/device.types';
import type { IAlertDocument } from '@feature/alerts/alert.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userEmail?: string;
}

/**
 * WebSocket Event Types
 */
export const WS_EVENTS = {
  // Client → Server
  SUBSCRIBE_DEVICES: 'subscribe:devices',
  UNSUBSCRIBE_DEVICES: 'unsubscribe:devices',
  SUBSCRIBE_ALERTS: 'subscribe:alerts',
  UNSUBSCRIBE_ALERTS: 'unsubscribe:alerts',

  // Server → Client
  SENSOR_DATA: 'sensor:data',
  DEVICE_STATUS: 'device:status',
  DEVICE_HEARTBEAT: 'device:heartbeat',
  ALERT_NEW: 'alert:new',
  ALERT_RESOLVED: 'alert:resolved',
  CONNECTION_STATUS: 'connection:status',
  ERROR: 'error',
} as const;

/**
 * WebSocket Rooms
 */
const ROOMS = {
  ALL_DEVICES: 'devices:all',
  DEVICE: (deviceId: string) => `device:${deviceId}`,
  ALERTS: 'alerts:all',
  STAFF: 'role:staff',
  ADMIN: 'role:admin',
} as const;

/**
 * WebSocket Service Class
 */
class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, AuthenticatedSocket>();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      },
      transports: ['websocket', 'polling'], // WebSocket preferred, polling fallback
      pingTimeout: 60000, // 60 seconds
      pingInterval: 25000, // 25 seconds
    });

    this.setupConnectionHandlers();
    logger.info('✅ WebSocket: Server initialized');
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', async (socket: AuthenticatedSocket) => {
      try {
        // Authenticate client on connection
        await this.authenticateSocket(socket);

        logger.info('🔌 WebSocket: Client connected', {
          socketId: socket.id,
          userId: socket.userId,
          role: socket.userRole,
        });

        // Join role-based rooms
        this.joinRoleRooms(socket);

        // Setup event handlers
        this.setupClientHandlers(socket);

        // Send connection confirmation
        socket.emit(WS_EVENTS.CONNECTION_STATUS, {
          connected: true,
          timestamp: Date.now(),
        });

        // Track connection
        this.connectedClients.set(socket.id, socket);

        // Handle disconnection
        socket.on('disconnect', () => {
          logger.info('🔌 WebSocket: Client disconnected', {
            socketId: socket.id,
            userId: socket.userId,
          });
          this.connectedClients.delete(socket.id);
        });
      } catch (error: any) {
        logger.error('❌ WebSocket: Authentication failed', {
          error: error.message,
          socketId: socket.id,
        });
        socket.emit(WS_EVENTS.ERROR, {
          message: 'Authentication failed',
          code: 'AUTH_ERROR',
        });
        socket.disconnect();
      }
    });
  }

  /**
   * Authenticate socket connection using JWT token
   */
  private async authenticateSocket(socket: AuthenticatedSocket): Promise<void> {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token as string;

    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      // Verify Firebase JWT token
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Attach user info to socket
      socket.userId = decodedToken.uid;
      socket.userEmail = decodedToken.email;
      socket.userRole = decodedToken.role || 'staff'; // Default to staff if no role claim

      logger.info('✅ WebSocket: Authenticated', {
        userId: socket.userId,
        role: socket.userRole,
      });
    } catch (error: any) {
      logger.error('❌ WebSocket: Token verification failed', {
        error: error.message,
      });
      throw new Error('Invalid authentication token');
    }
  }

  /**
   * Join role-based rooms
   */
  private joinRoleRooms(socket: AuthenticatedSocket): void {
    if (socket.userRole === 'admin') {
      socket.join(ROOMS.ADMIN);
      socket.join(ROOMS.STAFF); // Admins also get staff data
    } else if (socket.userRole === 'staff') {
      socket.join(ROOMS.STAFF);
    }
  }

  /**
   * Setup client event handlers
   */
  private setupClientHandlers(socket: AuthenticatedSocket): void {
    // Subscribe to specific devices
    socket.on(WS_EVENTS.SUBSCRIBE_DEVICES, (deviceIds: string[]) => {
      if (!Array.isArray(deviceIds)) {
        socket.emit(WS_EVENTS.ERROR, {
          message: 'Invalid deviceIds format',
          code: 'INVALID_SUBSCRIBE',
        });
        return;
      }

      deviceIds.forEach((deviceId) => {
        socket.join(ROOMS.DEVICE(deviceId));
        logger.debug(`WebSocket: Subscribed to device ${deviceId}`, {
          socketId: socket.id,
          userId: socket.userId,
        });
      });

      socket.emit(WS_EVENTS.CONNECTION_STATUS, {
        subscribed: deviceIds,
        timestamp: Date.now(),
      });
    });

    // Unsubscribe from devices
    socket.on(WS_EVENTS.UNSUBSCRIBE_DEVICES, (deviceIds: string[]) => {
      if (!Array.isArray(deviceIds)) return;

      deviceIds.forEach((deviceId) => {
        socket.leave(ROOMS.DEVICE(deviceId));
      });
    });

    // Subscribe to alerts
    socket.on(WS_EVENTS.SUBSCRIBE_ALERTS, () => {
      socket.join(ROOMS.ALERTS);
      logger.debug('WebSocket: Subscribed to alerts', {
        socketId: socket.id,
        userId: socket.userId,
      });
    });

    // Unsubscribe from alerts
    socket.on(WS_EVENTS.UNSUBSCRIBE_ALERTS, () => {
      socket.leave(ROOMS.ALERTS);
    });
  }

  /**
   * Broadcast sensor data to subscribed clients
   * Called immediately when MQTT data arrives
   */
  broadcastSensorData(deviceId: string, sensorReading: ISensorReadingDocument): void {
    if (!this.io) {
      logger.warn('⚠️ WebSocket: Cannot broadcast, server not initialized');
      return;
    }

    const payload = {
      deviceId,
      data: {
        _id: sensorReading._id,
        pH: sensorReading.pH,
        tds: sensorReading.tds,
        turbidity: sensorReading.turbidity,
        pH_valid: sensorReading.pH_valid,
        tds_valid: sensorReading.tds_valid,
        turbidity_valid: sensorReading.turbidity_valid,
        timestamp: sensorReading.timestamp,
        createdAt: sensorReading.createdAt,
      },
      timestamp: Date.now(),
    };

    // Broadcast to device-specific room
    this.io.to(ROOMS.DEVICE(deviceId)).emit(WS_EVENTS.SENSOR_DATA, payload);

    // Also broadcast to staff/admin rooms
    this.io.to(ROOMS.STAFF).emit(WS_EVENTS.SENSOR_DATA, payload);

    logger.debug(`📡 WebSocket: Broadcasted sensor data for ${deviceId}`, {
      subscribers: this.io.sockets.adapter.rooms.get(ROOMS.DEVICE(deviceId))?.size || 0,
    });
  }

  /**
   * Broadcast device status change
   */
  broadcastDeviceStatus(deviceId: string, status: 'online' | 'offline', device?: IDeviceDocument): void {
    if (!this.io) return;

    const payload = {
      deviceId,
      status,
      timestamp: Date.now(),
      device: device ? {
        _id: device._id,
        name: device.name,
        lastSeen: device.lastSeen,
      } : undefined,
    };

    this.io.to(ROOMS.DEVICE(deviceId)).emit(WS_EVENTS.DEVICE_STATUS, payload);
    this.io.to(ROOMS.STAFF).emit(WS_EVENTS.DEVICE_STATUS, payload);

    logger.debug(`📡 WebSocket: Broadcasted device status for ${deviceId}: ${status}`);
  }

  /**
   * Broadcast device heartbeat
   */
  broadcastDeviceHeartbeat(deviceId: string, lastSeen: Date): void {
    if (!this.io) return;

    const payload = {
      deviceId,
      lastSeen,
      timestamp: Date.now(),
    };

    this.io.to(ROOMS.DEVICE(deviceId)).emit(WS_EVENTS.DEVICE_HEARTBEAT, payload);
  }

  /**
   * Broadcast new alert
   */
  broadcastNewAlert(alert: IAlertDocument): void {
    if (!this.io) return;

    const payload = {
      alert: {
        _id: alert._id,
        deviceId: alert.deviceId,
        deviceName: alert.deviceName,
        severity: alert.severity,
        parameter: alert.parameter,
        value: alert.value,
        threshold: alert.threshold,
        message: alert.message,
        timestamp: alert.timestamp,
        createdAt: alert.createdAt,
      },
      timestamp: Date.now(),
    };

    // Broadcast to alerts room
    this.io.to(ROOMS.ALERTS).emit(WS_EVENTS.ALERT_NEW, payload);

    // Also broadcast to device-specific room
    if (alert.deviceId) {
      this.io.to(ROOMS.DEVICE(alert.deviceId)).emit(WS_EVENTS.ALERT_NEW, payload);
    }

    // Broadcast to staff/admin
    this.io.to(ROOMS.STAFF).emit(WS_EVENTS.ALERT_NEW, payload);

    logger.info(`📡 WebSocket: Broadcasted new alert for ${alert.deviceId}`, {
      severity: alert.severity,
      parameter: alert.parameter,
    });
  }

  /**
   * Broadcast alert resolution
   */
  broadcastAlertResolved(alertId: string, deviceId: string): void {
    if (!this.io) return;

    const payload = {
      alertId,
      deviceId,
      timestamp: Date.now(),
    };

    this.io.to(ROOMS.ALERTS).emit(WS_EVENTS.ALERT_RESOLVED, payload);
    this.io.to(ROOMS.DEVICE(deviceId)).emit(WS_EVENTS.ALERT_RESOLVED, payload);
    this.io.to(ROOMS.STAFF).emit(WS_EVENTS.ALERT_RESOLVED, payload);

    logger.debug(`📡 WebSocket: Broadcasted alert resolution for ${deviceId}`);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    roomsCount: number;
    rooms: string[];
  } {
    if (!this.io) {
      return { totalConnections: 0, roomsCount: 0, rooms: [] };
    }

    const rooms = Array.from(this.io.sockets.adapter.rooms.keys());

    return {
      totalConnections: this.connectedClients.size,
      roomsCount: rooms.length,
      rooms,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (!this.io) return;

    logger.info('🔌 WebSocket: Shutting down...');

    // Notify all clients
    this.io.emit(WS_EVENTS.CONNECTION_STATUS, {
      connected: false,
      message: 'Server shutting down',
    });

    // Close all connections
    await this.io.close();
    this.connectedClients.clear();

    logger.info('✅ WebSocket: Shutdown complete');
  }
}

export const websocketService = new WebSocketService();
export default websocketService;

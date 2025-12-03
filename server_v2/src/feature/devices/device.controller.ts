/**
 * Device Controller
 * HTTP request handlers for device management endpoints
 */

import { Request, Response } from 'express';
import deviceService from './device.service';
import { ResponseHandler } from '@utils/response.util';
import { asyncHandler } from '@utils/asyncHandler.util';
import { SUCCESS_MESSAGES } from '@core/configs/messages.config';

/**
 * Get all devices with filters
 * @route GET /api/v1/devices
 */
export const getAllDevices = asyncHandler(async (req: Request, res: Response) => {
  const {
    status,
    registrationStatus,
    isRegistered,
    search,
    page = 1,
    limit = 50,
  } = req.query;

  const filters = {
    ...(status && { status: status as any }),
    ...(registrationStatus && { registrationStatus: registrationStatus as any }),
    ...(isRegistered !== undefined && { isRegistered: isRegistered === 'true' }),
    ...(search && { search: search as string }),
  };

  const result = await deviceService.getAllDevices(filters, Number(page), Number(limit));

  const devicesData = result.data.map((device) => device.toPublicProfile());

  ResponseHandler.paginated(res, devicesData, result.pagination);
});

/**
 * Get device by ID
 * @route GET /api/v1/devices/:id
 */
export const getDeviceById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  const device = await deviceService.getDeviceById(id);

  ResponseHandler.success(res, device.toPublicProfile());
});

/**
 * Register new device
 * @route POST /api/v1/devices/register
 */
export const registerDevice = asyncHandler(async (req: Request, res: Response) => {
  const deviceData = req.body;

  const newDevice = await deviceService.registerDevice(deviceData);

  ResponseHandler.created(res, newDevice.toPublicProfile(), SUCCESS_MESSAGES.DEVICE.REGISTERED);
});

/**
 * Approve device registration
 * @route PATCH /api/v1/devices/:deviceId/approve
 */
export const approveDeviceRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const device = await deviceService.approveDeviceRegistration(deviceId);

  ResponseHandler.success(
    res,
    device.toPublicProfile(),
    'Device registration approved successfully'
  );
});

/**
 * Update device
 * @route PATCH /api/v1/devices/:id
 */
export const updateDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  const updateData = req.body;

  const updatedDevice = await deviceService.updateDevice(id, updateData);

  ResponseHandler.success(res, updatedDevice.toPublicProfile(), SUCCESS_MESSAGES.DEVICE.UPDATED);
});

/**
 * Update device status
 * @route PATCH /api/v1/devices/:deviceId/status
 */
export const updateDeviceStatus = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { status } = req.body;

  const updatedDevice = await deviceService.updateDeviceStatus(deviceId, status);

  ResponseHandler.success(
    res,
    updatedDevice.toPublicProfile(),
    SUCCESS_MESSAGES.DEVICE.STATUS_UPDATED
  );
});

/**
 * Delete device
 * @route DELETE /api/v1/devices/:id
 */
export const deleteDevice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    throw new Error('Device ID is required');
  }

  await deviceService.deleteDevice(id);

  ResponseHandler.success(res, null, SUCCESS_MESSAGES.DEVICE.DELETED);
});

/**
 * Get device statistics
 * @route GET /api/v1/devices/statistics
 */
export const getDeviceStatistics = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await deviceService.getDeviceStatistics();

  ResponseHandler.success(res, stats);
});

/**
 * Get pending registrations
 * @route GET /api/v1/devices/pending
 */
export const getPendingRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;

  const result = await deviceService.getPendingRegistrations(Number(page), Number(limit));

  const devicesData = result.data.map((device) => device.toPublicProfile());

  ResponseHandler.paginated(res, devicesData, result.pagination);
});

/**
 * Get online devices
 * @route GET /api/v1/devices/online
 */
export const getOnlineDevices = asyncHandler(async (_req: Request, res: Response) => {
  const devices = await deviceService.getOnlineDevices();

  const devicesData = devices.map((device: any) => device);

  ResponseHandler.success(res, devicesData);
});

/**
 * Send command to device
 * @route POST /api/v1/devices/:deviceId/command
 */
export const sendCommand = asyncHandler(async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    throw new Error('Device ID is required');
  }

  const { command, payload } = req.body;

  await deviceService.sendCommand(deviceId, command, payload);

  ResponseHandler.success(res, null, SUCCESS_MESSAGES.DEVICE.COMMAND_SENT);
});

/**
 * Check offline devices
 * @route POST /api/v1/devices/check-offline
 */
export const checkOfflineDevices = asyncHandler(async (_req: Request, res: Response) => {
  const count = await deviceService.checkOfflineDevices();

  ResponseHandler.success(res, { devicesMarkedOffline: count });
});

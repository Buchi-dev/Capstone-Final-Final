/**
 * Device Routes
 * API endpoints for device management
 */

import { Router } from 'express';
import {
  getAllDevices,
  getDeviceById,
  registerDevice,
  approveDeviceRegistration,
  updateDevice,
  updateDeviceStatus,
  deleteDevice,
  getDeviceStatistics,
  getPendingRegistrations,
  getOnlineDevices,
  sendCommand,
  checkOfflineDevices,
} from './device.controller';
import { validateRequest } from '@core/middlewares/validation.middleware';
import {
  registerDeviceSchema,
  updateDeviceSchema,
  approveDeviceSchema,
  updateDeviceStatusSchema,
  sendCommandSchema,
  getDeviceByIdSchema,
  deleteDeviceSchema,
} from './device.schema';

const router = Router();

/**
 * @route   GET /api/v1/devices/statistics
 * @desc    Get device statistics (must be before /:id)
 * @access  Protected (Admin only)
 */
router.get('/statistics', getDeviceStatistics);

/**
 * @route   GET /api/v1/devices/pending
 * @desc    Get pending device registrations
 * @access  Protected (Admin only)
 */
router.get('/pending', getPendingRegistrations);

/**
 * @route   GET /api/v1/devices/online
 * @desc    Get online devices
 * @access  Protected (Staff/Admin)
 */
router.get('/online', getOnlineDevices);

/**
 * @route   POST /api/v1/devices/check-offline
 * @desc    Check and mark offline devices
 * @access  Protected (Admin only)
 */
router.post('/check-offline', checkOfflineDevices);

/**
 * @route   GET /api/v1/devices
 * @desc    Get all devices with filters and pagination
 * @access  Protected (Staff/Admin)
 */
router.get('/', getAllDevices);

/**
 * @route   POST /api/v1/devices/register
 * @desc    Register new device
 * @access  Public (for device registration) or Protected (Admin)
 */
router.post('/register', validateRequest(registerDeviceSchema), registerDevice);

/**
 * @route   GET /api/v1/devices/:id
 * @desc    Get device by ID
 * @access  Protected (Staff/Admin)
 */
router.get('/:id', validateRequest(getDeviceByIdSchema), getDeviceById);

/**
 * @route   PATCH /api/v1/devices/:id
 * @desc    Update device
 * @access  Protected (Admin only)
 */
router.patch('/:id', validateRequest(updateDeviceSchema), updateDevice);

/**
 * @route   PATCH /api/v1/devices/:deviceId/approve
 * @desc    Approve device registration
 * @access  Protected (Admin only)
 */
router.patch('/:deviceId/approve', validateRequest(approveDeviceSchema), approveDeviceRegistration);

/**
 * @route   PATCH /api/v1/devices/:deviceId/status
 * @desc    Update device status
 * @access  Protected (Admin only)
 */
router.patch('/:deviceId/status', validateRequest(updateDeviceStatusSchema), updateDeviceStatus);

/**
 * @route   POST /api/v1/devices/:deviceId/command
 * @desc    Send command to device
 * @access  Protected (Admin only)
 */
router.post('/:deviceId/command', validateRequest(sendCommandSchema), sendCommand);

/**
 * @route   DELETE /api/v1/devices/:id
 * @desc    Delete device
 * @access  Protected (Admin only)
 */
router.delete('/:id', validateRequest(deleteDeviceSchema), deleteDevice);

export default router;

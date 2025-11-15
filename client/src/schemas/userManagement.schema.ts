/**
 * User Management Schemas
 * Zod schemas for user management data validation
 * 
 * @module schemas/userManagement
 */

import { z } from 'zod';

// ============================================================================
// ENUMS (imported from contexts, defined here for schema validation)
// ============================================================================

/**
 * User Status Schema
 */
export const UserStatusSchema = z.enum(['Pending', 'Approved', 'Suspended']);

/**
 * User Role Schema
 */
export const UserRoleSchema = z.enum(['Admin', 'Staff']);

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

/**
 * User List Data Schema
 * Represents user data in list operations
 */
export const UserListDataSchema = z.object({
  id: z.string(),
  uuid: z.string(),
  email: z.string().email(),
  firstname: z.string(),
  middlename: z.string(),
  lastname: z.string(),
  phoneNumber: z.string(),
  department: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date().optional(),
  lastLogin: z.date().optional(),
});

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Update User Status Request Schema
 */
export const UpdateUserStatusRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: UserStatusSchema,
});

/**
 * Update User Request Schema
 */
export const UpdateUserRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  status: UserStatusSchema.optional(),
  role: UserRoleSchema.optional(),
});

/**
 * Update User Profile Request Schema
 */
export const UpdateUserProfileRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  firstname: z.string().min(1, 'First name is required').optional(),
  middlename: z.string().optional(),
  lastname: z.string().min(1, 'Last name is required').optional(),
  department: z.string().min(1, 'Department is required').optional(),
  phoneNumber: z.string().regex(/^\d{11}$/, 'Phone number must be exactly 11 digits'),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Update Status Response Schema
 */
export const UpdateStatusResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  status: UserStatusSchema,
});

/**
 * Update User Response Schema
 */
export const UpdateUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  updates: z.object({
    status: UserStatusSchema.optional(),
    role: UserRoleSchema.optional(),
  }),
});

/**
 * Update User Profile Response Schema
 */
export const UpdateUserProfileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  userId: z.string(),
  updates: z.object({
    firstname: z.string().optional(),
    middlename: z.string().optional(),
    lastname: z.string().optional(),
    department: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});

/**
 * List Users Response Schema
 */
export const ListUsersResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(UserListDataSchema),
  count: z.number(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UserStatus = z.infer<typeof UserStatusSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserListData = z.infer<typeof UserListDataSchema>;
export type UpdateUserStatusRequest = z.infer<typeof UpdateUserStatusRequestSchema>;
export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileRequestSchema>;
export type UpdateStatusResponse = z.infer<typeof UpdateStatusResponseSchema>;
export type UpdateUserResponse = z.infer<typeof UpdateUserResponseSchema>;
export type UpdateUserProfileResponse = z.infer<typeof UpdateUserProfileResponseSchema>;
export type ListUsersResponse = z.infer<typeof ListUsersResponseSchema>;

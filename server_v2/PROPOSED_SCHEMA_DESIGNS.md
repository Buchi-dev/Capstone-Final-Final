# PROPOSED SCHEMA DESIGNS
## Complete TypeScript/Mongoose Implementations for DSS Data Infrastructure

**Purpose:** Ready-to-implement schema definitions for new collections required by the DSS system.

---

## TABLE OF CONTENTS
1. [Maintenance Logs Collection](#1-maintenance-logs-collection)
2. [Device Runtime Collection](#2-device-runtime-collection)
3. [Filter Inventory Collection](#3-filter-inventory-collection)
4. [Device Schema Enhancements](#4-device-schema-enhancements)
5. [Migration Scripts](#5-migration-scripts)
6. [API Endpoint Specifications](#6-api-endpoint-specifications)

---

## 1. MAINTENANCE LOGS COLLECTION

### 1.1 Types Definition (`maintenanceLog.types.ts`)

```typescript
/**
 * Maintenance Log Types
 * TypeScript interfaces for maintenance tracking
 */

import { Types, Document } from 'mongoose';

/**
 * Maintenance type enum
 */
export enum MaintenanceType {
  FILTER_CHANGE = 'filter_change',
  SENSOR_CALIBRATION = 'sensor_calibration',
  CLEANING = 'cleaning',
  REPAIR = 'repair',
  INSPECTION = 'inspection',
  PREVENTIVE_MAINTENANCE = 'preventive_maintenance',
}

/**
 * Filter change reason enum
 */
export enum FilterChangeReason {
  SCHEDULED = 'scheduled',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  CLOGGED = 'clogged',
  DAMAGED = 'damaged',
  EXPIRED = 'expired',
  UPGRADE = 'upgrade',
}

/**
 * Attachment type enum
 */
export enum AttachmentType {
  PHOTO = 'photo',
  DOCUMENT = 'document',
  INVOICE = 'invoice',
}

/**
 * Filter change details interface
 */
export interface IFilterChangeDetails {
  oldFilterType: string;
  newFilterType: string;
  oldFilterId: string; // Serial number
  newFilterId: string; // Serial number
  changeReason: FilterChangeReason;
  replacedComponents: string[];
}

/**
 * Device state at maintenance time
 */
export interface IDeviceState {
  operatingHours: number;
  operatingHoursSinceLastChange: number;
  waterProcessedLiters?: number;
  waterProcessedSinceLastChange?: number;
}

/**
 * Pre-maintenance performance metrics
 */
export interface IPreMaintenanceMetrics {
  avgPH_7days?: number;
  avgTurbidity_7days?: number;
  avgTDS_7days?: number;
  alertCount_30days?: number;
  pressureDrop?: number;
  flowRate?: number;
}

/**
 * Maintenance attachment
 */
export interface IMaintenanceAttachment {
  filename: string;
  fileId: Types.ObjectId;
  type: AttachmentType;
}

/**
 * Next maintenance prediction (populated by DSS)
 */
export interface INextMaintenancePrediction {
  predictedDate: Date;
  predictedOperatingHours: number;
  confidence: number; // 0-1
  modelVersion: string;
  generatedAt: Date;
}

/**
 * Base maintenance log interface
 */
export interface IMaintenanceLog {
  _id: Types.ObjectId;
  logId: string;
  deviceId: string;
  maintenanceType: MaintenanceType;
  filterChangeDetails?: IFilterChangeDetails;
  deviceState: IDeviceState;
  preMaintenanceMetrics?: IPreMaintenanceMetrics;
  performedBy: Types.ObjectId;
  performedAt: Date;
  scheduledDate?: Date;
  duration?: number; // minutes
  cost?: number;
  notes?: string;
  attachments?: IMaintenanceAttachment[];
  nextMaintenancePrediction?: INextMaintenancePrediction;
  // Soft delete
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maintenance log document interface
 */
export interface IMaintenanceLogDocument extends IMaintenanceLog, Document {
  toPublicProfile(): IMaintenanceLogPublic;
}

/**
 * Public maintenance log data
 */
export interface IMaintenanceLogPublic extends Omit<IMaintenanceLog, 'performedBy'> {
  performedBy: Types.ObjectId | {
    _id: Types.ObjectId;
    displayName: string;
    email: string;
  };
}

/**
 * Create maintenance log data
 */
export interface ICreateMaintenanceLogData {
  deviceId: string;
  maintenanceType: MaintenanceType;
  filterChangeDetails?: IFilterChangeDetails;
  deviceState: IDeviceState;
  preMaintenanceMetrics?: IPreMaintenanceMetrics;
  performedBy: Types.ObjectId;
  performedAt: Date;
  scheduledDate?: Date;
  duration?: number;
  cost?: number;
  notes?: string;
  attachments?: IMaintenanceAttachment[];
}

/**
 * Maintenance log query filters
 */
export interface IMaintenanceLogFilters {
  deviceId?: string;
  maintenanceType?: MaintenanceType;
  performedBy?: Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
}
```

### 1.2 Model Definition (`maintenanceLog.model.ts`)

```typescript
/**
 * Maintenance Log Model
 * Mongoose schema for maintenance tracking and DSS training data
 */

import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  IMaintenanceLogDocument,
  IMaintenanceLogPublic,
  MaintenanceType,
  FilterChangeReason,
  AttachmentType,
} from './maintenanceLog.types';
import { COLLECTIONS } from '@core/configs/constants.config';

/**
 * Maintenance Log Schema
 */
const maintenanceLogSchema = new Schema<IMaintenanceLogDocument>(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `MNT-${uuidv4()}`,
    },
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    maintenanceType: {
      type: String,
      enum: Object.values(MaintenanceType),
      required: true,
      index: true,
    },
    filterChangeDetails: {
      oldFilterType: {
        type: String,
        required: function(this: IMaintenanceLogDocument) {
          return this.maintenanceType === MaintenanceType.FILTER_CHANGE;
        },
      },
      newFilterType: {
        type: String,
        required: function(this: IMaintenanceLogDocument) {
          return this.maintenanceType === MaintenanceType.FILTER_CHANGE;
        },
      },
      oldFilterId: {
        type: String,
        required: function(this: IMaintenanceLogDocument) {
          return this.maintenanceType === MaintenanceType.FILTER_CHANGE;
        },
      },
      newFilterId: {
        type: String,
        required: function(this: IMaintenanceLogDocument) {
          return this.maintenanceType === MaintenanceType.FILTER_CHANGE;
        },
      },
      changeReason: {
        type: String,
        enum: Object.values(FilterChangeReason),
        required: function(this: IMaintenanceLogDocument) {
          return this.maintenanceType === MaintenanceType.FILTER_CHANGE;
        },
      },
      replacedComponents: {
        type: [String],
        default: [],
      },
    },
    deviceState: {
      operatingHours: {
        type: Number,
        required: true,
        min: 0,
      },
      operatingHoursSinceLastChange: {
        type: Number,
        required: true,
        min: 0,
      },
      waterProcessedLiters: {
        type: Number,
        min: 0,
      },
      waterProcessedSinceLastChange: {
        type: Number,
        min: 0,
      },
    },
    preMaintenanceMetrics: {
      avgPH_7days: {
        type: Number,
        min: 0,
        max: 14,
      },
      avgTurbidity_7days: {
        type: Number,
        min: 0,
      },
      avgTDS_7days: {
        type: Number,
        min: 0,
      },
      alertCount_30days: {
        type: Number,
        min: 0,
      },
      pressureDrop: {
        type: Number,
      },
      flowRate: {
        type: Number,
      },
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.USERS,
      required: true,
      index: true,
    },
    performedAt: {
      type: Date,
      required: true,
      index: true,
    },
    scheduledDate: {
      type: Date,
    },
    duration: {
      type: Number,
      min: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        fileId: {
          type: Schema.Types.ObjectId,
          required: true,
        },
        type: {
          type: String,
          enum: Object.values(AttachmentType),
          required: true,
        },
      },
    ],
    nextMaintenancePrediction: {
      predictedDate: {
        type: Date,
      },
      predictedOperatingHours: {
        type: Number,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      modelVersion: {
        type: String,
      },
      generatedAt: {
        type: Date,
      },
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: COLLECTIONS.USERS,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'maintenance_logs',
  }
);

/**
 * Compound indexes for optimized queries
 */
maintenanceLogSchema.index({ deviceId: 1, performedAt: -1 });
maintenanceLogSchema.index({ maintenanceType: 1, performedAt: -1 });
maintenanceLogSchema.index({ deviceId: 1, maintenanceType: 1, performedAt: -1 });
maintenanceLogSchema.index({ deviceId: 1, 'filterChangeDetails.changeReason': 1 });
maintenanceLogSchema.index({ 'deviceState.operatingHours': 1 });
maintenanceLogSchema.index({ 'nextMaintenancePrediction.predictedDate': 1 });

/**
 * Instance method to get public maintenance log data
 */
maintenanceLogSchema.methods.toPublicProfile = function (
  this: IMaintenanceLogDocument
): IMaintenanceLogPublic {
  return {
    _id: this._id,
    logId: this.logId,
    deviceId: this.deviceId,
    maintenanceType: this.maintenanceType,
    filterChangeDetails: this.filterChangeDetails,
    deviceState: this.deviceState,
    preMaintenanceMetrics: this.preMaintenanceMetrics,
    performedBy: this.performedBy,
    performedAt: this.performedAt,
    scheduledDate: this.scheduledDate,
    duration: this.duration,
    cost: this.cost,
    notes: this.notes,
    attachments: this.attachments,
    nextMaintenancePrediction: this.nextMaintenancePrediction,
    isDeleted: this.isDeleted,
    deletedAt: this.deletedAt,
    deletedBy: this.deletedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Maintenance Log Model
 */
const MaintenanceLog: Model<IMaintenanceLogDocument> = mongoose.model<IMaintenanceLogDocument>(
  'MaintenanceLog',
  maintenanceLogSchema
);

export default MaintenanceLog;
```

### 1.3 Validation Schema (`maintenanceLog.schema.ts`)

```typescript
/**
 * Maintenance Log Validation Schemas
 * Zod schemas for runtime validation
 */

import { z } from 'zod';
import { MaintenanceType, FilterChangeReason, AttachmentType } from './maintenanceLog.types';

/**
 * Create maintenance log schema
 */
export const createMaintenanceLogSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1, 'Device ID is required'),
    maintenanceType: z.nativeEnum(MaintenanceType),
    filterChangeDetails: z
      .object({
        oldFilterType: z.string().min(1),
        newFilterType: z.string().min(1),
        oldFilterId: z.string().min(1),
        newFilterId: z.string().min(1),
        changeReason: z.nativeEnum(FilterChangeReason),
        replacedComponents: z.array(z.string()).optional(),
      })
      .optional(),
    deviceState: z.object({
      operatingHours: z.number().min(0, 'Operating hours must be non-negative'),
      operatingHoursSinceLastChange: z.number().min(0),
      waterProcessedLiters: z.number().min(0).optional(),
      waterProcessedSinceLastChange: z.number().min(0).optional(),
    }),
    preMaintenanceMetrics: z
      .object({
        avgPH_7days: z.number().min(0).max(14).optional(),
        avgTurbidity_7days: z.number().min(0).optional(),
        avgTDS_7days: z.number().min(0).optional(),
        alertCount_30days: z.number().int().min(0).optional(),
        pressureDrop: z.number().optional(),
        flowRate: z.number().optional(),
      })
      .optional(),
    performedAt: z.union([z.string().datetime(), z.date()]),
    scheduledDate: z.union([z.string().datetime(), z.date()]).optional(),
    duration: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          fileId: z.string(),
          type: z.nativeEnum(AttachmentType),
        })
      )
      .optional(),
  }),
});

/**
 * Query filters schema
 */
export const maintenanceLogFiltersSchema = z.object({
  query: z.object({
    deviceId: z.string().optional(),
    maintenanceType: z.nativeEnum(MaintenanceType).optional(),
    performedBy: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
    limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional(),
  }),
});

/**
 * Get maintenance log by ID schema
 */
export const getMaintenanceLogByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Maintenance log ID is required'),
  }),
});

/**
 * Update maintenance log schema
 */
export const updateMaintenanceLogSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Maintenance log ID is required'),
  }),
  body: z.object({
    notes: z.string().max(2000).optional(),
    duration: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),
  }),
});

/**
 * Delete maintenance log schema
 */
export const deleteMaintenanceLogSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Maintenance log ID is required'),
  }),
});

// Export inferred types
export type CreateMaintenanceLogInput = z.infer<typeof createMaintenanceLogSchema>['body'];
export type MaintenanceLogFilters = z.infer<typeof maintenanceLogFiltersSchema>['query'];
export type GetMaintenanceLogByIdParams = z.infer<typeof getMaintenanceLogByIdSchema>['params'];
export type UpdateMaintenanceLogInput = z.infer<typeof updateMaintenanceLogSchema>;
export type DeleteMaintenanceLogParams = z.infer<typeof deleteMaintenanceLogSchema>['params'];
```

---

## 2. DEVICE RUNTIME COLLECTION

### 2.1 Types Definition (`deviceRuntime.types.ts`)

```typescript
/**
 * Device Runtime Types
 * TypeScript interfaces for device operational metrics tracking
 */

import { Types, Document } from 'mongoose';

/**
 * Hourly snapshot interface
 */
export interface IHourlySnapshot {
  hour: number; // 0-23
  operatingMinutes: number; // 0-60
  waterProcessed?: number;
  avgPH?: number;
  avgTurbidity?: number;
  avgTDS?: number;
  alertsTriggered: number;
}

/**
 * Base device runtime interface
 */
export interface IDeviceRuntime {
  _id: Types.ObjectId;
  deviceId: string;
  // Cumulative metrics
  totalOperatingHours: number;
  totalWaterProcessed: number;
  totalPowerOnCycles: number;
  // Daily aggregates
  date: Date;
  operatingHoursToday: number;
  waterProcessedToday: number;
  uptimePercentage: number; // 0-100
  // Hourly snapshots
  hourlySnapshots: IHourlySnapshot[];
  // Session tracking
  lastPowerOn?: Date;
  lastPowerOff?: Date;
  currentSessionHours: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Device runtime document interface
 */
export interface IDeviceRuntimeDocument extends IDeviceRuntime, Document {}

/**
 * Create device runtime data
 */
export interface ICreateDeviceRuntimeData {
  deviceId: string;
  totalOperatingHours: number;
  totalWaterProcessed: number;
  totalPowerOnCycles: number;
  date: Date;
  operatingHoursToday: number;
  waterProcessedToday: number;
  uptimePercentage: number;
  hourlySnapshots?: IHourlySnapshot[];
}

/**
 * Device runtime query filters
 */
export interface IDeviceRuntimeFilters {
  deviceId?: string;
  startDate?: Date;
  endDate?: Date;
}
```

### 2.2 Model Definition (`deviceRuntime.model.ts`)

```typescript
/**
 * Device Runtime Model
 * Mongoose schema for tracking device operational hours and usage metrics
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IDeviceRuntimeDocument } from './deviceRuntime.types';

/**
 * Device Runtime Schema
 */
const deviceRuntimeSchema = new Schema<IDeviceRuntimeDocument>(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },
    // Cumulative metrics
    totalOperatingHours: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWaterProcessed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalPowerOnCycles: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Daily aggregates
    date: {
      type: Date,
      required: true,
      index: true,
    },
    operatingHoursToday: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 24,
    },
    waterProcessedToday: {
      type: Number,
      default: 0,
      min: 0,
    },
    uptimePercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    // Hourly snapshots
    hourlySnapshots: [
      {
        hour: {
          type: Number,
          required: true,
          min: 0,
          max: 23,
        },
        operatingMinutes: {
          type: Number,
          required: true,
          min: 0,
          max: 60,
        },
        waterProcessed: {
          type: Number,
          min: 0,
        },
        avgPH: {
          type: Number,
          min: 0,
          max: 14,
        },
        avgTurbidity: {
          type: Number,
          min: 0,
        },
        avgTDS: {
          type: Number,
          min: 0,
        },
        alertsTriggered: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],
    // Session tracking
    lastPowerOn: {
      type: Date,
    },
    lastPowerOff: {
      type: Date,
    },
    currentSessionHours: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'device_runtime',
  }
);

/**
 * Compound indexes
 */
deviceRuntimeSchema.index({ deviceId: 1, date: -1 }); // Primary query
deviceRuntimeSchema.index({ date: 1 }); // Time-series queries
deviceRuntimeSchema.index({ deviceId: 1, 'hourlySnapshots.hour': 1 }); // Detailed analysis

/**
 * TTL index: Auto-delete records older than 2 years
 */
deviceRuntimeSchema.index(
  { date: 1 },
  { expireAfterSeconds: 730 * 24 * 60 * 60 } // 2 years
);

/**
 * Device Runtime Model
 */
const DeviceRuntime: Model<IDeviceRuntimeDocument> = mongoose.model<IDeviceRuntimeDocument>(
  'DeviceRuntime',
  deviceRuntimeSchema
);

export default DeviceRuntime;
```

---

## 3. FILTER INVENTORY COLLECTION

### 3.1 Types Definition (`filterInventory.types.ts`)

```typescript
/**
 * Filter Inventory Types
 * TypeScript interfaces for filter catalog management
 */

import { Types, Document } from 'mongoose';

/**
 * Filter specifications interface
 */
export interface IFilterSpecifications {
  expectedLifespanHours: number;
  expectedCapacityLiters: number;
  maxPressureDrop?: number;
  maxFlowRate?: number;
  filterationEfficiency?: number; // percentage
  micronRating?: number;
}

/**
 * Historical performance metrics
 */
export interface IHistoricalMetrics {
  avgActualLifespanHours?: number;
  avgReplacementReason?: string;
  totalReplacements: number;
  performanceRating?: number; // 1-5 stars
}

/**
 * Base filter inventory interface
 */
export interface IFilterInventory {
  _id: Types.ObjectId;
  filterType: string; // Unique identifier
  manufacturer: string;
  modelNumber: string;
  specifications: IFilterSpecifications;
  compatibleDevices: string[];
  currentStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  costPerUnit: number;
  historicalMetrics: IHistoricalMetrics;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter inventory document interface
 */
export interface IFilterInventoryDocument extends IFilterInventory, Document {}

/**
 * Create filter inventory data
 */
export interface ICreateFilterInventoryData {
  filterType: string;
  manufacturer: string;
  modelNumber: string;
  specifications: IFilterSpecifications;
  compatibleDevices?: string[];
  currentStock?: number;
  reorderPoint?: number;
  leadTimeDays?: number;
  costPerUnit?: number;
}
```

### 3.2 Model Definition (`filterInventory.model.ts`)

```typescript
/**
 * Filter Inventory Model
 * Mongoose schema for filter catalog and specifications
 */

import mongoose, { Schema, Model } from 'mongoose';
import { IFilterInventoryDocument } from './filterInventory.types';

/**
 * Filter Inventory Schema
 */
const filterInventorySchema = new Schema<IFilterInventoryDocument>(
  {
    filterType: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    manufacturer: {
      type: String,
      required: true,
    },
    modelNumber: {
      type: String,
      required: true,
    },
    specifications: {
      expectedLifespanHours: {
        type: Number,
        required: true,
        min: 0,
      },
      expectedCapacityLiters: {
        type: Number,
        required: true,
        min: 0,
      },
      maxPressureDrop: {
        type: Number,
        min: 0,
      },
      maxFlowRate: {
        type: Number,
        min: 0,
      },
      filterationEfficiency: {
        type: Number,
        min: 0,
        max: 100,
      },
      micronRating: {
        type: Number,
        min: 0,
      },
    },
    compatibleDevices: {
      type: [String],
      default: [],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderPoint: {
      type: Number,
      default: 5,
      min: 0,
    },
    leadTimeDays: {
      type: Number,
      default: 14,
      min: 0,
    },
    costPerUnit: {
      type: Number,
      default: 0,
      min: 0,
    },
    historicalMetrics: {
      avgActualLifespanHours: {
        type: Number,
        min: 0,
      },
      avgReplacementReason: {
        type: String,
      },
      totalReplacements: {
        type: Number,
        default: 0,
        min: 0,
      },
      performanceRating: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
  },
  {
    timestamps: true,
    collection: 'filter_inventory',
  }
);

/**
 * Indexes
 */
filterInventorySchema.index({ filterType: 1 });
filterInventorySchema.index({ manufacturer: 1 });
filterInventorySchema.index({ compatibleDevices: 1 });

/**
 * Filter Inventory Model
 */
const FilterInventory: Model<IFilterInventoryDocument> = mongoose.model<IFilterInventoryDocument>(
  'FilterInventory',
  filterInventorySchema
);

export default FilterInventory;
```

---

## 4. DEVICE SCHEMA ENHANCEMENTS

### 4.1 Enhanced Device Types (Add to existing `device.types.ts`)

```typescript
/**
 * ADD THESE INTERFACES TO EXISTING device.types.ts
 */

/**
 * Maintenance history summary
 */
export interface IMaintenanceHistory {
  totalFilterChanges: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  avgDaysBetweenChanges?: number;
}

/**
 * DSS prediction metadata
 */
export interface IDSSMetadata {
  filterHealthScore: number; // 0-100
  predictedDaysUntilChange: number;
  predictionConfidence: number; // 0-1
  predictionGeneratedAt: Date;
  modelVersion: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * EXTEND IDevice interface with these new fields:
 */
export interface IDeviceEnhanced extends IDevice {
  // Filter tracking
  currentFilterType?: string;
  currentFilterId?: string;
  lastFilterChange?: Date;
  filterInstallDate?: Date;
  nextScheduledFilterChange?: Date;
  
  // Operational metrics
  installationDate?: Date;
  commissioningDate?: Date;
  totalOperatingHours?: number;
  totalWaterProcessed?: number;
  operatingHoursSinceLastFilterChange?: number;
  waterProcessedSinceLastFilterChange?: number;
  
  // Maintenance history
  maintenanceHistory?: IMaintenanceHistory;
  
  // DSS predictions
  dssMetadata?: IDSSMetadata;
}
```

### 4.2 Migration Script for Device Schema

```typescript
/**
 * Migration Script: Add DSS-Required Fields to Devices
 * Run this ONCE to add new fields to existing devices collection
 * 
 * Usage: ts-node migrations/add-dss-fields-to-devices.ts
 */

import mongoose from 'mongoose';
import Device from '../feature/devices/device.model';
import { appConfig } from '../core/configs/app.config';

async function migrateDeviceSchema() {
  try {
    await mongoose.connect(appConfig.database.uri);
    console.log('Connected to MongoDB');

    // Add new fields to all devices
    const result = await Device.updateMany(
      {}, // All devices
      {
        $set: {
          // Filter tracking
          currentFilterType: null,
          currentFilterId: null,
          lastFilterChange: null,
          filterInstallDate: null,
          nextScheduledFilterChange: null,
          
          // Operational metrics
          installationDate: null,
          commissioningDate: null,
          totalOperatingHours: 0,
          totalWaterProcessed: 0,
          operatingHoursSinceLastFilterChange: 0,
          waterProcessedSinceLastFilterChange: 0,
          
          // Maintenance history
          maintenanceHistory: {
            totalFilterChanges: 0,
            lastMaintenanceDate: null,
            nextMaintenanceDate: null,
            avgDaysBetweenChanges: null,
          },
          
          // DSS metadata
          dssMetadata: null,
        },
      }
    );

    console.log(`✅ Migration complete: ${result.modifiedCount} devices updated`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDeviceSchema();
```

---

## 5. MIGRATION SCRIPTS

### 5.1 Create Collections Script

```typescript
/**
 * Create New Collections for DSS
 * Run this to initialize maintenance_logs, device_runtime, and filter_inventory
 * 
 * Usage: ts-node migrations/create-dss-collections.ts
 */

import mongoose from 'mongoose';
import { appConfig } from '../core/configs/app.config';
import MaintenanceLog from '../feature/maintenanceLogs/maintenanceLog.model';
import DeviceRuntime from '../feature/deviceRuntime/deviceRuntime.model';
import FilterInventory from '../feature/filterInventory/filterInventory.model';

async function createDSSCollections() {
  try {
    await mongoose.connect(appConfig.database.uri);
    console.log('Connected to MongoDB');

    // Create collections (this will create indexes automatically)
    await MaintenanceLog.createCollection();
    console.log('✅ Created maintenance_logs collection');

    await DeviceRuntime.createCollection();
    console.log('✅ Created device_runtime collection');

    await FilterInventory.createCollection();
    console.log('✅ Created filter_inventory collection');

    // Verify collections exist
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('\nExisting collections:');
    collectionNames.forEach(name => console.log(`  - ${name}`));

    await mongoose.disconnect();
    console.log('\n✅ All DSS collections created successfully');
  } catch (error) {
    console.error('❌ Failed to create collections:', error);
    process.exit(1);
  }
}

createDSSCollections();
```

### 5.2 Seed Filter Inventory Script

```typescript
/**
 * Seed Filter Inventory with Sample Data
 * Run this to populate filter_inventory with initial filter types
 * 
 * Usage: ts-node migrations/seed-filter-inventory.ts
 */

import mongoose from 'mongoose';
import { appConfig } from '../core/configs/app.config';
import FilterInventory from '../feature/filterInventory/filterInventory.model';

async function seedFilterInventory() {
  try {
    await mongoose.connect(appConfig.database.uri);
    console.log('Connected to MongoDB');

    const filterTypes = [
      {
        filterType: 'STANDARD-PP-5MICRON',
        manufacturer: 'AquaPure',
        modelNumber: 'PP-05-STD',
        specifications: {
          expectedLifespanHours: 2000,
          expectedCapacityLiters: 10000,
          maxPressureDrop: 15,
          maxFlowRate: 5,
          filterationEfficiency: 95,
          micronRating: 5,
        },
        compatibleDevices: ['water-quality-sensor'],
        currentStock: 20,
        reorderPoint: 5,
        leadTimeDays: 14,
        costPerUnit: 25.50,
        historicalMetrics: {
          totalReplacements: 0,
        },
      },
      {
        filterType: 'CARBON-BLOCK-10MICRON',
        manufacturer: 'FilterMax',
        modelNumber: 'CB-10-PRO',
        specifications: {
          expectedLifespanHours: 3000,
          expectedCapacityLiters: 15000,
          maxPressureDrop: 20,
          maxFlowRate: 4,
          filterationEfficiency: 98,
          micronRating: 10,
        },
        compatibleDevices: ['water-quality-sensor'],
        currentStock: 15,
        reorderPoint: 5,
        leadTimeDays: 21,
        costPerUnit: 45.00,
        historicalMetrics: {
          totalReplacements: 0,
        },
      },
      {
        filterType: 'CERAMIC-ULTRA-1MICRON',
        manufacturer: 'UltraFilter',
        modelNumber: 'CER-01-ULT',
        specifications: {
          expectedLifespanHours: 5000,
          expectedCapacityLiters: 25000,
          maxPressureDrop: 25,
          maxFlowRate: 3,
          filterationEfficiency: 99.9,
          micronRating: 1,
        },
        compatibleDevices: ['water-quality-sensor'],
        currentStock: 10,
        reorderPoint: 3,
        leadTimeDays: 30,
        costPerUnit: 89.99,
        historicalMetrics: {
          totalReplacements: 0,
        },
      },
    ];

    const result = await FilterInventory.insertMany(filterTypes);
    console.log(`✅ Seeded ${result.length} filter types`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Failed to seed filter inventory:', error);
    process.exit(1);
  }
}

seedFilterInventory();
```

---

## 6. API ENDPOINT SPECIFICATIONS

### 6.1 Maintenance Logs Endpoints

```typescript
/**
 * POST /api/v2/maintenance-logs
 * Create a new maintenance log entry
 * 
 * Auth: Required (Admin, Staff)
 */
{
  "deviceId": "DEV-001",
  "maintenanceType": "filter_change",
  "filterChangeDetails": {
    "oldFilterType": "STANDARD-PP-5MICRON",
    "newFilterType": "STANDARD-PP-5MICRON",
    "oldFilterId": "FLT-12345",
    "newFilterId": "FLT-67890",
    "changeReason": "scheduled",
    "replacedComponents": ["pre-filter", "main-filter"]
  },
  "deviceState": {
    "operatingHours": 2100,
    "operatingHoursSinceLastChange": 2100,
    "waterProcessedLiters": 12000
  },
  "preMaintenanceMetrics": {
    "avgPH_7days": 7.2,
    "avgTurbidity_7days": 3.5,
    "avgTDS_7days": 320,
    "alertCount_30days": 5
  },
  "performedAt": "2025-12-06T10:30:00Z",
  "duration": 45,
  "cost": 125.50,
  "notes": "Filter was heavily clogged, replaced ahead of schedule"
}

/**
 * GET /api/v2/maintenance-logs
 * Query maintenance logs with filters
 * 
 * Query Params:
 *   ?deviceId=DEV-001
 *   &maintenanceType=filter_change
 *   &startDate=2025-01-01T00:00:00Z
 *   &endDate=2025-12-31T23:59:59Z
 *   &page=1
 *   &limit=50
 */

/**
 * GET /api/v2/maintenance-logs/:id
 * Get single maintenance log by ID
 */

/**
 * PUT /api/v2/maintenance-logs/:id
 * Update maintenance log (notes, cost, duration only)
 */

/**
 * DELETE /api/v2/maintenance-logs/:id
 * Soft delete maintenance log
 */

/**
 * POST /api/v2/devices/:deviceId/filter-change
 * Shortcut endpoint to log filter change
 * (Automatically calculates deviceState from device.totalOperatingHours)
 */
{
  "oldFilterType": "STANDARD-PP-5MICRON",
  "newFilterType": "STANDARD-PP-5MICRON",
  "changeReason": "scheduled",
  "notes": "Routine maintenance"
}
```

### 6.2 Device Runtime Endpoints

```typescript
/**
 * GET /api/v2/devices/:deviceId/runtime
 * Get runtime statistics for a device
 * 
 * Query Params:
 *   ?startDate=2025-01-01T00:00:00Z
 *   &endDate=2025-12-31T23:59:59Z
 * 
 * Response:
 */
{
  "deviceId": "DEV-001",
  "totalOperatingHours": 2400,
  "totalWaterProcessed": 15000,
  "dailyStats": [
    {
      "date": "2025-12-05",
      "operatingHours": 22.5,
      "waterProcessed": 150,
      "uptimePercentage": 93.75
    }
  ]
}

/**
 * GET /api/v2/devices/:deviceId/runtime/summary
 * Get aggregated runtime summary
 */
{
  "totalOperatingHours": 2400,
  "totalWaterProcessed": 15000,
  "avgDailyRuntime": 20.5,
  "avgDailyWaterProcessed": 130,
  "avgUptimePercentage": 85.4,
  "lastUpdated": "2025-12-06T08:00:00Z"
}
```

### 6.3 Filter Inventory Endpoints

```typescript
/**
 * GET /api/v2/filter-inventory
 * List all filter types
 */

/**
 * POST /api/v2/filter-inventory
 * Create new filter type
 */
{
  "filterType": "NEW-FILTER-TYPE",
  "manufacturer": "ManufacturerName",
  "modelNumber": "MODEL-123",
  "specifications": {
    "expectedLifespanHours": 2500,
    "expectedCapacityLiters": 12000
  },
  "compatibleDevices": ["water-quality-sensor"],
  "currentStock": 10,
  "reorderPoint": 3,
  "costPerUnit": 35.00
}

/**
 * PUT /api/v2/filter-inventory/:filterType
 * Update filter inventory
 */

/**
 * GET /api/v2/filter-inventory/:filterType/performance
 * Get historical performance metrics for filter type
 */
{
  "filterType": "STANDARD-PP-5MICRON",
  "avgActualLifespanHours": 1950,
  "totalReplacements": 45,
  "performanceRating": 4.2,
  "commonReplacementReasons": [
    {"reason": "scheduled", "count": 30},
    {"reason": "clogged", "count": 12},
    {"reason": "performance_degradation", "count": 3}
  ]
}
```

---

## 7. CONSTANTS UPDATES

### 7.1 Add to `constants.config.ts`

```typescript
/**
 * ADD THESE TO EXISTING constants.config.ts
 */

/**
 * Collection names (ADD to existing COLLECTIONS object)
 */
export const COLLECTIONS = {
  // ... existing collections ...
  MAINTENANCE_LOGS: 'maintenance_logs',
  DEVICE_RUNTIME: 'device_runtime',
  FILTER_INVENTORY: 'filter_inventory',
} as const;

/**
 * Maintenance configuration
 */
export const MAINTENANCE = {
  DEFAULT_FILTER_LIFESPAN_HOURS: 2000,
  FILTER_WARNING_THRESHOLD: 0.8, // Alert at 80% of expected lifespan
  FILTER_CRITICAL_THRESHOLD: 0.95, // Critical alert at 95%
  MIN_RUNTIME_FOR_DSS: 100, // Minimum hours before DSS predictions
  MIN_FILTER_CHANGES_FOR_DSS: 2, // Minimum filter changes for reliable predictions
} as const;
```

---

## IMPLEMENTATION CHECKLIST

### Week 1: Schema Implementation
- [ ] Create `maintenanceLogs` feature folder structure
- [ ] Implement `maintenanceLog.types.ts`
- [ ] Implement `maintenanceLog.model.ts`
- [ ] Implement `maintenanceLog.schema.ts`
- [ ] Create `deviceRuntime` feature folder
- [ ] Implement `deviceRuntime.types.ts`
- [ ] Implement `deviceRuntime.model.ts`
- [ ] Create `filterInventory` feature folder
- [ ] Implement `filterInventory.types.ts`
- [ ] Implement `filterInventory.model.ts`

### Week 2: Database Migration
- [ ] Test migration scripts in development
- [ ] Run `create-dss-collections.ts`
- [ ] Run `add-dss-fields-to-devices.ts`
- [ ] Run `seed-filter-inventory.ts`
- [ ] Verify all indexes created correctly
- [ ] Document rollback procedures

### Week 3: API Implementation
- [ ] Implement maintenance log controller
- [ ] Implement maintenance log service
- [ ] Implement maintenance log routes
- [ ] Implement device runtime service
- [ ] Implement filter inventory controller
- [ ] Add DSS-related device endpoints

### Week 4: Testing & Deployment
- [ ] Unit tests for new models
- [ ] Integration tests for API endpoints
- [ ] Load testing for runtime tracker
- [ ] Deploy to staging environment
- [ ] User acceptance testing
- [ ] Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** December 6, 2025  
**Ready for Implementation:** YES

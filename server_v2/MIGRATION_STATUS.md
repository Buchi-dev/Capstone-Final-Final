# Server V2 - TypeScript Migration Progress

## ✅ Completed

### 1. TypeScript Implementation & Core Architecture
- ✅ Full TypeScript configuration with strict type checking
- ✅ Path aliases configured (`@core`, `@feature`, `@utils`, `@types`)
- ✅ Modular architecture with clear separation of concerns:
  - **Core**: Configurations, middleware, shared functionality
  - **Feature**: Business logic organized by domain (Alerts, Users, Devices, Reports, Sensor Readings)
  - **Utils**: Reusable utilities and helpers

### 2. Centralized Configuration & Constants
- ✅ **`constants.config.ts`**: All magic numbers and strings centralized
  - Time constants (milliseconds)
  - Sensor thresholds (WHO/EPA guidelines)
  - Pagination defaults
  - HTTP status codes
  - MongoDB connection pool settings
  - Email, Alert, Device, Report configurations
  - Rate limiting settings
  - Error codes, log levels, collection names

- ✅ **`messages.config.ts`**: Centralized message templates
  - Error messages (auth, validation, resources, database, MQTT, etc.)
  - Success messages
  - Log messages

- ✅ **`mqtt.config.ts`**: Complete MQTT configuration
  - HiveMQ Cloud connection settings
  - QoS levels as enum
  - Topic structure and generation helpers
  - Message type definitions
  - Command types
  - TypeScript interfaces for all message structures

### 3. Query Builder & CRUD Operations
- ✅ **Type-safe Query Builder** with full MongoDB support:
  - Filtering with type inference
  - Pagination with metadata
  - Sorting (ascending/descending)
  - Field selection
  - Population of related documents
  - Search across multiple fields (case-insensitive)
  - Date range filtering
  - Numeric range filtering
  - WhereIn filtering
  - Count and exists operations

- ✅ **Complete CRUD Operations**:
  - Create (single & bulk)
  - Read (findById, findOne, findAll with filters)
  - Update (by ID, by filter, bulk updates with atomic operations)
  - Delete (by ID, by filter, bulk deletes)
  - Utility operations (exists, count)

- ✅ **Atomic Operations**: Using `findOneAndUpdate`, `findByIdAndUpdate` for race condition prevention

### 4. Package Installation
- ✅ Express (v5.2.1)
- ✅ Mongoose (v9.0.0)
- ✅ CORS (v2.8.5)
- ✅ MQTT (latest)
- ✅ Winston (logging)
- ✅ Helmet (security)
- ✅ jsPDF (PDF generation)
- ✅ Zod (runtime validation)
- ✅ TypeScript (v5.9.3)
- ✅ Nodemon (dev hot reload)
- ✅ Dotenv (environment variables)

### 5. Development Infrastructure
- ✅ TypeScript compiler configured
- ✅ Build scripts (`npm run build`, `npm run dev`, `npm run type-check`)
- ✅ Hot reload with nodemon
- ✅ Environment variable management
- ✅ .gitignore configured

### 6. Documentation
- ✅ `README.md`: Complete project overview
- ✅ `QUICKSTART.md`: Quick start guide
- ✅ `QUERY_BUILDER_GUIDE.md`: Comprehensive query builder documentation
- ✅ Example implementations with full TypeScript types

## 📋 Next Steps (To Complete Migration)

### 1. Entity Models (Priority: HIGH)
Need to create TypeScript models for all 5 main entities based on v1 analysis:

#### **Alerts Model**
- Fields: alertId, deviceId, deviceName, severity, parameter, value, threshold, message, status
- Relationships: `acknowledgedBy` → User, `resolvedBy` → User
- Indexes: alertId, deviceId, severity, status, acknowledged
- Features: Deduplication with occurrence tracking, email sent tracking
- Race condition handling: Atomic updates for status changes

#### **Users Model**
- Fields: firebaseUid, email, displayName, role, status, notificationPreferences
- Indexes: firebaseUid, email, role, status
- Features: Google OAuth + Firebase auth support
- Notification preferences with array filtering

#### **Devices Model**
- Fields: deviceId, name, type, status, registrationStatus, lastSeen, sensors, location, metadata
- Indexes: deviceId, status, registrationStatus, isRegistered
- Features: Online/offline tracking, registration workflow
- Race condition handling: Atomic updates for status/lastSeen

#### **Reports Model**
- Fields: reportId, type, title, generatedBy, dateRange, status, data, gridFsFileId
- Relationships: `generatedBy` → User
- Indexes: type, generatedBy, status, createdAt
- Features: GridFS for PDF storage, download tracking

#### **Sensor Readings Model** (NEW - needs analysis)
- Store raw sensor data from devices
- High-volume collection requiring optimization
- Indexes for efficient querying by device/time
- Consider TTL indexes for data retention

### 2. Services Layer (Priority: HIGH)
Create service classes for each entity following the example pattern:
- AlertService: Alert lifecycle, deduplication, email notifications
- UserService: User management, authentication, preferences
- DeviceService: Registration, status management, MQTT communication
- ReportService: Generation, PDF creation, GridFS integration
- SensorReadingService: Data ingestion, analytics, aggregation

### 3. Controllers Layer (Priority: HIGH)
Implement REST API controllers for each entity:
- Request validation with Zod schemas
- Proper error handling
- Response formatting using ResponseHandler
- Pagination for list endpoints
- Filtering, sorting, searching support

### 4. MQTT Service (Priority: HIGH)
Create comprehensive MQTT service:
- Connection management with reconnection logic
- Topic subscription/unsubscription
- Message handlers for sensor data, registration, presence
- Command publishing to devices
- Presence detection with polling
- Message queue for offline devices
- Error handling and logging

### 5. Validation Schemas (Priority: MEDIUM)
Create Zod schemas for:
- Alert creation/update
- User creation/update with role validation
- Device registration
- Sensor data validation with threshold checking
- Report generation parameters

### 6. Middleware (Priority: MEDIUM)
- Authentication middleware (Firebase token verification)
- Authorization middleware (role-based access control)
- Request logging with Winston
- Error handling middleware
- Rate limiting middleware
- Validation middleware (already scaffolded)

### 7. Winston Logger Setup (Priority: MEDIUM)
- Console transport for development
- File transports for production (error.log, combined.log)
- Log rotation
- Custom format with timestamps and metadata
- Context-aware logging (correlation IDs)

### 8. Background Jobs (Priority: MEDIUM)
- Alert cooldown cleanup
- Device offline detection
- Report cleanup (delete old reports)
- Email queue processing
- Database cleanup jobs

### 9. GridFS Service (Priority: LOW)
- PDF upload to GridFS
- PDF download from GridFS
- Cleanup old files

### 10. Email Service (Priority: LOW)
- SMTP configuration
- Template-based emails
- Queue-based sending with retry logic
- Batch processing

### 11. Testing (Priority: LOW)
- Unit tests for services
- Integration tests for API endpoints
- MQTT message handling tests
- Database operation tests

## 🎯 Key Architectural Decisions

### Why ObjectId over UUID?
- **Better indexing performance**: MongoDB's default index is optimized for ObjectId
- **Smaller storage footprint**: 12 bytes vs 16 bytes (25% smaller)
- **Faster queries**: Native MongoDB type with optimized operations
- **Temporal ordering**: ObjectIds contain timestamps for natural sorting
- **No distributed system needs**: Single MongoDB instance doesn't need UUIDs
- **Better MongoDB integration**: Works seamlessly with relationships and lookups

### Race Condition Prevention
- **Atomic Operations**: Using `findOneAndUpdate`, `findByIdAndUpdate` with `{ new: true }`
- **Optimistic Locking**: Can add version fields (`__v`) if needed
- **Transaction Support**: Available for multi-document operations (if needed)
- **Update Operators**: Using `$set`, `$inc`, `$push`, `$pull` for atomic changes

### MQTT Optimization for Heavy Load
- **QoS 1 for critical messages**: Guaranteed delivery for sensor data and commands
- **QoS 0 for presence**: Fire-and-forget for frequent heartbeats
- **Clean sessions**: Prevent message buildup
- **Reasonable keepalive**: 30 seconds for balance
- **Server polling mode**: Explicit presence queries instead of relying on LWT
- **Message deduplication**: Track processed messages to handle retries

### Database Connection Pool
- **Min: 5 connections**: Always ready for immediate requests
- **Max: 10 connections**: Prevents overwhelming MongoDB Atlas
- **Justification**: Based on typical load patterns and cloud latency

## 📊 Current Project Structure

```
server_v2/
├── src/
│   ├── core/
│   │   ├── configs/
│   │   │   ├── app.config.ts          ✅ Complete
│   │   │   ├── database.config.ts     ✅ Complete
│   │   │   ├── mqtt.config.ts         ✅ Complete
│   │   │   ├── constants.config.ts    ✅ Complete
│   │   │   ├── messages.config.ts     ✅ Complete
│   │   │   └── index.ts               ✅ Complete
│   │   └── middlewares/
│   │       ├── errorHandler.middleware.ts    ✅ Complete
│   │       ├── logger.middleware.ts          ✅ Complete
│   │       ├── validation.middleware.ts      ✅ Complete
│   │       └── index.ts                       ✅ Complete
│   ├── feature/
│   │   ├── alerts/         ⏳ TODO
│   │   ├── devices/        ⏳ TODO
│   │   ├── reports/        ⏳ TODO
│   │   ├── users/          ⏳ TODO
│   │   └── examples/       ✅ Complete (reference implementation)
│   ├── types/
│   │   ├── common.types.ts ✅ Complete
│   │   └── index.ts        ✅ Complete
│   ├── utils/
│   │   ├── asyncHandler.util.ts      ✅ Complete
│   │   ├── errors.util.ts            ✅ Complete
│   │   ├── queryBuilder.util.ts      ✅ Complete
│   │   ├── response.util.ts          ✅ Complete
│   │   └── index.ts                   ✅ Complete
│   └── index.ts            ✅ Complete (base server)
├── dist/                   ✅ Auto-generated
├── .env                    ✅ Complete
├── .env.example            ✅ Complete
├── package.json            ✅ Complete
├── tsconfig.json           ✅ Complete
├── nodemon.json            ✅ Complete
└── README.md               ✅ Complete
```

## 🔍 Questions to Address

1. **Sensor Readings Schema**: Need to analyze v1 implementation - is there a separate collection or embedded in alerts?
2. **Email Templates**: Should we migrate existing HTML templates or create new ones?
3. **GridFS Configuration**: Bucket names and chunking strategy?
4. **Rate Limiting Strategy**: Per-user, per-IP, or per-device?
5. **WebSocket Support**: Is real-time data streaming needed for frontend or just MQTT?
6. **API Versioning**: How to handle v1 deprecation and v2 migration path?
7. **Environment-specific Configs**: Different settings for dev/staging/production?

## 📈 Performance Considerations

### Database Optimization
- Indexes on frequently queried fields
- Compound indexes for common query patterns
- TTL indexes for auto-cleanup of old data
- Projection to minimize data transfer
- Aggregation pipeline for complex queries

### MQTT Optimization
- Message batching for high-frequency data
- Compression for large payloads
- Topic filtering at broker level
- Persistent sessions for important clients

### API Optimization
- Response caching where appropriate
- Pagination for all list endpoints
- Field selection to reduce payload size
- Async processing for heavy operations

## 🚀 Ready to Implement

The foundation is solid. We have:
- ✅ Complete TypeScript infrastructure
- ✅ Centralized configuration and constants
- ✅ Robust query builder with CRUD operations
- ✅ Proper error handling and responses
- ✅ MQTT configuration ready
- ✅ Documentation and examples

Next immediate step: **Implement the 5 entity models** based on the v1 schema analysis, then build out the services layer with proper business logic.

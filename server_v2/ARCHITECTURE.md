# Server V2 Architecture Overview

## 🏗️ Design Principles

### 1. Separation of Concerns
The application is organized into three distinct layers:

#### **Core Layer** (`src/core/`)
Foundational infrastructure that the entire application depends on:
- **Configurations**: Environment-based settings, constants, MQTT, database
- **Middlewares**: Cross-cutting concerns (auth, logging, error handling, validation)
- **No Business Logic**: Core layer never imports from Feature layer

#### **Feature Layer** (`src/feature/`)
Domain-specific business logic organized by entity:
- **Models**: Database schemas with Mongoose
- **Services**: Business logic and data operations
- **Controllers**: HTTP request handling
- **Routes**: API endpoint definitions
- **Each feature is independent**: Alerts, Users, Devices, Reports, Sensors

#### **Utils Layer** (`src/utils/`)
Reusable helper functions and utilities:
- **Query Builder**: Type-safe database operations
- **Error Handlers**: Custom error classes
- **Response Handlers**: Consistent API responses
- **Async Wrappers**: Error handling for async routes

### 2. Type Safety First
- **Strict TypeScript**: All code is strictly typed with no `any` (except necessary MongoDB type workarounds)
- **Interface-Driven**: Clear interfaces for all data structures
- **Zod Validation**: Runtime type validation with TypeScript inference
- **Generic Types**: Reusable components leverage TypeScript generics

### 3. Centralized Configuration
- **No Magic Numbers**: All constants defined once in `constants.config.ts`
- **No Hardcoded Strings**: All messages defined in `messages.config.ts`
- **Environment-Based**: Configuration adapts to dev/staging/production
- **Type-Safe Enums**: Using TypeScript enums for fixed value sets

## 🗂️ Directory Structure Explained

```
server_v2/
├── src/
│   ├── index.ts                    # Application entry point
│   │
│   ├── core/                       # Foundation layer
│   │   ├── configs/                # Configuration management
│   │   │   ├── app.config.ts       # Main app config (port, env, API version)
│   │   │   ├── database.config.ts  # MongoDB connection (singleton pattern)
│   │   │   ├── mqtt.config.ts      # MQTT broker config & topics
│   │   │   ├── constants.config.ts # All constants (time, thresholds, limits)
│   │   │   ├── messages.config.ts  # Error/success/log messages
│   │   │   └── index.ts            # Barrel export
│   │   │
│   │   └── middlewares/            # Express middlewares
│   │       ├── errorHandler.middleware.ts    # Global error handling
│   │       ├── logger.middleware.ts          # Request logging
│   │       ├── validation.middleware.ts      # Zod validation wrapper
│   │       ├── auth.middleware.ts            # Firebase token verification (TODO)
│   │       ├── rateLimit.middleware.ts       # Rate limiting (TODO)
│   │       └── index.ts                      # Barrel export
│   │
│   ├── feature/                    # Business logic layer
│   │   ├── alerts/                 # Alert management
│   │   │   ├── alert.model.ts      # Mongoose schema
│   │   │   ├── alert.service.ts    # Business logic
│   │   │   ├── alert.controller.ts # HTTP handlers
│   │   │   ├── alert.routes.ts     # Route definitions
│   │   │   └── alert.schema.ts     # Zod validation schemas
│   │   │
│   │   ├── users/                  # User management
│   │   │   ├── user.model.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.routes.ts
│   │   │   └── user.schema.ts
│   │   │
│   │   ├── devices/                # Device management
│   │   │   ├── device.model.ts
│   │   │   ├── device.service.ts
│   │   │   ├── device.controller.ts
│   │   │   ├── device.routes.ts
│   │   │   └── device.schema.ts
│   │   │
│   │   ├── reports/                # Report generation
│   │   │   ├── report.model.ts
│   │   │   ├── report.service.ts
│   │   │   ├── report.controller.ts
│   │   │   ├── report.routes.ts
│   │   │   └── report.schema.ts
│   │   │
│   │   └── sensorReadings/         # Sensor data management
│   │       ├── sensorReading.model.ts
│   │       ├── sensorReading.service.ts
│   │       ├── sensorReading.controller.ts
│   │       ├── sensorReading.routes.ts
│   │       └── sensorReading.schema.ts
│   │
│   ├── types/                      # TypeScript type definitions
│   │   ├── common.types.ts         # Shared types
│   │   ├── api.types.ts            # API-specific types
│   │   └── index.ts                # Barrel export
│   │
│   └── utils/                      # Utility functions
│       ├── queryBuilder.util.ts    # MongoDB query builder
│       ├── errors.util.ts          # Custom error classes
│       ├── response.util.ts        # Response formatting
│       ├── asyncHandler.util.ts    # Async error wrapper
│       ├── logger.util.ts          # Winston logger setup (TODO)
│       ├── mqtt.service.ts         # MQTT client service (TODO)
│       ├── email.service.ts        # Email sending (TODO)
│       ├── pdf.service.ts          # PDF generation (TODO)
│       ├── gridfs.service.ts       # GridFS file storage (TODO)
│       └── index.ts                # Barrel export
│
├── dist/                           # Compiled JavaScript (generated)
├── logs/                           # Application logs (generated)
├── .env                            # Environment variables (not in repo)
├── .env.example                    # Environment template
├── tsconfig.json                   # TypeScript configuration
├── nodemon.json                    # Nodemon configuration
└── package.json                    # Dependencies and scripts
```

## 🔄 Data Flow

### Incoming HTTP Request Flow
```
1. HTTP Request
   ↓
2. Express Middleware Stack
   ├── CORS
   ├── Body Parser
   ├── Request Logger (logs request)
   ├── Rate Limiter (checks limits)
   ├── Auth Middleware (verifies token)
   └── Validation Middleware (validates input)
   ↓
3. Route Handler
   ↓
4. Controller Method (wrapped in asyncHandler)
   ↓
5. Service Layer (business logic)
   ↓
6. Model/Database (via Query Builder)
   ↓
7. Response Handler (formats response)
   ↓
8. HTTP Response

If error occurs at any step:
   ↓
Error Handler Middleware (catches error)
   ↓
Formatted Error Response
```

### MQTT Message Flow
```
1. Device publishes to topic
   ↓
2. MQTT Broker (HiveMQ Cloud)
   ↓
3. Server receives message
   ↓
4. MQTT Service (parses message)
   ↓
5. Route to appropriate handler
   ├── Sensor Data → Device Service → Process & Store
   ├── Registration → Device Service → Register Device
   └── Presence → Device Service → Update Status
   ↓
6. Business Logic Execution
   ├── Validate sensor thresholds
   ├── Create alerts if needed
   ├── Update device status
   └── Trigger email notifications
   ↓
7. Database Operations (atomic updates)
   ↓
8. Log Results
```

### Alert Generation Flow
```
1. Sensor data received via MQTT
   ↓
2. Device Service validates data
   ↓
3. Check against thresholds (constants.config)
   ↓
4. If threshold exceeded:
   ├── Alert Service checks cooldown
   ├── Check for existing alert (deduplication)
   ├── Create or update alert (atomic operation)
   ├── Queue email notification
   └── Publish to alert topic (optional)
   ↓
5. Email Service processes queue
   ├── Batch emails (10 at a time)
   ├── Retry on failure
   └── Mark email as sent
```

## 🛡️ Error Handling Strategy

### Error Hierarchy
```
Error (JavaScript native)
  ↓
AppError (Base custom error)
  ├── ValidationError (400)
  ├── AuthenticationError (401)
  ├── ForbiddenError (403)
  ├── NotFoundError (404)
  ├── ConflictError (409)
  └── InternalServerError (500)
```

### Error Flow
1. **Throw Error**: Service/Controller throws custom error
2. **Async Handler**: Catches async errors, passes to next()
3. **Error Middleware**: Catches all errors
4. **Log Error**: Winston logs with context
5. **Format Response**: Consistent error response structure
6. **Send Response**: HTTP error response to client

### Error Response Format
```typescript
{
  status: 'error',
  statusCode: 404,
  message: 'Device not found',
  code: 'RESOURCE_NOT_FOUND', // Optional error code
  stack: '...'  // Only in development
}
```

## 🔒 Security Measures

### Authentication & Authorization
- **Firebase Auth**: Token-based authentication
- **Role-Based Access Control**: Admin vs Staff permissions
- **Token Validation**: Every protected route verifies token
- **Session Management**: Track user sessions

### API Security
- **Helmet**: Sets security HTTP headers
- **CORS**: Configured for specific origins
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Zod schemas validate all inputs
- **SQL Injection Prevention**: MongoDB/Mongoose parameterized queries
- **XSS Prevention**: Input sanitization

### MQTT Security
- **TLS/SSL**: Encrypted communication with broker
- **Authentication**: Username/password for broker
- **Topic ACLs**: Devices can only publish to own topics
- **Message Validation**: All incoming messages validated

### Data Protection
- **Password Hashing**: bcrypt for local auth (if implemented)
- **Sensitive Data**: Environment variables, never in code
- **Logging**: Never log passwords or tokens
- **API Keys**: Stored securely, rotated regularly

## ⚡ Performance Optimizations

### Database Performance
```typescript
// ✅ GOOD: Use indexes
deviceSchema.index({ deviceId: 1, status: 1 });

// ✅ GOOD: Use projection to limit fields
Device.find({}, 'deviceId name status');

// ✅ GOOD: Use lean() for read-only queries
Device.find({}).lean();

// ✅ GOOD: Use atomic operations
Device.findByIdAndUpdate(id, { $inc: { count: 1 } });

// ❌ BAD: Don't fetch all fields if not needed
Device.find({});  // Gets all fields
```

### Query Builder Best Practices
```typescript
// ✅ GOOD: Chain operations efficiently
const result = await crud.query()
  .filter({ status: 'active' })
  .dateRange('createdAt', startDate, endDate)
  .paginate(page, limit)
  .selectFields('name deviceId status')
  .execute();

// ✅ GOOD: Use indexes for sorted fields
// Make sure 'createdAt' is indexed if sorting by it
.sortBy('-createdAt')

// ❌ BAD: Don't fetch all data then filter in memory
const allData = await crud.findAll();
const filtered = allData.filter(/* logic */);
```

### MQTT Performance
```typescript
// ✅ GOOD: Use appropriate QoS
// QoS 0 for non-critical messages (presence)
// QoS 1 for important messages (sensor data, commands)
// QoS 2 only if absolutely necessary (highest overhead)

// ✅ GOOD: Keep messages small
// Don't send entire device state, only changes

// ✅ GOOD: Batch when possible
// Collect sensor readings, send every 30 seconds instead of real-time

// ❌ BAD: Don't use retained messages for frequent updates
// Leads to message buildup on broker
```

### API Response Optimization
```typescript
// ✅ GOOD: Paginate large datasets
GET /api/devices?page=1&limit=50

// ✅ GOOD: Allow field selection
GET /api/devices?fields=deviceId,name,status

// ✅ GOOD: Use ETags for caching
res.setHeader('ETag', hash);

// ❌ BAD: Don't return all data for list endpoints
// Always implement pagination
```

## 🧪 Testing Strategy

### Unit Tests
- **Services**: Test business logic in isolation
- **Utils**: Test query builder, helpers
- **Models**: Test schema validation, methods

### Integration Tests
- **API Endpoints**: Test full request/response cycle
- **Database Operations**: Test CRUD operations
- **MQTT Handlers**: Test message processing

### E2E Tests
- **User Workflows**: Complete scenarios (register device, receive data, generate alert)
- **API Flows**: Multi-step operations

### Load Tests
- **MQTT**: Test high-frequency sensor data
- **Database**: Test query performance under load
- **API**: Test concurrent requests

## 📊 Monitoring & Logging

### Logging Levels
```typescript
logger.error('Critical errors requiring immediate attention');
logger.warn('Warning conditions, potential issues');
logger.info('General informational messages');
logger.debug('Detailed debugging information');
```

### What to Log
- **Request/Response**: Method, path, status, duration
- **Errors**: Full stack traces, context
- **MQTT**: Connection status, message counts
- **Database**: Slow queries, connection pool stats
- **Auth**: Login attempts, token validation failures

### What NOT to Log
- Passwords or tokens
- Full request bodies (may contain sensitive data)
- Full response bodies (too verbose)

## 🚀 Deployment Considerations

### Environment Variables
```bash
# Server
PORT=5000
NODE_ENV=production

# Database
MONGODB_URI=mongodb+srv://...

# MQTT
MQTT_BROKER_URL=mqtts://...
MQTT_USERNAME=...
MQTT_PASSWORD=...

# Firebase
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Email (optional)
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

### Build & Deploy
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run type check
npm run type-check

# Start production server
npm start

# Development with hot reload
npm run dev
```

### Health Checks
```bash
# Basic health
GET /health

# Returns:
{
  "status": "OK",
  "timestamp": "2025-12-03T...",
  "database": "connected",
  "mqtt": "connected"
}
```

---

This architecture is designed for **scalability**, **maintainability**, and **performance**. Every decision is justified and optimized for the specific use case of water quality monitoring with IoT devices.

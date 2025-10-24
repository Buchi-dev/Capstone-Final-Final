# Shared Module

This directory contains all shared resources used across the application features.

## Structure

```
shared/
├── types/          # Centralized type definitions
├── constants/      # Shared constants and configuration values
├── utils/          # Utility functions
├── hooks/          # Custom React hooks (to be added in Phase 4)
├── services/       # Shared services (HTTP client, storage, etc.)
└── components/     # Shared UI components (to be added in Phase 4)
```

## Refactoring Status

### Phase 1: Foundation ✅ COMPLETE

The foundation layer has been established with:

#### Types (`shared/types/`)
- **common.types.ts** - Generic types (Pagination, Sort, Filters, etc.)
- **api.types.ts** - API request/response types
- **domain.types.ts** - Domain entities (User, Device, Alert, Report, etc.)
- **ui.types.ts** - UI-specific types (Layout, Modal, Form, Table, etc.)
- **index.ts** - Central export for all types

#### Constants (`shared/constants/`)
- **apiEndpoints.constants.ts** - API endpoint URLs and configuration
- **messages.constants.ts** - User-facing messages (success, error, warning, info)
- **validation.constants.ts** - Validation rules, patterns, and constraints
- **index.ts** - Central export for all constants

#### Utils (`shared/utils/`)
- **alert.utils.ts** - Helper functions for working with alerts
- **index.ts** - Central export for all utilities

### Phase 2: Core Services ✅ COMPLETE

#### HTTP Services (`shared/services/http/`)
- **httpClient.ts** - Centralized Axios instances with configuration
  - Device management client (10s timeout)
  - Report generation client (60s timeout)
  - Generic HTTP client
  - Factory for custom clients
- **httpError.ts** - Comprehensive error handling
  - Error parsing from Axios errors
  - User-friendly error messages
  - Error type checking utilities
  - Error logging for debugging
- **httpInterceptor.ts** - Request/response interceptors
  - Automatic request timing
  - Development logging
  - Error transformation

## Usage

### Importing Types
```typescript
// Import specific types
import { Device, SensorReading, UserProfile } from '@/shared/types';

// Or import from specific file
import { Device } from '@/shared/types/domain.types';
```

### Importing Constants
```typescript
// Import specific constants
import { API_BASE_URLS, SUCCESS_MESSAGES, VALIDATION_PATTERNS } from '@/shared/constants';

// Or import from specific file
import { API_BASE_URLS } from '@/shared/constants/apiEndpoints.constants';
```

### Importing Utils
```typescript
// Import specific utilities
import { getParameterUnit, getSeverityColor } from '@/shared/utils';

// Or import from specific file
import { getParameterUnit } from '@/shared/utils/alert.utils';
```

### Using HTTP Clients
```typescript
// Import HTTP clients
import { deviceHttpClient, reportHttpClient } from '@/shared/services/http';

// Use in API clients
const response = await deviceHttpClient.post('/endpoint', data);
```

## Naming Conventions

For detailed naming conventions, refer to `/NAMING_CONVENTIONS.md` in the root directory.

### Quick Reference

- **Files**: camelCase for services/types/utils (e.g., `deviceService.ts`)
- **Components**: PascalCase (e.g., `DeviceTable.tsx`)
- **Folders**: kebab-case (e.g., `device-management/`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DEVICES`)
- **Types**: PascalCase (e.g., `Device`, `UserProfile`)
- **Interfaces**: PascalCase (e.g., `DeviceMetadata`)

## Refactoring Impact

### Before Refactoring
- Types scattered across multiple files
- API configuration duplicated
- No centralized error handling
- No request/response logging
- Mixed concerns in single files

### After Phases 1 & 2
- ✅ All types centralized in `shared/types/`
- ✅ All constants in `shared/constants/`
- ✅ HTTP client abstraction with interceptors
- ✅ Consistent error handling
- ✅ Development logging
- ✅ Feature-based API clients
- ✅ Backward compatible

## Feature-Based API Clients

API clients have been organized by feature:

### Device Management (`features/device-management/services/`)
- **deviceApiClient.ts** - All device-related API operations

### Reports (`features/reports/services/`)
- **reportApiClient.ts** - All report generation operations

## Migration Guide

### For Existing Code
The refactoring maintains backward compatibility. Existing imports continue to work:

```typescript
// This still works
import { deviceApi, reportApi } from '../services/api';
```

### For New Code
Use the new structure for better organization:

```typescript
// Recommended for new code
import { deviceApiClient } from '../features/device-management/services/deviceApiClient';
import { reportApiClient } from '../features/reports/services/reportApiClient';
```

## Next Steps (Future Phases)

- **Phase 3**: Folder restructuring - organize pages/components by feature
- **Phase 4**: Component organization - separate shared from feature-specific
- **Phase 5**: Naming improvements - rename files for consistency
- **Phase 6**: Testing & validation - ensure all functionality works

## Contributing

When adding new shared resources:

1. Follow the naming conventions in `/NAMING_CONVENTIONS.md`
2. Place types in the appropriate category (common, domain, api, ui)
3. Place constants in the appropriate category (endpoints, messages, validation)
4. Add utility functions to relevant util files or create new ones
5. Export new resources from the appropriate index.ts file
6. Update this README if adding new categories
7. Ensure backward compatibility when refactoring existing code

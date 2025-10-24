# Shared Module

This directory contains all shared resources used across the application features.

## Structure

```
shared/
├── types/          # Centralized type definitions
├── constants/      # Shared constants and configuration values
├── utils/          # Utility functions
├── hooks/          # Custom React hooks (to be added in Phase 4)
├── services/       # Shared services (to be added in Phase 2)
└── components/     # Shared UI components (to be added in Phase 4)
```

## Phase 1 Complete ✅

The foundation layer has been established with:

### Types (`shared/types/`)
- **common.types.ts** - Generic types (Pagination, Sort, Filters, etc.)
- **api.types.ts** - API request/response types
- **domain.types.ts** - Domain entities (User, Device, Alert, Report, etc.)
- **ui.types.ts** - UI-specific types (Layout, Modal, Form, Table, etc.)
- **index.ts** - Central export for all types

### Constants (`shared/constants/`)
- **apiEndpoints.constants.ts** - API endpoint URLs and configuration
- **messages.constants.ts** - User-facing messages (success, error, warning, info)
- **validation.constants.ts** - Validation rules, patterns, and constraints
- **index.ts** - Central export for all constants

### Utils (`shared/utils/`)
- **alert.utils.ts** - Helper functions for working with alerts
- **index.ts** - Central export for all utilities

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

## Naming Conventions

For detailed naming conventions, refer to `/NAMING_CONVENTIONS.md` in the root directory.

### Quick Reference

- **Files**: camelCase for services/types/utils (e.g., `deviceService.ts`)
- **Components**: PascalCase (e.g., `DeviceTable.tsx`)
- **Folders**: kebab-case (e.g., `device-management/`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_DEVICES`)
- **Types**: PascalCase (e.g., `Device`, `UserProfile`)
- **Interfaces**: PascalCase (e.g., `DeviceMetadata`)

## Next Steps (Future Phases)

- **Phase 2**: Add `services/http/` for HTTP client abstraction
- **Phase 3**: Add feature-specific API clients
- **Phase 4**: Add `hooks/` for custom React hooks
- **Phase 4**: Add `components/` for shared UI components

## Contributing

When adding new shared resources:

1. Follow the naming conventions in `/NAMING_CONVENTIONS.md`
2. Place types in the appropriate category (common, domain, api, ui)
3. Place constants in the appropriate category (endpoints, messages, validation)
4. Add utility functions to relevant util files or create new ones
5. Export new resources from the appropriate index.ts file
6. Update this README if adding new categories

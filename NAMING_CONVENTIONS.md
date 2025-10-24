# Naming Conventions Guide

## 📋 Overview
This guide establishes clear, consistent naming conventions across the codebase to improve code readability and maintainability.

---

## 1. Files & Folders

### Folder Naming

```typescript
// ✅ CORRECT
src/
├── core/                    // Lower case, singular
├── shared/                  // Lowercase
├── features/
│   ├── device-management/   // Kebab-case, descriptive, plural when collection
│   ├── user-management/
│   └── alerts/

// ❌ INCORRECT
src/
├── Core/                    // Capitalized (use lowercase)
├── SHARED/                  // All caps
├── features/
│   ├── device_management/   // Snake case (use kebab-case)
│   ├── DeviceManagement/    // Pascal case (use kebab-case)
│   └── alert/               // Too vague
```

**Rules:**
- Use **lowercase** for all folder names
- Use **kebab-case** (with hyphens) for multi-word folders
- Use **plural** for collection folders (`features/`, `hooks/`, `components/`)
- Use **singular** for single-purpose folders (`core/`, `shared/`)
- Be **descriptive** (`device-management` not `devices`)

### React Component Files

```typescript
// ✅ CORRECT
DeviceManagementPage.tsx         // Page component (route-level)
DeviceTable.tsx                  // Feature component
DeviceForm.tsx                   // Form component
DeviceModal.tsx                  // Modal component
DeviceStatusBadge.tsx            // Small UI component
CreateDeviceButton.tsx           // Button component
useDeviceList.ts                 // Custom hook
deviceService.ts                 // Service file
device.types.ts                  // Types file
device.constants.ts              // Constants file
DeviceManagementLayout.tsx        // Layout component

// ❌ INCORRECT
DeviceManagement.tsx             // Unclear if page or component
admin-dashboard.tsx              // Lowercase (use PascalCase)
device_form.tsx                  // Snake case (use PascalCase)
usedevices.ts                    // Lowercase hook
device_service.ts                // Snake case (use camelCase)
types.ts                         // Too generic
constants.ts                     // Too generic
```

**Rules:**
- Use **PascalCase** for React components
- Use **PascalCase** for exported class/interface files
- Use **camelCase** for services, hooks, utilities, types
- Use **descriptive** names (`DeviceManagementPage` not `Dashboard`)
- Include **file type indicator**: `.types.ts`, `.service.ts`, `.constants.ts`
- **Pages** should have `.Page` suffix: `DeviceManagementPage.tsx`
- **Hooks** should start with `use`: `useDeviceList.ts`

### Type Definition Files

```typescript
// ✅ CORRECT
device.types.ts              // Domain types
alert.types.ts              // Feature types
common.types.ts             // Shared types
api.types.ts                // API-specific types
index.ts                    // Barrel export

// ❌ INCORRECT
types.ts                    // Too generic
Device.ts                   // PascalCase (use kebab-case)
device_types.ts             // Snake case (use camelCase)
DeviceTypes.tsx             // Extension wrong + capitalized
```

### Service Files

```typescript
// ✅ CORRECT
deviceService.ts            // Business logic service
deviceApiClient.ts          // API client service
httpClient.ts               // HTTP utility service
storageService.ts           // Storage utility service

// ❌ INCORRECT
device.ts                   // Too generic
DeviceService.ts            // PascalCase (use camelCase for files)
device_service.ts           // Snake case
api.ts                      // Too generic
```

### Utility Files

```typescript
// ✅ CORRECT
auth.utils.ts               // Auth-related utilities
validation.utils.ts         // Validation utilities
date.utils.ts               // Date utilities
formatting.utils.ts         // Formatting utilities
array.utils.ts              // Array utilities
string.utils.ts             // String utilities

// ❌ INCORRECT
utils.ts                    // Too generic
helpers.ts                  // Vague term
Auth.utils.ts               // Capitalized
auth_utils.ts               // Snake case
```

### Constants Files

```typescript
// ✅ CORRECT
api.constants.ts            // API constants
messages.constants.ts       // Message constants
validation.constants.ts     // Validation rules
theme.constants.ts          // Theme constants
alertThresholds.constants.ts // Specific constant set

// ❌ INCORRECT
constants.ts                // Too generic
api_config.ts               // Mixed naming
APIConstants.ts             // Capitalized
```

---

## 2. Variables & Functions

### Boolean Variables

```typescript
// ✅ CORRECT
const isUserAuthenticated = !!user;
const hasLoadingError = error !== null;
const shouldShowLoader = isLoading && !hasData;
const canUserDelete = isAdmin || isOwner;
const isDeviceActive = device.status === 'active';
const wasDataFetched = previousData.length > 0;

// ❌ INCORRECT
const user = !!user;                    // Doesn't indicate boolean
const loading = true;                   // Unclear state
const data = null;                      // Could be any type
const deletePermission = true;          // Not clearly boolean
const device = true;                    // Object vs boolean confusion
```

**Prefixes for booleans:**
- `is*` - State or condition (most common)
- `has*` - Possession or attribute
- `should*` - Conditional action
- `can*` - Ability or permission
- `was*` - Past state
- `will*` - Future state

### Async Functions

```typescript
// ✅ CORRECT
const fetchDeviceList = async () => { ... }
const loadUserProfile = async () => { ... }
const getDeviceReadings = async () => { ... }
const queryAlerts = async () => { ... }
const generateReport = async () => { ... }

// ❌ INCORRECT
const device = async () => { ... }          // Unclear action
const data = async () => { ... }            // Too generic
const handleData = async () => { ... }      // Mixed pattern
const deviceData = async () => { ... }      // Not a verb
```

**Prefixes for async functions:**
- `fetch*` - GET request to API
- `load*` - Load from any source
- `get*` - Retrieve/calculate data
- `query*` - Search/filter operations
- `generate*` - Create new data
- `create*` - Create new entity
- `update*` - Modify existing entity
- `delete*` - Remove entity
- `submit*` - Send form data

### Event Handlers

```typescript
// ✅ CORRECT
const handleFormSubmit = (e: FormEvent) => { ... }
const handleDeleteClick = () => { ... }
const handleDeviceStatusChange = (newStatus: string) => { ... }
const handleInputChange = (value: string) => { ... }
const handleFilterApply = (filters: FilterConfig) => { ... }
const handleModalClose = () => { ... }

// ❌ INCORRECT
const onClick = () => { ... }                   // Too generic
const submit = () => { ... }                    // Unclear it's handler
const onDeleteClick = () => { ... }             // Redundant "on"
const processForm = () => { ... }               // Not clearly handler
const deleteHandler = () => { ... }             // "Handler" suffix redundant
```

**Pattern:** `handle[Entity][Action]`

### Data/State Variables

```typescript
// ✅ CORRECT
const deviceListData = [];                      // Plural for collections
const currentUserProfile = {...};               // Contextual prefix
const fetchedAlerts = [];                       // Past tense for fetched data
const selectedDeviceId = '123';                 // What's selected
const filteredResults = [];                     // Result of filtering
const validationErrors = [];                    // What they contain
const userAccountSettings = {...};              // Specific domain

// ❌ INCORRECT
const d = [];                                   // Single letter
const data = [];                                // Too generic
const items = [];                               // Unclear what items
const list = [];                                // What's in list?
const temp = {};                                // Unclear purpose
const obj = {};                                 // What object?
const x = 10;                                   // Meaningless
```

**Patterns:**
- Pluralize collections: `devices`, `alerts`, `readings`
- Use descriptive adjectives: `activeDevices`, `pendingAlerts`, `failedRequests`
- Include type hint: `selectedUserId`, `totalReadings`, `availableThresholds`
- Prefix with state: `currentUser`, `previousValue`, `initialState`

### Configuration Objects

```typescript
// ✅ CORRECT
const paginationConfig = { page: 1, pageSize: 10 };
const httpClientConfig = { baseURL: '...', timeout: 5000 };
const themeConfig = { primaryColor: '#1890ff', ... };
const apiEndpointsConfig = { devices: '/devices', ... };
const validationRulesConfig = { email: {...}, ... };

// ❌ INCORRECT
const config = { ... };                    // Too generic
const settings = { ... };                  // Vague
const options = { ... };                   // Unclear purpose
const PAGINATION = { ... };                // Wrong case
```

### Loop Variables

```typescript
// ✅ CORRECT
devices.forEach((device) => { ... })
readings.map((reading) => ({...}))
alerts.filter((alert) => alert.severity === 'Critical')
users.find((user) => user.id === userId)

// ❌ INCORRECT
devices.forEach((d) => { ... })            // Single letter
items.forEach((item) => { ... })           // Unclear what items
data.forEach((d) => { ... })               // Generic data + abbreviation
arr.map((x) => { ... })                    // Meaningless
```

**Rule:** Use full singular noun matching collection name:
- `devices.forEach((device) => ...)`
- `alerts.map((alert) => ...)`
- `readings.filter((reading) => ...)`

### Custom Hooks

```typescript
// ✅ CORRECT
const useDeviceList = () => { ... }                 // What data it provides
const useDeviceForm = () => { ... }                 // What form it manages
const useFetchData = (url: string) => { ... }       // Generic fetch hook
const useResponsiveTheme = () => { ... }            // What theme behavior
const useAuthContext = () => { ... }                // Access to context
const useTablePagination = () => { ... }            // Pagination logic
const useLocalStorage = (key: string) => { ... }    // Local storage access

// ❌ INCORRECT
const deviceList = () => { ... }                    // Missing "use" prefix
const get_devices = () => { ... }                   // Wrong pattern
const fetchData = () => { ... }                     // Doesn't start with "use"
const getData = () => { ... }                       // Not clearly a hook
const device = () => { ... }                        // Ambiguous
```

**Rule:** Always start with `use` and describe what the hook provides.

### Services

```typescript
// ✅ CORRECT - Service Classes
class DeviceService { ... }                    // What domain it manages
class DeviceApiClient { ... }                  // Specific API client
class StorageService { ... }                   // What storage type
class HttpClient { ... }                       // HTTP abstraction
class ReportService { ... }                    // Report operations

// ✅ CORRECT - Service Objects/Modules
export const authService = { ... }             // Exported object
export const alertService = { ... }            // Feature service
export const validationService = { ... }       // Utility service

// ❌ INCORRECT
class Service { ... }                          // Too generic
class API { ... }                              // Vague
export const service = { ... }                 // No context
export const api = { ... }                     // Too generic
```

---

## 3. Types & Interfaces

### Type Names

```typescript
// ✅ CORRECT
type UserRole = 'Admin' | 'Staff';                              // Union type
type AlertSeverity = 'Advisory' | 'Warning' | 'Critical';      // Enum-like
type RequestStatus = 'pending' | 'success' | 'error';          // Status type
type SortOrder = 'ascend' | 'descend' | null;                  // Multi-value
type FormFieldName = string & { readonly __brand: symbol };    // Branded type

// ❌ INCORRECT
type UserRoles = 'Admin' | 'Staff';         // Plural (use singular)
type User_Role = 'Admin' | 'Staff';         // Snake case
type USERROLE = 'Admin' | 'Staff';          // All caps
```

**Rules:**
- Use **PascalCase** for types
- Use **singular** names
- Be **descriptive** (`AlertSeverity` not `Severity`)
- For union types, use **values that are self-explanatory**

### Interface Names

```typescript
// ✅ CORRECT
interface UserProfile {                                     // Entity interfaces
  userId: string;
  firstName: string;
  role: UserRole;
}

interface DeviceManagementPageProps {                       // Props interfaces
  deviceId: string;
  onClose: () => void;
}

interface CreateDeviceRequest {                            // Request/response
  deviceName: string;
  location: string;
}

interface DeviceListResponse {
  devices: Device[];
  total: number;
}

// ❌ INCORRECT
interface User_Profile { ... }               // Snake case
interface deviceProfile { ... }              // Lowercase
interface IUserProfile { ... }               // I prefix (outdated)
interface Props { ... }                      // Too generic
interface IProps { ... }                     // I prefix + generic
```

**Rules:**
- Use **PascalCase**
- Name after entity/domain: `UserProfile`, `Device`, `Alert`
- Props interfaces end with **Props**: `DeviceFormProps`, `TableProps`
- Request/response interfaces end with **Request/Response**: `CreateDeviceRequest`
- **No I prefix** (outdated TypeScript convention)

### Generic Types

```typescript
// ✅ CORRECT
interface AsyncState<TData> {              // T prefix for type param
  data: TData | null;
  isLoading: boolean;
  error: Error | null;
}

type PaginatedResponse<TItem> {            // Clear what generic is
  items: TItem[];
  total: number;
}

interface TableProps<TRecord extends Record<string, any>> {
  dataSource: TRecord[];
  columns: Column<TRecord>[];
}

// ❌ INCORRECT
interface AsyncState<T> { ... }            // Single letter (confusing)
interface AsyncState<Data> { ... }         // No T prefix
type Response<T, U, V> { ... }             // Unclear what each is
```

**Rules:**
- Use **T prefix** for type parameters: `TData`, `TItem`, `TRecord`
- Be **descriptive**: `TUserData` better than `T`
- Add **constraints** when needed: `T extends object`

### Enum Names

```typescript
// ✅ CORRECT
enum UserStatus {
  Pending = 'Pending',
  Approved = 'Approved',
  Suspended = 'Suspended',
}

enum AlertSeverity {
  Advisory = 'Advisory',
  Warning = 'Warning',
  Critical = 'Critical',
}

// ❌ INCORRECT
enum USER_STATUS {                         // All caps
  PENDING = 'Pending',
  APPROVED = 'Approved',
}

enum userStatus {                          // Lowercase
  Pending = 'pending',                     // Value case inconsistent
  Approved = 'approved',
}

enum Status {                              // Too generic
  Pending = 'Pending',
  Approved = 'Approved',
}
```

**Rules:**
- Use **PascalCase**
- Use **string enums** with matching values
- Be **specific** in naming (`AlertSeverity` not `Severity`)
- Values should match key: `Pending = 'Pending'`

---

## 4. Constants

### Constant Names

```typescript
// ✅ CORRECT
const MAX_DEVICES_PER_PAGE = 20;
const DEFAULT_ALERT_TIMEOUT_MS = 5000;
const API_REQUEST_RETRY_ATTEMPTS = 3;
const WATER_QUALITY_PARAMETERS = ['tds', 'ph', 'turbidity'] as const;
const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
} as const;

// ❌ INCORRECT
const max_devices = 20;                     // Snake case
const maxDevices = 20;                      // Lowercase (should be UPPER)
const MAX = 20;                             // Too generic
const DevicesPerPage = 20;                  // Mixed case
const DEVICES = 20;                         // Unclear purpose
```

**Rules:**
- Use **UPPER_SNAKE_CASE** for constants
- Include **unit** when applicable: `TIMEOUT_MS`, `DELAY_SECONDS`
- Be **descriptive**: `MAX_DEVICES_PER_PAGE` not just `MAX`
- Use **plural** for collections: `PARAMETERS`, `ENDPOINTS`

### API Endpoints

```typescript
// ✅ CORRECT
export const API_ENDPOINTS = {
  DEVICES: {
    LIST: 'LIST_DEVICES',
    GET: 'GET_DEVICE',
    CREATE: 'ADD_DEVICE',
    UPDATE: 'UPDATE_DEVICE',
    DELETE: 'DELETE_DEVICE',
  },
  REPORTS: {
    GENERATE: 'generateReport',
    WATER_QUALITY: 'waterQuality',
  },
} as const;

// ❌ INCORRECT
const endpoints = {                         // Lowercase
  listDevices: 'LIST_DEVICES',              // Inconsistent pattern
  GET_DEVICE: 'GET_DEVICE',                 // Mixed styling
};

export const API = {                        // Too generic
  DEVICE: 'LIST_DEVICES',
};
```

**Rules:**
- Use **nested object** structure for organization
- Use **UPPER_SNAKE_CASE** for keys
- Group by domain/feature
- Include in constants file specific to that domain

### Magic Strings/Numbers

```typescript
// ✅ CORRECT - Extract to constants
const DEFAULT_PAGE_SIZE = 20;
const MIN_PASSWORD_LENGTH = 8;
const MAX_FILE_SIZE_MB = 10;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEBOUNCE_DELAY_MS = 300;

// Using them
const isValidPassword = password.length >= MIN_PASSWORD_LENGTH;
const shouldRetry = attemptCount < DEFAULT_RETRY_ATTEMPTS;

// ❌ INCORRECT - Magic numbers
const isValidPassword = password.length >= 8;            // Magic number
if (count < 3) { ... }                                   // Magic number
const items = data.slice(0, 20);                        // Magic number
```

**Rule:** No magic strings or numbers - extract to named constants.

---

## 5. React-Specific Naming

### Props

```typescript
// ✅ CORRECT
interface DeviceTableProps {
  dataSource: Device[];                           // Clear data source
  isLoading: boolean;                             // Boolean prefix
  onRowClick: (device: Device) => void;           // Handle prefix
  onDelete: (deviceId: string) => void;           // Clear intent
  columns: ColumnDefinition<Device>[];            // Generic type
  pageSize?: number;                              // Optional with ?
}

interface ConfirmModalProps {
  isOpen: boolean;                                // State prefix
  title: string;
  message: string;
  onConfirm: () => void;                          // Handler prefix
  onCancel: () => void;
  confirmButtonText?: string;                     // Optional
}

// ❌ INCORRECT
interface DeviceTableProps {
  devices: Device[];                              // Ambiguous
  loading: boolean;                               // No boolean prefix
  onClick: (device: Device) => void;              // Unclear what onClick
  delete: (id: string) => void;                   // Reserved keyword
  cols: ColumnDefinition[];                       // Abbreviated
  size?: number;                                  // Unclear size
}
```

**Rules:**
- Use **clear, descriptive** names
- Boolean props should use **is*, has*, should*, can** prefixes
- Callback props should use **on** prefix: `onClick`, `onSubmit`, `onClose`
- Use **full names**, not abbreviations

### Callback Props

```typescript
// ✅ CORRECT
interface ButtonProps {
  onClick: () => void;
  onDoubleClick?: () => void;
  onHover?: () => void;
}

interface FormProps {
  onSubmit: (data: FormData) => void;
  onCancel?: () => void;
  onValidationError?: (errors: ValidationError[]) => void;
}

interface ListProps {
  onLoadMore: () => void;
  onSelectionChange: (selected: Item[]) => void;
  onSortChange: (sort: SortConfig) => void;
}

// ❌ INCORRECT
interface ButtonProps {
  click: () => void;                          // Missing "on"
  onPressed?: () => void;                     // Wrong past tense
  handleClick: () => void;                    // Use "on" for props
}
```

**Pattern:** `on[Event]: (data?) => void`

### State Variables (useState)

```typescript
// ✅ CORRECT
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
const [deviceListData, setDeviceListData] = useState<Device[]>([]);
const [formErrors, setFormErrors] = useState<FormError[]>([]);
const [isLoadingDevices, setIsLoadingDevices] = useState(false);

// ❌ INCORRECT
const [modal, setModal] = useState(false);                 // Unclear
const [device, setDevice] = useState<Device | null>(null); // Ambiguous
const [data, setData] = useState([]);                      // Too generic
const [errors, setErrors] = useState([]);                  // Unclear origin
const [loading, setLoading] = useState(false);             // What's loading?
```

**Pattern:** `[descriptiveName, setDescriptiveName]`

### Ref Names

```typescript
// ✅ CORRECT
const formRef = useRef<HTMLFormElement>(null);
const inputRef = useRef<HTMLInputElement>(null);
const scrollContainerRef = useRef<HTMLDivElement>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

// ❌ INCORRECT
const ref = useRef(null);                   // Too generic
const form = useRef<HTMLFormElement>(null); // No "Ref" suffix
const formElement = useRef(...);            // "Element" suffix unclear
```

**Pattern:** `[element]Ref`

---

## 6. CSS & Styling

### CSS Class Names

```typescript
// ✅ CORRECT (BEM-like pattern)
.device-table {}
.device-table__header {}
.device-table__row {}
.device-table__row--selected {}
.device-table__cell {}
.device-table__cell--highlight {}

// ✅ CORRECT (Descriptive)
.dashboard-container {}
.alert-notification {}
.loading-spinner {}
.form-field-error {}

// ❌ INCORRECT
.table {}                           // Too generic
.DTable {}                          // Camel case
.device_table {}                    // Snake case (use kebab)
.dt {}                              // Abbreviated
.DeviceTable {}                     // PascalCase
```

**Rules:**
- Use **kebab-case**
- Use **BEM-like** structure for related elements: `.component__element--modifier`
- Be **descriptive**: `.device-table` not `.table`
- Avoid single letters: `.dt` ❌, `.dt-container` ✅

---

## 7. Quick Reference Table

| Category | Pattern | Example | Correct ❌ | Incorrect ❌ |
|----------|---------|---------|-----------|------------|
| **Folders** | lowercase kebab-case | device-management | device_management | DeviceManagement |
| **Components** | PascalCase | DeviceTable.tsx | deviceTable.tsx | Device_Table |
| **Services** | camelCase | deviceService.ts | DeviceService.ts | device_service.ts |
| **Types** | PascalCase | Device | device | IDevice |
| **Booleans** | is*, has*, should* | isActive | active | is_active |
| **Async Fns** | fetch*, load*, get* | fetchDevices | getDevices | devices |
| **Handlers** | handle* | handleClick | onClick | onHandleClick |
| **Hooks** | use* | useDevices | getDevices | useDevices |
| **Constants** | UPPER_SNAKE_CASE | MAX_ITEMS | maxItems | Max_Items |
| **Enums** | PascalCase | UserRole | USER_ROLE | Enum_UserRole |
| **Props callbacks** | on* | onClick | click | onClicked |

---

## 8. Implementation Strategy

### Phase 1: New Code
- Apply these conventions to all new code immediately
- Document in PR comments when naming applies

### Phase 2: Refactoring
- Batch rename files first (easier with tooling)
- Update variables/functions in related files together
- Use IDE rename all references feature

### Phase 3: Review
- Update code review checklist to check naming
- Add eslint rules to enforce patterns
- Document exceptions/special cases

### Common Tools for Renaming:
- VS Code: F2 to rename symbol
- IDE Refactor: Extract variable/method
- ESLint: Enforce naming conventions
- Prettier: Auto-format code

---

## 9. Exceptions & Special Cases

### When to Break These Rules

**1. Abbreviations in Loop Variables (Small Scope)**
```typescript
// ACCEPTABLE - brief, obvious scope
data.forEach((d) => d.id)  // If 'data' is clearly pluralized

// BETTER - always prefer clarity
data.forEach((item) => item.id)
```

**2. Industry Standard Abbreviations**
```typescript
// ACCEPTABLE - widely recognized
const userId = '123';           // Not UserIdentifier
const db = firebaseDb;          // Standard for database
const id = item.id;             // Standard identifier
const URL = 'https://...';      // Acronym in context
```

**3. Very Short Scoped Variables**
```typescript
// ACCEPTABLE if scope is 1-2 lines
const [s, setS] = useState('');  // Only if immediately used/renamed
const [x, setX] = useState(0);    // Only if position/coordinate

// BETTER - always be explicit
const [searchTerm, setSearchTerm] = useState('');
const [xPosition, setXPosition] = useState(0);
```

---

## 10. Enforcement

### ESLint Configuration

Add these rules to `.eslintrc`:
```javascript
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        "selector": "variable",
        "format": ["camelCase", "UPPER_CASE"],
        "leadingUnderscore": "allow"
      },
      {
        "selector": "typeLike",
        "format": ["PascalCase"]
      }
    ]
  }
}
```

### Pre-commit Hook

Add naming check to husky pre-commit:
```bash
# Check for common naming violations
eslint . --fix
```

---

## Checklist for Code Review

When reviewing code, check:
- [ ] Components are PascalCase
- [ ] Services/utils are camelCase
- [ ] Constants are UPPER_SNAKE_CASE
- [ ] Booleans have is*/has*/should* prefix
- [ ] Async functions have fetch*/load*/get* prefix
- [ ] Event handlers have handle* prefix
- [ ] Hooks start with use*
- [ ] Props are descriptive and clear
- [ ] Type names are PascalCase and descriptive
- [ ] No single-letter variables (except loop vars with 1-2 line scope)
- [ ] No magic strings/numbers


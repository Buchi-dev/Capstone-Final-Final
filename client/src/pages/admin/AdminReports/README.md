# AdminReports Module

This module provides a modular, maintainable system for generating PDF reports in the IoT Water Quality Monitoring System.

## 📁 Structure

```
AdminReports/
├── AdminReports.tsx          # Main component (106 lines, down from 1371)
├── index.ts                  # Module exports
├── components/               # UI Components
│   ├── ReportTypeSelection.tsx    # Report type selector cards
│   ├── ReportConfigForm.tsx       # Configuration form for report settings
│   ├── ReportHistorySidebar.tsx   # History and stats sidebar
│   └── index.ts
├── hooks/                    # Custom React Hooks
│   ├── useDevices.ts              # Device data fetching
│   ├── useReportHistory.ts        # Local storage report history
│   ├── useReportGeneration.ts     # Main report generation logic
│   └── index.ts
├── templates/                # PDF Generation Templates
│   ├── WaterQualityReportTemplate.ts
│   ├── DeviceStatusReportTemplate.ts
│   ├── DataSummaryReportTemplate.ts
│   ├── ComplianceReportTemplate.ts
│   └── index.ts
└── utils/                    # Utility Functions
    ├── statistics.ts              # Statistical calculations
    └── index.ts
```

## 🎯 Key Improvements

### Before Refactoring
- **Single File**: 1371 lines in AdminReports.tsx
- **Monolithic**: All logic in one component
- **Hard to Test**: Tightly coupled code
- **Poor Reusability**: Duplicate code patterns

### After Refactoring
- **Main Component**: 106 lines (92% reduction)
- **Modular**: 17 focused files with clear responsibilities
- **Testable**: Isolated components and hooks
- **Reusable**: Templates and utilities can be shared

## 🔧 Components

### ReportTypeSelection
Visual card-based selector for report types (Water Quality, Device Status, Data Summary, Compliance).

**Props:**
- `selectedType`: Current selected report type
- `onSelectType`: Callback when type is selected
- `reportTypes`: Array of report type configurations

### ReportConfigForm
Form component for configuring report parameters (devices, date range, options).

**Props:**
- `form`: Ant Design form instance
- `devices`: Available devices list
- `loading`: Loading state for devices
- `generating`: Generating state for report
- `onFinish`: Callback when form is submitted

### ReportHistorySidebar
Displays recent report history and quick statistics.

**Props:**
- `reportHistory`: Array of historical reports
- `token`: Ant Design theme token

## 🪝 Hooks

### useDevices
Manages device data fetching from Firebase.

**Returns:**
```typescript
{
  devices: Device[],
  loading: boolean,
  loadDevices: () => Promise<void>
}
```

### useReportHistory
Manages report history using localStorage.

**Returns:**
```typescript
{
  reportHistory: ReportHistory[],
  loadReportHistory: () => void,
  addReportToHistory: (report: ReportHistory) => void
}
```

### useReportGeneration
Main report generation logic with backend API and fallback support.

**Parameters:**
- `devices`: Device array for fallback data
- `addReportToHistory`: Callback to save report to history

**Returns:**
```typescript
{
  generating: boolean,
  handleGenerateReport: (type: ReportType, values: any) => Promise<void>
}
```

## 📄 Templates

### PDF Report Templates
Each template is a self-contained function that generates a specific report type:

1. **WaterQualityReportTemplate**: Water quality metrics and analysis
2. **DeviceStatusReportTemplate**: Device health and status overview
3. **DataSummaryReportTemplate**: Statistical data summary
4. **ComplianceReportTemplate**: Regulatory compliance report

**Template Function Signature:**
```typescript
async function generateReport(
  config: ReportConfig,
  reportData: any
): Promise<jsPDF>
```

## 🛠️ Utils

### statistics.ts
Statistical calculation utilities:
- `calculateStatistics(data: number[]): Statistics`
- `calculateDataCompleteness(totalReadings, startDate?, endDate?): string`

## 🚀 Usage

### Basic Usage
```typescript
import { AdminReports } from './pages/admin/AdminReports';

// Use in router or parent component
<AdminReports />
```

### Using Individual Components
```typescript
import { ReportTypeSelection, useDevices } from './pages/admin/AdminReports';

const MyComponent = () => {
  const { devices, loading } = useDevices();
  // ... use components individually
};
```

### Using Templates Directly
```typescript
import { generateWaterQualityReport } from './pages/admin/AdminReports/templates';

const pdf = await generateWaterQualityReport(config, reportData);
pdf.save('report.pdf');
```

## 📊 Report Types

### 1. Water Quality Report
- Parameter analysis (Turbidity, TDS, pH)
- Safe range comparisons
- Alert generation for violations
- Device-level metrics

### 2. Device Status Report
- System overview with health score
- Status breakdown (online/offline/error/maintenance)
- Device details table
- Last seen timestamps

### 3. Data Summary Report
- Total readings and completeness
- Statistical analysis (mean, std dev, min/max)
- Multi-parameter summaries

### 4. Compliance Report
- Regulatory standards reference (WHO/EPA)
- Compliance rate calculations
- Per-device compliance status
- Violation tracking

## 🔄 Data Flow

```
User Input (Form)
    ↓
useReportGeneration hook
    ↓
Backend API (reportsService)
    ↓ (if fails)
Fallback to Local Data
    ↓
PDF Template Generation
    ↓
jsPDF Document
    ↓
File Download + History Update
```

## 🎨 Design Patterns

### Separation of Concerns
- **Components**: UI rendering only
- **Hooks**: Data fetching and business logic
- **Templates**: PDF generation
- **Utils**: Pure utility functions

### Single Responsibility
Each file has one clear purpose and responsibility.

### Dependency Injection
Hooks receive dependencies as parameters for better testability.

### Fallback Strategy
Graceful degradation when backend API is unavailable.

## 🧪 Testing Strategy

### Component Testing
Test each component in isolation with mock data:
```typescript
<ReportTypeSelection 
  selectedType="water_quality"
  onSelectType={mockFn}
  reportTypes={mockTypes}
/>
```

### Hook Testing
Use `@testing-library/react-hooks`:
```typescript
const { result } = renderHook(() => useDevices());
await waitFor(() => expect(result.current.loading).toBe(false));
```

### Template Testing
Test PDF generation with sample data:
```typescript
const pdf = await generateWaterQualityReport(mockConfig, mockData);
expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
```

## 🔐 Security Considerations

- ✅ No hardcoded credentials
- ✅ Backend validation through Cloud Functions
- ✅ Secure data access through Firebase Security Rules
- ✅ User identity passed through authentication context

## 📈 Performance

- **Code Splitting**: Modular structure enables better tree-shaking
- **Lazy Loading**: Components can be lazy-loaded if needed
- **Memoization**: Hooks can use React.useMemo for expensive operations
- **Efficient Rendering**: Separated components reduce unnecessary re-renders

## 🔮 Future Enhancements

- [ ] Add chart generation (currently disabled/coming soon)
- [ ] Export to Excel format
- [ ] Email report delivery
- [ ] Scheduled report generation
- [ ] Custom report templates
- [ ] Multi-language support
- [ ] Print preview functionality

## 🐛 Known Issues

- Backend `getSensorHistory` method not yet implemented (uses fallback)
- Chart generation feature is placeholder (marked as "Coming Soon")
- Print preview button is disabled (not implemented)

## 📚 Dependencies

- `antd`: UI components
- `jspdf`: PDF generation
- `jspdf-autotable`: Table generation in PDFs
- `dayjs`: Date formatting
- `react`: Component framework
- `firebase`: Backend services

## 👥 Maintainers

When modifying this module:
1. Keep components focused and small
2. Add new templates for new report types
3. Extract complex logic into hooks
4. Document changes in this README
5. Update tests accordingly

---

**Last Updated**: 2025-01-04  
**Module Version**: 2.0.0 (Modularized)

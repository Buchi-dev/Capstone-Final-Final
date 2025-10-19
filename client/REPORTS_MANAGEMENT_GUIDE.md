# Reports Management System - Complete Guide

## Overview

The **Manage Reports** page provides a comprehensive PDF report generation system for water quality monitoring and device management. Built with jsPDF and jspdf-autotable, it creates professional, formatted reports with detailed data analysis.

## Features

### 1. Report Types

#### Water Quality Report
- **Executive Summary** with quality scoring (0-100%)
- **Statistical Analysis** (avg turbidity, TDS, pH)
- **Quality Assessment** with status indicators
- **Detailed Sensor Readings** table (up to 50 latest readings)
- **Recommendations** based on water quality metrics
- **Anomaly Detection** and counting

#### Device Status Report
- **Device Overview** with online/offline statistics
- **Detailed Device Table** with:
  - Device name, location, type
  - Current status (color-coded)
  - Last seen timestamp

#### Additional Report Types
- Data Summary Report (uses water quality template)
- Compliance Report (uses water quality template)
- Custom Reports (extensible for future needs)

### 2. Report Configuration

#### Form Fields
- **Report Type**: Select from 4 predefined report types
- **Report Title**: Custom title for the report
- **Device Selection**: Multi-select devices to include
- **Date Range**: Filter data by date period with quick presets (7/30/90 days)
- **Options**:
  - Include Statistics (enabled by default)
  - Include Raw Data Tables (enabled by default)
  - Include Charts (future feature)
- **Additional Notes**: Free-text notes to include in the report

### 3. PDF Features

#### Professional Formatting
- **Navy Blue Header** (#001f3f) with white text
- **Multi-page Support** with automatic page breaks
- **Page Numbering** in footer
- **Timestamp** on every page
- **Structured Sections** with clear headings

#### Data Visualization
- **Executive Summary Table** with metrics and status
- **Color-Coded Status** indicators:
  - Green (#52c41a) for GOOD/ONLINE
  - Orange (#faad14) for WARNING/CHECK
  - Gray (#808080) for OFFLINE
  - Red (#ff4d4f) for CRITICAL/ERROR

#### Quality Scoring
```typescript
Score = 100
- If Turbidity > 5 NTU: -20 points
- If Turbidity > 10 NTU: -20 points  
- If TDS > 500 ppm: -20 points
- If pH < 6.5 or > 8.5: -20 points
- If pH < 6.0 or > 9.0: -20 points

Ratings:
- 80-100: EXCELLENT
- 60-79: GOOD
- 40-59: FAIR
- 20-39: POOR
- 0-19: CRITICAL
```

### 4. Report History

#### Features
- **Recent Reports List** showing last 10 generated reports
- **Metadata Display**:
  - Report type (tag)
  - Generation timestamp
  - File name
- **Download Action** (note: browser download history)
- **LocalStorage Persistence** across sessions

### 5. Statistics Dashboard

Four key metrics displayed in cards:
1. **Total Reports Generated** - Count from history
2. **Available Devices** - Total devices in system
3. **Online Devices** - Currently active devices (green)
4. **Report Types** - Number of available report types

## Technical Implementation

### Dependencies
```json
{
  "jspdf": "^2.5.2",
  "jspdf-autotable": "^3.8.4",
  "dayjs": "^1.11.18",
  "antd": "^5.27.5"
}
```

### Key Functions

#### `calculateStatistics(readings: SensorReading[]): Statistics`
Calculates comprehensive statistics from sensor readings:
- Average turbidity, TDS, pH
- Quality score (0-100%)
- Total readings count
- Anomaly detection and counting

#### `getQualityStatus(score: number): string`
Converts numeric score to status label:
- 80+: EXCELLENT
- 60+: GOOD
- 40+: FAIR
- 20+: POOR
- <20: CRITICAL

#### `generateWaterQualityReport(config: ReportConfig)`
Main report generation function:
1. Fetches sensor data from API
2. Calculates statistics
3. Creates PDF with jsPDF
4. Adds formatted header (navy blue)
5. Generates executive summary table
6. Creates quality assessment section
7. Adds detailed sensor readings table (color-coded)
8. Includes recommendations based on metrics
9. Adds custom notes if provided
10. Generates footer with page numbers
11. Saves PDF to downloads
12. Updates report history

#### `generateDeviceStatusReport(config: ReportConfig)`
Device-focused report generation:
1. Gathers device details
2. Creates overview statistics table
3. Generates detailed device table with status colors
4. Adds professional formatting
5. Saves and tracks in history

### Data Structures

```typescript
interface ReportConfig {
  type: ReportType;
  title: string;
  deviceIds: string[];
  dateRange: [Dayjs, Dayjs] | null;
  includeCharts: boolean;
  includeRawData: boolean;
  includeStatistics: boolean;
  notes: string;
  generatedBy: string;
}

interface Statistics {
  totalReadings: number;
  averageTurbidity: number;
  averageTDS: number;
  averagePH: number;
  qualityScore: number;
  anomaliesCount: number;
}

interface ReportHistory {
  id: string;
  type: string;
  title: string;
  generatedAt: Date;
  fileName: string;
}
```

### API Integration

```typescript
// Fetch sensor history for date range
api.getSensorHistory(deviceId, startDate, endDate)

// Fetch all devices
api.getDevices()
```

## Usage Guide

### Generating a Water Quality Report

1. **Select Report Type**: Choose "Water Quality Report"
2. **Enter Title**: e.g., "Monthly Water Analysis - January 2024"
3. **Select Devices**: Choose one or more monitoring devices
4. **Set Date Range**: Use presets or custom range
5. **Configure Options**: 
   - ✅ Include Statistics (recommended)
   - ✅ Include Raw Data Tables (shows sensor readings)
   - ⬜ Include Charts (future feature)
6. **Add Notes** (optional): Additional observations or context
7. **Click "Generate PDF Report"**
8. **Download**: PDF automatically downloads to browser

### Generating a Device Status Report

1. **Select Report Type**: Choose "Device Status Report"
2. **Enter Title**: e.g., "Device Health Check - Q1 2024"
3. **Select Devices**: Choose devices to include
4. **Click "Generate PDF Report"**
5. **Download**: PDF shows device status overview

### Understanding Report Output

#### Water Quality Report Structure
```
┌─────────────────────────────────┐
│  WATER QUALITY REPORT (Header)  │
├─────────────────────────────────┤
│  Report Info (date, period)     │
│  Executive Summary (table)      │
│  Quality Assessment (text)      │
│  Sensor Readings (table)        │
│  Recommendations (bullets)      │
│  Additional Notes (if provided) │
│  Footer (page #, timestamp)     │
└─────────────────────────────────┘
```

#### Device Status Report Structure
```
┌─────────────────────────────────┐
│  DEVICE STATUS REPORT (Header)  │
├─────────────────────────────────┤
│  Report Info (date, count)      │
│  Device Overview (statistics)   │
│  Device Details (table)         │
│  Footer (page #, timestamp)     │
└─────────────────────────────────┘
```

## Best Practices

### 1. Date Range Selection
- **7 Days**: Quick weekly snapshots
- **30 Days**: Monthly comprehensive analysis
- **90 Days**: Quarterly trend analysis
- **Custom**: Specific event investigation

### 2. Device Selection
- Select **all devices** for facility-wide reports
- Select **single device** for troubleshooting specific units
- Select **multiple devices** by zone for area analysis

### 3. Report Options
- **Always include statistics** for meaningful insights
- **Include raw data** when you need detailed verification
- **Add notes** to document special circumstances or findings

### 4. Report Naming
Use descriptive titles:
- ✅ "Monthly Water Quality - January 2024"
- ✅ "Device Health Check - Building A"
- ❌ "Report 1"
- ❌ "Test"

## Advanced Features

### Color-Coded Status in PDFs

The reports use intelligent color coding:

**Sensor Readings Table**:
- **Green** (GOOD): All parameters within safe ranges
- **Orange** (CHECK): One or more parameters need attention

**Device Status Table**:
- **Green** (ONLINE): Device actively reporting
- **Gray** (OFFLINE): Device not responding
- **Red** (ERROR): Device in error state

### Automatic Recommendations

The system generates recommendations based on data:
- High turbidity → Filter inspection needed
- Elevated TDS → Treatment process review
- pH out of range → pH adjustment required
- High anomaly rate → Sensor calibration check
- All good → Continue monitoring

### Quality Score Calculation

The quality score is comprehensive:
1. Starts at 100%
2. Deductions for each issue
3. Multiple severity levels
4. Final score categorized into 5 levels

## Troubleshooting

### No Data Available
**Problem**: "No data available for the selected period"
**Solution**: 
- Check date range is correct
- Ensure devices were active during period
- Verify devices have recorded data

### Report Not Generating
**Problem**: Button loading but no PDF
**Solution**:
- Check browser console for errors
- Verify device selection is not empty
- Ensure date range is valid

### Missing Devices
**Problem**: Devices not showing in dropdown
**Solution**:
- Check device management page
- Ensure devices are properly configured
- Verify API connection

## Future Enhancements

### Planned Features
- [ ] **Charts Integration**: Visual graphs in PDFs
- [ ] **Email Reports**: Send reports via email
- [ ] **Scheduled Reports**: Auto-generate on schedule
- [ ] **Report Templates**: Custom report layouts
- [ ] **Export to Excel**: Additional format option
- [ ] **Comparative Analysis**: Compare multiple periods
- [ ] **Trend Indicators**: Show improvement/decline

### Customization Options
- [ ] Custom branding/logo
- [ ] Configurable color schemes
- [ ] Custom metric thresholds
- [ ] Multi-language support
- [ ] Report sharing/collaboration

## File Structure

```
src/pages/admin/ManageReports/
├── ManageReports.tsx    # Main component (800+ lines)
├── index.ts             # Barrel export
└── [future]
    ├── ReportTemplate.tsx
    ├── ChartGenerator.tsx
    └── types.ts
```

## Performance Considerations

- **Data Limiting**: Sensor readings limited to 50 for performance
- **Parallel Fetching**: Multiple device data fetched concurrently
- **Local Storage**: History limited to 10 recent reports
- **PDF Size**: Optimized table layouts for reasonable file sizes

## Accessibility

- Clear section headings in PDFs
- High contrast colors (navy/white, green/orange/red)
- Readable font sizes (8-24pt)
- Structured data tables
- Descriptive labels and titles

## Integration Points

### With Other Pages
- **Device Management**: Uses device data for reports
- **Sensor Readings**: Sources data from same API
- **Data Management**: Complementary data analysis
- **Admin Dashboard**: Links from main navigation

### API Endpoints
```typescript
GET /api/devices
GET /api/sensor-history/:deviceId
```

## Summary

The Reports Management system provides:
- ✅ Professional PDF generation
- ✅ Multiple report types
- ✅ Comprehensive data analysis
- ✅ Quality scoring and assessment
- ✅ Device status monitoring
- ✅ Automated recommendations
- ✅ Report history tracking
- ✅ User-friendly interface
- ✅ Navy blue branding
- ✅ Color-coded indicators
- ✅ Multi-page support
- ✅ Flexible configuration

Perfect for water quality monitoring, compliance reporting, and device management!

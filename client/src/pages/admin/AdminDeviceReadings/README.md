# Admin Device Readings Monitor

A comprehensive real-time water quality monitoring dashboard for administrators.

## Features

### 🎯 **Smart Severity-Based Sorting**
- Devices are **automatically sorted** by severity level
- Critical devices appear first for immediate attention
- Real-time re-sorting as conditions change

### 📊 **Severity Levels**
1. **Critical** (Red) - Immediate action required
   - Active critical alerts
   - Parameters far outside acceptable range
   
2. **Warning** (Orange) - Monitor closely
   - Active warning alerts
   - Parameters approaching thresholds
   
3. **Normal** (Green) - All systems operational
   - All parameters within acceptable range
   
4. **Offline** (Gray) - No recent data
   - Device disconnected or not reporting

### 📈 **Real-Time Monitoring**
- Live sensor data updates via Firebase RTDB
- Real-time alert monitoring
- Auto-refresh with manual refresh option
- Last update timestamp

### 🎨 **Rich Visualizations**
- **pH Level** - Optimal range: 6.5 - 8.5
- **TDS (Total Dissolved Solids)** - Optimal: < 300 ppm
- **Turbidity** - Optimal: < 1 NTU
- Progress bars with color-coded status
- Quality indicators (Excellent, Good, Fair, Poor)

### 🔍 **Advanced Filtering**
- Filter by severity level
- Filter by device status
- Search by device name, ID, or location
- Real-time filter application

### 📱 **Desktop-Optimized Design**
- Responsive grid layout
- Card-based device presentation
- Alert ribbons for critical devices
- Color-coded borders for quick identification

### 📍 **Location Tracking**
- Building and floor information
- Easy identification of problem areas

### 🚨 **Alert Integration**
- Shows active alerts per device
- Alert severity badges
- Recommended actions
- Alert count in ribbon

## Components

### Main Page
- `AdminDeviceReadings.tsx` - Main page component

### Hooks
- `useDeviceReadings.ts` - Real-time data management and severity calculation

### Components
- `StatsOverview.tsx` - Summary statistics cards
- `DeviceCard.tsx` - Individual device monitoring card
- `RefreshControl.tsx` - Manual refresh control
- `FilterControls.tsx` - Search and filter controls

## Severity Scoring Algorithm

The severity score is calculated based on:

1. **Device Status**
   - Offline: 0 points (lowest priority)
   - Online: 100 base points

2. **Active Alerts**
   - Critical alerts: +1000 points each
   - Warning alerts: +500 points each
   - Advisory alerts: +100 points each

3. **Parameter Deviation**
   - pH deviation from 7.0: +50 points per unit
   - TDS over 500 ppm: +0.5 points per ppm
   - Turbidity over 5 NTU: +20 points per NTU

Devices are sorted in descending order by total score (highest severity first).

## Usage

Navigate to the Admin Device Readings page to:
1. View all devices sorted by severity
2. Monitor real-time water quality parameters
3. Identify critical issues instantly
4. Filter and search for specific devices
5. Track alert status and recommended actions

## Technology Stack

- **React** with TypeScript
- **Ant Design** for UI components
- **Firebase Realtime Database** for sensor data
- **Firestore** for device metadata and alerts
- **Real-time subscriptions** for live updates

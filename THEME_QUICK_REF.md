/**
 * THEME QUICK REFERENCE
 * Copy-paste snippets for consistent theme usage
 */

// ==========================================
// 1. IMPORT THEME HOOK
// ==========================================
import { useThemeToken } from '../theme';  // Adjust path as needed

// ==========================================
// 2. USE IN COMPONENT
// ==========================================
const MyComponent = () => {
  const token = useThemeToken();
  
  return (
    // ... your JSX
  );
};

// ==========================================
// 3. COMMON PATTERNS
// ==========================================

// Statistic with theme color
<Statistic
  title="Success Count"
  value={100}
  valueStyle={{ color: token.colorSuccess }}
/>

// Icons with theme color
<CheckCircleOutlined style={{ color: token.colorSuccess }} />
<WarningOutlined style={{ color: token.colorWarning }} />
<CloseCircleOutlined style={{ color: token.colorError }} />
<InfoCircleOutlined style={{ color: token.colorInfo }} />

// Tags (preferred - automatic theme support)
<Tag color="success">Active</Tag>
<Tag color="warning">Pending</Tag>
<Tag color="error">Failed</Tag>
<Tag color="processing">In Progress</Tag>

// Custom text colors
<Text style={{ color: token.colorError }}>Error message</Text>
<Text style={{ color: token.colorSuccess }}>Success message</Text>
<Text type="secondary">Secondary text</Text>

// Arrow indicators
<ArrowUpOutlined style={{ color: token.colorSuccess }} />
<ArrowDownOutlined style={{ color: token.colorError }} />

// Progress bars
<Progress
  percent={75}
  strokeColor={token.colorSuccess}
  trailColor={token.colorBgContainer}
/>

// ==========================================
// 4. COMMON TOKEN REFERENCE
// ==========================================
token.colorPrimary      // #001f3f - Navy blue (brand)
token.colorSuccess      // #52c41a - Green (success/online)
token.colorWarning      // #faad14 - Orange (warning/pending)
token.colorError        // #ff4d4f - Red (error/offline)
token.colorInfo         // #1890ff - Blue (info/processing)
token.colorBorder       // #d9d9d9 - Light gray (borders)
token.colorTextSecondary // rgba(0,0,0,0.65) - Secondary text
token.borderRadius      // 6px - Standard border radius
token.borderRadiusLG    // 8px - Large border radius

// ==========================================
// 5. SEARCH & REPLACE PATTERNS
// ==========================================

// Find all hardcoded colors:
// Search regex: #[0-9a-fA-F]{6}

// Replace patterns:
#52c41a  →  token.colorSuccess
#faad14  →  token.colorWarning
#ff4d4f  →  token.colorError
#1890ff  →  token.colorInfo
#001f3f  →  token.colorPrimary
#d9d9d9  →  token.colorBorder
#8c8c8c  →  token.colorTextSecondary

// ==========================================
// 6. STATUS INDICATOR COMPONENT (if needed)
// ==========================================
import { StatusIcon, useStatusColor } from '../components/StatusIndicator';

// Use StatusIcon component
<StatusIcon status="good" />
<StatusIcon status="warning" />
<StatusIcon status="critical" />

// Or use the color hook
const colors = useStatusColor();
<div style={{ color: colors.good }}>✓ All systems operational</div>

# Ant Design Theme Configuration Guide

This project uses Ant Design v5 with a customizable theme system.

## 📁 Theme Structure

```
src/theme/
├── themeConfig.ts      # Theme configuration with design tokens
├── ThemeProvider.tsx   # Theme provider component
└── index.ts           # Exports
```

## 🎨 Customizing the Theme

### 1. Basic Theme Customization

Edit `src/theme/themeConfig.ts` to customize design tokens:

```typescript
export const themeConfig: ThemeConfig = {
  token: {
    // Primary brand color
    colorPrimary: '#1890ff',    // Change this to your brand color
    
    // Border radius
    borderRadius: 8,            // Adjust roundness of corners
    
    // Font settings
    fontSize: 14,               // Base font size
    
    // Colors
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    
    // ... more tokens
  },
};
```

### 2. Component-Specific Customization

Customize individual components:

```typescript
components: {
  Button: {
    controlHeight: 36,
    borderRadius: 8,
    fontWeight: 500,
  },
  Input: {
    controlHeight: 36,
    borderRadius: 8,
  },
  Card: {
    borderRadiusLG: 12,
    paddingLG: 24,
  },
}
```

### 3. Theme Modes

Switch between theme modes in `src/main.tsx`:

```typescript
// Light mode (default)
<ThemeProvider themeMode="light">
  <App />
</ThemeProvider>

// Dark mode
<ThemeProvider themeMode="dark">
  <App />
</ThemeProvider>

// Compact mode (smaller components)
<ThemeProvider themeMode="compact">
  <App />
</ThemeProvider>
```

## 🎯 Common Customizations

### Change Primary Color

```typescript
token: {
  colorPrimary: '#6366f1',  // Indigo
}
```

### Increase Border Radius (More Rounded)

```typescript
token: {
  borderRadius: 12,
}
components: {
  Card: {
    borderRadiusLG: 16,
  },
}
```

### Adjust Component Sizes

```typescript
token: {
  controlHeight: 40,  // Larger inputs/buttons
  fontSize: 16,       // Larger text
}
```

### Custom Font Family

```typescript
token: {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
}
```

## 🌓 Dynamic Theme Switching

To implement theme switching in your app:

```typescript
import { useState } from 'react';
import { ThemeProvider } from './theme';

function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  return (
    <ThemeProvider themeMode={themeMode}>
      <Button onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </Button>
      {/* Your app content */}
    </ThemeProvider>
  );
}
```

## 📖 Design Tokens Reference

### Color Tokens
- `colorPrimary` - Primary brand color
- `colorSuccess` - Success state color
- `colorWarning` - Warning state color
- `colorError` - Error state color
- `colorInfo` - Info state color
- `colorLink` - Link color

### Background Tokens
- `colorBgContainer` - Container background
- `colorBgLayout` - Layout background
- `colorBgElevated` - Elevated component background

### Text Tokens
- `colorTextBase` - Base text color
- `colorTextSecondary` - Secondary text
- `colorTextTertiary` - Tertiary text
- `colorTextQuaternary` - Quaternary text

### Border Tokens
- `colorBorder` - Default border color
- `colorBorderSecondary` - Secondary border color
- `borderRadius` - Base border radius

### Size Tokens
- `fontSize` - Base font size
- `controlHeight` - Control component height
- `sizeStep` - Size step for spacing
- `sizeUnit` - Base size unit

## 🔗 Resources

- [Ant Design Theme Editor](https://ant.design/theme-editor)
- [Design Tokens Documentation](https://ant.design/docs/react/customize-theme#seedtoken)
- [Component Token List](https://ant.design/docs/react/customize-theme#component-tokens)
- [Theme Algorithm](https://ant.design/docs/react/customize-theme#theme-algorithm)

## 💡 Tips

1. **Use the Theme Editor**: Ant Design provides an online theme editor to preview changes
2. **Access Theme Tokens in Components**: Use `theme.useToken()` hook to access theme values
3. **Keep Consistency**: Use theme tokens instead of hardcoded colors
4. **Test Both Modes**: Always test your UI in both light and dark modes

## 🎨 Using Theme Tokens in Your Components

```typescript
import { theme } from 'antd';

function MyComponent() {
  const { token } = theme.useToken();
  
  return (
    <div style={{
      backgroundColor: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      padding: token.padding,
      color: token.colorTextBase,
    }}>
      Content
    </div>
  );
}
```

## 🚀 Next Steps

1. Customize `colorPrimary` to match your brand
2. Adjust `borderRadius` for your preferred design style
3. Configure component-specific tokens for consistent UI
4. Test the theme in both light and dark modes
5. Use the `theme.useToken()` hook in your custom components

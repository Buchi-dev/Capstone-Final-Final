# Email Templates

This directory contains HTML email templates used by the email service.

## Template Structure

All templates use a simple placeholder syntax: `{{variableName}}`

## Available Templates

### 1. `weekly-report.html`
**Purpose:** Weekly water quality and device status reports sent every Monday

**Placeholders:**
- `{{userName}}` - User's name or email
- `{{waterQualitySection}}` - Generated HTML for water quality metrics
- `{{deviceStatusSection}}` - Generated HTML for device status metrics
- `{{appUrl}}` - Client application URL
- `{{currentYear}}` - Current year for copyright

**Usage:**
```javascript
const template = loadTemplate('weekly-report');
const html = renderTemplate(template, {
  userName: 'John Doe',
  waterQualitySection: '<div>...</div>',
  deviceStatusSection: '<div>...</div>',
  appUrl: 'http://localhost:5173',
  currentYear: '2025'
});
```

---

### 2. `alert-email.html`
**Purpose:** Real-time alert notifications for critical water quality issues

**Placeholders:**
- `{{alertEmoji}}` - Emoji based on severity (🚨, ⚠️, ℹ️)
- `{{alertSeverity}}` - Alert severity (Critical, Warning, Advisory)
- `{{alertSeverityClass}}` - CSS class name (critical, warning, advisory)
- `{{alertMessage}}` - Alert message text
- `{{deviceId}}` - Device identifier
- `{{parameter}}` - Parameter that triggered the alert (pH, turbidity, etc.)
- `{{value}}` - Parameter value
- `{{timestamp}}` - Alert timestamp
- `{{appUrl}}` - Client application URL

**Usage:**
```javascript
const template = loadTemplate('alert-email');
const html = renderTemplate(template, {
  alertEmoji: '🚨',
  alertSeverity: 'Critical',
  alertSeverityClass: 'critical',
  alertMessage: 'pH level out of safe range',
  deviceId: 'WQ-001',
  parameter: 'pH',
  value: '9.2',
  timestamp: '11/20/2025, 3:45 PM',
  appUrl: 'http://localhost:5173'
});
```

---

### 3. `test-email.html`
**Purpose:** SMTP configuration test email

**Placeholders:** None (static content)

**Usage:**
```javascript
const template = loadTemplate('test-email');
const html = renderTemplate(template, {});
```

---

## Styling Guidelines

All templates follow these design principles:

- **Max Width:** 600px (optimal for email clients)
- **Inline CSS:** All styles are inline for maximum compatibility
- **Color Palette:**
  - Primary Blue: `#1890ff`
  - Success Green: `#52c41a`
  - Warning Yellow: `#faad14`
  - Critical Red: `#ff4d4f`
  - Text Gray: `#333`
  - Light Gray: `#666`, `#999`

- **Responsive Design:** Works on desktop and mobile
- **Fallback Support:** Plain text versions always provided

---

## Template Caching

Templates are loaded once and cached in memory for performance:

```javascript
const templates = {
  weeklyReport: null,
  alert: null,
  test: null,
};
```

To clear cache (for development), restart the server.

---

## Adding New Templates

1. **Create HTML file** in `templates/` directory
2. **Use placeholders** with `{{variableName}}` syntax
3. **Add to cache** in `email.service.js`:
   ```javascript
   const templates = {
     weeklyReport: null,
     alert: null,
     test: null,
     myNewTemplate: null, // Add here
   };
   ```
4. **Create function** to use the template:
   ```javascript
   function sendMyNewEmail(user, data) {
     const template = loadTemplate('my-new-template');
     const html = renderTemplate(template, {
       placeholder1: data.value1,
       placeholder2: data.value2,
     });
     // ... send email
   }
   ```

---

## Template Testing

Test templates locally:

```bash
# Test SMTP and template rendering
node test-email.js your-email@example.com
```

---

## Email Client Compatibility

Templates tested with:
- ✅ Gmail (Web, Android, iOS)
- ✅ Outlook (Web, Desktop)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail

**Note:** Some email clients block external images and JavaScript. All templates use inline CSS and static content for maximum compatibility.

---

## Troubleshooting

### Template Not Found Error
```
Error: Email template 'template-name' not found
```
**Solution:** Check that the HTML file exists in `server/src/utils/templates/` and the filename matches (case-sensitive).

### Placeholder Not Replaced
```
{{variableName}} appears in sent email
```
**Solution:** Ensure the placeholder name in the template matches exactly with the key in `renderTemplate()` data object.

### Styling Not Applied
**Solution:** Use inline styles only. External CSS and `<style>` tags may be stripped by email clients.

---

## Best Practices

1. **Keep templates simple** - Complex layouts may break in some email clients
2. **Use inline styles** - Never use external CSS files
3. **Test with plain text** - Always provide a text version as fallback
4. **Optimize images** - If using images, host externally and use absolute URLs
5. **Keep file size small** - Target < 100KB HTML for fast loading
6. **Use alt text** - For accessibility and when images don't load
7. **Test on mobile** - Majority of users read emails on mobile devices

---

## Template Versioning

Track template changes in the codebase. Major changes should trigger testing across all email clients.

**Current Version:** 1.0.0  
**Last Updated:** November 20, 2025

---

## Resources

- [Email on Acid](https://www.emailonacid.com/) - Email template testing
- [Litmus](https://www.litmus.com/) - Cross-client email testing
- [Can I Email](https://www.caniemail.com/) - CSS compatibility checker for emails
- [Really Good Emails](https://reallygoodemails.com/) - Email design inspiration

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Email Service
 * Handles sending emails using nodemailer with external HTML templates
 */

/**
 * Load and cache HTML templates
 */
const templates = {
  alert: null,
  test: null,
};

/**
 * Load HTML template from file
 * @param {string} templateName - Name of the template file (without .html)
 * @returns {string} - HTML template content
 */
function loadTemplate(templateName) {
  if (templates[templateName]) {
    return templates[templateName];
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
  
  try {
    templates[templateName] = fs.readFileSync(templatePath, 'utf-8');
    return templates[templateName];
  } catch (error) {
    logger.error('[Email Service] Error loading template', {
      templateName,
      error: error.message,
    });
    throw new Error(`Email template '${templateName}' not found`);
  }
}

/**
 * Replace template placeholders with actual values
 * @param {string} template - HTML template string
 * @param {Object} data - Key-value pairs for replacement
 * @returns {string} - Processed HTML
 */
function renderTemplate(template, data) {
  let rendered = template;
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(placeholder, value || '');
  }
  
  return rendered;
}

/**
 * Create nodemailer transporter
 * Uses Gmail SMTP or configured SMTP settings
 */
const createTransporter = () => {
  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('[Email Service] SMTP not configured. Email notifications disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send alert notification email to a user using external template
 * @param {Object} user - User document with email and name
 * @param {Object} alert - Alert document
 * @returns {Promise<boolean>} - Success status
 */
async function sendAlertEmail(user, alert) {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  try {
    const severityEmoji = {
      Critical: '[CRITICAL]',
      Warning: '[WARNING]',
      Advisory: '[INFO]',
    };

    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Load and render template
    const template = loadTemplate('alert-email');
    const emailHtml = renderTemplate(template, {
      alertEmoji: severityEmoji[alert.severity],
      alertSeverity: alert.severity,
      alertSeverityClass: alert.severity.toLowerCase(),
      alertMessage: alert.message,
      deviceId: alert.deviceId,
      parameter: alert.parameter,
      value: alert.value,
      timestamp: alert.timestamp.toLocaleString(),
      appUrl,
    });

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Water Quality Monitor'}" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: `${severityEmoji[alert.severity]} ${alert.severity} Alert: ${alert.message}`,
      text: `
${alert.severity} Alert
==================
Device: ${alert.deviceId}
Parameter: ${alert.parameter}
Value: ${alert.value}
Message: ${alert.message}
Time: ${alert.timestamp.toLocaleString()}

View alert details: ${appUrl}/admin/alerts
      `,
      html: emailHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('[Email Service] Alert email sent successfully', {
      recipientEmail: user.email,
      messageId: info.messageId,
      alertSeverity: alert.severity,
    });
    return true;
  } catch (error) {
    logger.error('[Email Service] Error sending alert email', {
      recipientEmail: user.email,
      error: error.message,
    });
    return false;
  }
}

/**
 * Test email configuration using external template
 * Sends a test email to verify SMTP settings
 */
async function testEmailConfiguration(recipientEmail) {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('SMTP not configured');
  }

  try {
    await transporter.verify();
    logger.info('[Email Service] SMTP connection verified successfully');

    if (recipientEmail) {
      // Load and render template
      const template = loadTemplate('test-email');
      const emailHtml = renderTemplate(template, {});

      const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'Water Quality Monitor'}" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: 'Test Email - Water Quality Monitor',
        text: 'This is a test email from your Water Quality Monitoring System. If you received this, your email configuration is working correctly!',
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('[Email Service] Test email sent successfully', {
        recipientEmail,
        messageId: info.messageId,
      });
    }

    return true;
  } catch (error) {
    logger.error('[Email Service] Email configuration test failed', {
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  sendAlertEmail,
  testEmailConfiguration,
};

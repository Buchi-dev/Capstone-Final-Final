/**
 * Email Service Test Script
 * Run this to verify email configuration works
 * 
 * Usage: node test-email.js your-email@example.com
 */

require('dotenv').config();
const { testEmailConfiguration, sendWeeklyReportEmail } = require('./src/utils/email.service');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node test-email.js your-email@example.com');
  process.exit(1);
}

console.log('📧 Testing email configuration...\n');

// Test SMTP configuration
testEmailConfiguration(testEmail)
  .then(() => {
    console.log('\n✅ Email test successful!');
    console.log(`Check ${testEmail} for the test email.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Email test failed!');
    console.error('Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check that SMTP_* variables are set in .env file');
    console.log('2. For Gmail, use an App Password (not your regular password)');
    console.log('3. Verify SMTP_HOST and SMTP_PORT are correct');
    console.log('4. Check firewall allows outbound connections on port 587/465');
    process.exit(1);
  });

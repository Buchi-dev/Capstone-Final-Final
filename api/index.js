// Vercel serverless function handler
const path = require('path');

// Set VERCEL environment variable
process.env.VERCEL = '1';

// Set up module aliases for production
require('module-alias/register');
require('module-alias').addAliases({
  '@core': path.join(__dirname, '..', 'server', 'dist', 'core'),
  '@feature': path.join(__dirname, '..', 'server', 'dist', 'feature'),
  '@utils': path.join(__dirname, '..', 'server', 'dist', 'utils'),
  '@types': path.join(__dirname, '..', 'server', 'dist', 'types'),
});

// Load the Express app
let app;
try {
  const appModule = require('../server/dist/index.js');
  app = appModule.default || appModule;
  console.log('✅ Express app loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Express app:', error);
  console.error('Error stack:', error.stack);
  throw error;
}

// Export handler for Vercel
module.exports = app;

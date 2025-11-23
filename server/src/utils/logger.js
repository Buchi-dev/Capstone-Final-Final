const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports
 */

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (correlationId) {
      msg += ` | CorrelationID: ${correlationId}`;
    }
    
    if (Object.keys(meta).length > 0) {
      msg += ` | ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// Create transports array
const transports = [];

// Determine appropriate log level based on environment
const getLogLevel = () => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  // Default to 'warn' in production for less noise, 'info' in development
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info';
};

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: getLogLevel(),
  })
);

// File transports (disabled in test environment)
if (process.env.NODE_ENV !== 'test') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  format: logFormat,
  transports,
  exitOnError: false,
});

// Helper to check if we should log based on verbosity settings
const shouldLog = (level = 'info') => {
  const verboseMode = process.env.VERBOSE_LOGGING === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In production, only log warnings and errors unless verbose mode is on
  if (isProduction && !verboseMode && level === 'info') {
    return false;
  }
  
  return true;
};

// Add request logging helper with smart filtering
logger.logRequest = (req, level = 'info', message = 'Request processed') => {
  // Skip OPTIONS requests (CORS preflight) unless in verbose mode
  if (req.method === 'OPTIONS' && process.env.VERBOSE_LOGGING !== 'true') {
    return;
  }
  
  // Skip 304 (Not Modified) responses unless in verbose mode
  if (req.statusCode === 304 && process.env.VERBOSE_LOGGING !== 'true') {
    return;
  }
  
  if (shouldLog(level)) {
    logger[level](message, {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userId: req.user?._id,
      userRole: req.user?.role,
    });
  }
};

// Add error logging helper
logger.logError = (error, context = {}) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Add conditional info logger
logger.infoVerbose = (message, meta) => {
  if (shouldLog('info')) {
    logger.info(message, meta);
  }
};

// Make logger globally available
global.logger = logger;
global.shouldLog = shouldLog;

module.exports = logger;

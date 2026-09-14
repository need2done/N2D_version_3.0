const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_BACKUPS = 10;

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const backendLogPath = path.join(LOG_DIR, 'backend.log');
const errorLogPath = path.join(LOG_DIR, 'error.log');

/**
 * Rotates log files if current size exceeds MAX_FILE_SIZE.
 */

function rotateLogFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stats = fs.statSync(filePath);
    if (stats.size < MAX_FILE_SIZE) return;

    for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
      const src = `${filePath}.${i}`;
      const dest = `${filePath}.${i + 1}`;
      if (fs.existsSync(src)) {
        if (i + 1 > MAX_BACKUPS) {
          fs.unlinkSync(src);
        } else {
          fs.renameSync(src, dest);
        }
      }
    }

    const firstBackup = `${filePath}.1`;
    fs.renameSync(filePath, firstBackup);
  } catch (err) {
    console.error(`[LOGGER_ROTATION_ERROR] Failed to rotate ${filePath}:`, err.message);
  }
}

/**
 * Appends a formatted log entry to specified file with rotation.
 */
function appendToFile(filePath, logMessage) {
  try {
    rotateLogFile(filePath);
    fs.appendFileSync(filePath, logMessage + '\n', 'utf8');
  } catch (err) {
    // Fail-safe print to stderr if file append fails
    process.stderr.write(`[LOG_WRITE_ERROR] ${err.message}\n`);
  }
}

/**
 * Format timestamp ISO string in local readable format.
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Logger utility object.
 */
const logger = {
  info: (msg) => {
    const formatted = `[${getTimestamp()}] [INFO] ${msg}`;
    console.log(formatted);
    appendToFile(backendLogPath, formatted);
  },
  warn: (msg) => {
    const formatted = `[${getTimestamp()}] [WARN] ${msg}`;
    console.warn(formatted);
    appendToFile(backendLogPath, formatted);
  },
  error: (msg, err) => {
    const errDetails = err ? ` ${err.stack || err.message || err}` : '';
    const formatted = `[${getTimestamp()}] [ERROR] ${msg}${errDetails}`;
    console.error(formatted);
    appendToFile(backendLogPath, formatted);
    appendToFile(errorLogPath, formatted);
  }
};

/**
 * Express Request Logger Middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusSymbol = statusCode >= 500 ? '💥' : statusCode >= 400 ? '⚠️' : '✅';
    const logLine = `[${getTimestamp()}] ${statusSymbol} ${req.method} ${req.originalUrl || req.url} ${statusCode} - ${duration}ms - IP: ${ip}`;
    
    appendToFile(backendLogPath, logLine);
    if (statusCode >= 400) {
      appendToFile(errorLogPath, logLine);
    }
  });

  next();
}

// Redirect raw console.log / console.error to log files while preserving stdout
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function (...args) {
  originalConsoleLog.apply(console, args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  appendToFile(backendLogPath, `[${getTimestamp()}] [STDOUT] ${message}`);
};

console.error = function (...args) {
  originalConsoleError.apply(console, args);
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
  const formatted = `[${getTimestamp()}] [STDERR] ${message}`;
  appendToFile(backendLogPath, formatted);
  appendToFile(errorLogPath, formatted);
};

module.exports = {
  logger,
  requestLogger,
  backendLogPath,
  errorLogPath
};

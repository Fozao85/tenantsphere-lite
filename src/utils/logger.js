const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  writeToFile(level, formattedMessage) {
    const logFile = path.join(logsDir, `${level}.log`);
    const allLogsFile = path.join(logsDir, 'all.log');
    
    fs.appendFileSync(logFile, formattedMessage + '\n');
    fs.appendFileSync(allLogsFile, formattedMessage + '\n');
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[35m'  // Magenta
    };
    
    const resetColor = '\x1b[0m';
    const coloredMessage = `${colors[level] || ''}${formattedMessage}${resetColor}`;
    
    console.log(coloredMessage);

    // Write to file in production
    if (process.env.NODE_ENV === 'production') {
      this.writeToFile(level, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }
}

const logger = new Logger();

module.exports = { logger };

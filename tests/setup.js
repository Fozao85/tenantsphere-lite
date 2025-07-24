// Test environment setup
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock environment variables for testing
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test-verify-token';
process.env.APP_BASE_URL = 'http://localhost:3001';

// Suppress console output during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  // Only log if it's an error or if we're in verbose mode
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleLog(...args);
  }
};

console.info = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleInfo(...args);
  }
};

console.warn = (...args) => {
  if (process.env.JEST_VERBOSE === 'true') {
    originalConsoleWarn(...args);
  }
};

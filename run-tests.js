#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// Load test environment
require('dotenv').config({ path: '.env.test' });

console.log('🧪 TenantSphere Test Suite');
console.log('==========================\n');

// Check if all required files exist
const requiredFiles = [
  'src/server.js',
  'src/services/MessageHandlerService.js',
  'src/services/WhatsAppService.js',
  'src/services/UserService.js',
  'src/services/PropertyService.js',
  'src/config/firebase-service-account.json'
];

console.log('📋 Checking required files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log(`\n🚨 Missing ${missingFiles.length} required files. Please ensure all files are present before testing.`);
  process.exit(1);
}

console.log('\n📦 Checking dependencies...');

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('❌ node_modules not found. Please run: npm install');
  process.exit(1);
}

// Check key dependencies
const keyDependencies = ['express', 'firebase-admin', 'axios', 'dotenv'];
let missingDeps = [];

keyDependencies.forEach(dep => {
  try {
    require.resolve(dep);
    console.log(`  ✅ ${dep}`);
  } catch (error) {
    console.log(`  ❌ ${dep} - MISSING`);
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log(`\n🚨 Missing ${missingDeps.length} dependencies. Please run: npm install`);
  process.exit(1);
}

console.log('\n🚀 Starting comprehensive functionality tests...\n');

// Import and run the test runner
try {
  const TenantSphereTestRunner = require('./test-runner');
  const testRunner = new TenantSphereTestRunner();
  
  testRunner.runAllTests().then(() => {
    console.log('\n✅ Test suite completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Failed to start test runner:', error.message);
  console.log('\nTroubleshooting tips:');
  console.log('1. Ensure all dependencies are installed: npm install');
  console.log('2. Check that src/server.js exists and is properly configured');
  console.log('3. Verify Firebase configuration is correct');
  console.log('4. Make sure port 3001 is available for testing');
  process.exit(1);
}
